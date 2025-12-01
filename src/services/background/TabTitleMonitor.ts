// src/services/background/TabTitleMonitor.ts
// Tab Title 监听服务 - 监听标签页标题变化并自动更新页面标题

import { GameplayStore } from '@/services/gameplayStore';
import { syncService } from '@/services/syncService';
import { triggerBackgroundSync } from '@/shared/rpc-protocol/server';
import { isTitleUrl, isTitleTriviallyDifferent } from '@/shared/utils/titleUtils';
import { logger } from '@/infra/logger';

const log = logger('TabTitleMonitor');

/**
 * TabTitleMonitor - 标签页标题监听服务
 * 
 * 职责：
 * 1. 监听 chrome.tabs.onUpdated 事件中的 title 变化
 * 2. 当检测到 title 从 URL 变为非 URL 时，自动更新对应页面的标题
 * 3. 防止重复更新（如果页面标题已经是正确的，不更新）
 * 
 * 设计模式：单例模式
 */
class TabTitleMonitor {
  private static instance: TabTitleMonitor | null = null;
  private isListening = false;
  private gameplayStore: GameplayStore;
  private updatePageTitleCallback: (pageId: string, title: string, isManualEdit?: boolean) => Promise<void>;
  // 防抖机制：避免频繁更新同一页面
  private lastUpdateTime: Map<string, number> = new Map();
  private readonly UPDATE_DEBOUNCE_MS = 5000; // 从2秒增加到5秒
  // 避免相同或相似标题的重复更新
  private lastUpdatedTitle: Map<string, string> = new Map();
  // 稳定期机制：跟踪每个页面的Title变化历史
  private titleStabilityTrackers: Map<string, {
    currentTitle: string;
    stableSince: number; // Title稳定的起始时间
    changeCount: number; // 变化次数（用于自适应防抖）
    lastChangeTime: number; // 最后一次变化时间
  }> = new Map();
  private readonly STABILITY_PERIOD_MS = 5000; // 稳定期：5秒
  // 首次Title跟踪：记录哪些页面已有非URL样式的Title
  private hasInitialTitle: Set<string> = new Set();
  // LRU 缓存配置
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 小时
  private cleanupTimer: number | null = null;
  // 稳定期检查定时器
  private stabilityCheckTimer: number | null = null;

  private constructor() {
    this.gameplayStore = GameplayStore.getInstance();
    // updatePageTitleCallback 将在 start 方法中设置
    this.updatePageTitleCallback = async () => {};
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TabTitleMonitor {
    if (!TabTitleMonitor.instance) {
      TabTitleMonitor.instance = new TabTitleMonitor();
    }
    return TabTitleMonitor.instance;
  }

  /**
   * 启动监听器
   * @param updatePageTitleCallback - 更新页面标题的回调函数
   */
  start(updatePageTitleCallback: (pageId: string, title: string, isManualEdit?: boolean) => Promise<void>): void {
    if (this.isListening) {
      log.debug('监听器已在运行');
      return;
    }

    this.updatePageTitleCallback = updatePageTitleCallback;

    try {
      chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
      chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
      this.isListening = true;
      this.startCleanupTimer();
      this.startStabilityCheckTimer();
      log.info('监听器已启动');
    } catch (error) {
      log.error('启动监听器失败', { error });
    }
  }

  /**
   * 停止监听器
   */
  stop(): void {
    if (!this.isListening) {
      return;
    }

    try {
      chrome.tabs.onUpdated.removeListener(this.handleTabUpdate.bind(this));
      chrome.tabs.onRemoved.removeListener(this.handleTabRemoved.bind(this));
      this.isListening = false;
      this.stopCleanupTimer();
      this.stopStabilityCheckTimer();
      this.lastUpdateTime.clear();
      this.lastUpdatedTitle.clear();
      this.titleStabilityTrackers.clear();
      this.hasInitialTitle.clear();
      log.info('监听器已停止');
    } catch (error) {
      log.error('停止监听器失败', { error });
    }
  }

  /**
   * 处理标签页关闭事件，清理相关缓存
   */
  private handleTabRemoved(_tabId: number): void {
    // 清理该标签页相关的缓存（通过 URL 查找对应的 pageId）
    // 由于我们无法直接从 tabId 获取 pageId，这里只清理过期的缓存
    this.cleanupExpiredEntries();
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer !== null) {
      return;
    }
    // Service Worker 环境中直接使用 setInterval（不需要 window）
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CACHE_CLEANUP_INTERVAL_MS) as unknown as number;
  }

  /**
   * 停止定期清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 启动稳定期检查定时器
   * 定期检查哪些页面的Title已经稳定，可以执行更新
   */
  private startStabilityCheckTimer(): void {
    if (this.stabilityCheckTimer !== null) {
      return;
    }
    // 每1秒检查一次稳定期
    this.stabilityCheckTimer = setInterval(() => {
      this.checkStableTitles();
    }, 1000) as unknown as number;
  }

  /**
   * 停止稳定期检查定时器
   */
  private stopStabilityCheckTimer(): void {
    if (this.stabilityCheckTimer !== null) {
      clearInterval(this.stabilityCheckTimer);
      this.stabilityCheckTimer = null;
    }
  }

  /**
   * 检查哪些页面的Title已经稳定，可以执行更新
   */
  private async checkStableTitles(): Promise<void> {
    const now = Date.now();
    const pagesToUpdate: Array<{ pageId: string; title: string }> = [];

    for (const [pageId, tracker] of this.titleStabilityTrackers.entries()) {
      const stableDuration = now - tracker.stableSince;
      
      // 如果Title已经稳定超过稳定期，可以执行更新
      if (stableDuration >= this.STABILITY_PERIOD_MS) {
        pagesToUpdate.push({ pageId, title: tracker.currentTitle });
        // 移除跟踪器（更新后会重新创建）
        this.titleStabilityTrackers.delete(pageId);
      }
    }

    // 批量执行更新
    for (const { pageId, title } of pagesToUpdate) {
      try {
        await this.executeTitleUpdate(pageId, title);
      } catch (error) {
        log.error('执行稳定Title更新失败', { pageId, error });
      }
    }
  }

  /**
   * 清理过期条目和超出大小限制的条目
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const EXPIRY_TIME_MS = 24 * 60 * 60 * 1000; // 24 小时

    // 清理过期的 lastUpdateTime 条目
    for (const [pageId, timestamp] of this.lastUpdateTime.entries()) {
      if (now - timestamp > EXPIRY_TIME_MS) {
        this.lastUpdateTime.delete(pageId);
        this.lastUpdatedTitle.delete(pageId);
        this.titleStabilityTrackers.delete(pageId);
        this.hasInitialTitle.delete(pageId);
      }
    }

    // 清理过期的稳定期跟踪器
    for (const [pageId, tracker] of this.titleStabilityTrackers.entries()) {
      if (now - tracker.lastChangeTime > EXPIRY_TIME_MS) {
        this.titleStabilityTrackers.delete(pageId);
      }
    }

    // 如果超出大小限制，使用 LRU 策略清理最旧的条目
    this.enforceMaxSize(this.lastUpdateTime, this.MAX_CACHE_SIZE);
    this.enforceMaxSize(this.lastUpdatedTitle, this.MAX_CACHE_SIZE);
    this.enforceMaxSize(this.titleStabilityTrackers, this.MAX_CACHE_SIZE);
  }

  /**
   * 强制执行 Map 的最大大小限制（LRU 策略）
   */
  private enforceMaxSize<K, V>(map: Map<K, V>, maxSize: number): void {
    if (map.size <= maxSize) {
      return;
    }
    
    // 删除最旧的条目（Map 保持插入顺序）
    const entries = Array.from(map.entries());
    const toDelete = entries.slice(0, map.size - maxSize);
    toDelete.forEach(([key]) => map.delete(key));
  }



  /**
   * 处理标签页更新事件
   */
  private async handleTabUpdate(
    _tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): Promise<void> {
    // 只处理 title 变化的情况
    if (!changeInfo.title) {
      return;
    }

    // 只处理有效的 URL（排除 about: 等特殊页面）
    if (!tab.url || tab.url.startsWith('about:')) {
      return;
    }

    const newTitle = changeInfo.title;
    const url = tab.url;

    // 检查新 title 是否是 URL 样式
    if (isTitleUrl(newTitle, url)) {
      // 如果新 title 仍然是 URL，不处理（等待后续更新）
      return;
    }

    // 新 title 不是 URL 样式，尝试更新页面标题
    try {
      // 根据 URL 查找对应的页面
      const page = this.gameplayStore.getPageByUrl(url);
      
      if (!page) {
        // 页面不存在，可能是新页面，不需要更新
        return;
      }

      const isManuallyEdited = page.titleManuallyEdited === true;
      if (isManuallyEdited) {
        // 用户手动编辑时，重置hasInitialTitle状态
        this.hasInitialTitle.delete(page.id);
        return;
      }

      // 检查titleSource：如果用户通过操作确认过title，不再自动更新
      if (page.titleSource === 'user_operation') {
        // 用户通过updatePageTags操作确认过title，TabTitleMonitor不再自动更新
        log.debug('页面title已被用户操作确认，忽略自动更新', { pageId: page.id, title: page.title });
        return;
      }

      // 检查是否与当前Title相同或微不足道的差异
      if (isTitleTriviallyDifferent(page.title, newTitle)) {
        // Title差异微不足道，不需要更新
        return;
      }

      // 检查是否与上次更新的Title相同
      const lastUpdated = this.lastUpdatedTitle.get(page.id);
      if (lastUpdated === newTitle) {
        return;
      }

      // 简化策略：首次检测到非URL Title立即保存，后续使用稳定期机制
      if (!this.hasInitialTitle.has(page.id)) {
        // 跳过稳定期，确保首次Title快速展示给用户
        await this.saveInitialTitle(page.id, newTitle, url, tab);
      } else {
        // 后续变化和普通页面一样，使用稳定期机制
        this.trackTitleChange(page.id, newTitle);
      }
    } catch (error) {
      log.error('处理 title 更新失败', { url, error });
    }
  }

  /**
   * 保存首次检测到的Title（立即保存，跳过稳定期）
   * @param pageId - 页面ID（可能是临时页面ID）
   * @param title - 要保存的Title
   * @param url - 页面URL（用于创建持久化页面）
   * @param tab - 标签页信息（用于创建持久化页面）
   */
  private async saveInitialTitle(
    pageId: string, 
    title: string, 
    url: string, 
    tab: chrome.tabs.Tab
  ): Promise<void> {
    const now = Date.now();
    
    // 检查页面是否存在（可能是临时页面）
    let page = this.gameplayStore.getPageById(pageId);
    
    // 如果页面不存在，先创建持久化页面
    if (!page) {
      // 检查是否已有持久化页面（通过URL查找）
      page = this.gameplayStore.getPageByUrl(url);
      
      if (!page) {
        // 创建持久化页面
        let domain: string;
        try {
          domain = new URL(url).hostname;
        } catch (_error) {
          const protocolMatch = url.match(/^([a-z]+):\/\//);
          domain = protocolMatch ? `${protocolMatch[1]}-page` : 'internal-page';
        }

        page = this.gameplayStore.createOrUpdatePage(
          url,
          title,
          domain,
          tab.favIconUrl,
        );
        
        // 触发同步
        triggerBackgroundSync(syncService.markPageChange('create', page.id, page));
        
        log.debug('创建持久化页面并保存Title', { pageId: page.id, url, title });
      } else {
        // 已有持久化页面，更新Title
        log.debug('找到已有持久化页面，更新Title', { pageId: page.id, url, title });
      }
    }
    
    // 更新Title（使用持久化页面的ID）
    await this.updatePageTitleCallback(page.id, title, false);
    
    this.lastUpdateTime.set(page.id, now);
    this.lastUpdatedTitle.set(page.id, title);
    this.hasInitialTitle.add(page.id);
    
    const updatedPage = this.gameplayStore.getPageById(page.id);
    if (updatedPage) {
      triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));
    }

    log.debug('首次Title已保存', { pageId: page.id, title });
  }

  /**
   * 跟踪Title变化，实现稳定期机制
   * @param pageId - 页面ID
   * @param newTitle - 新的Title
   */
  private trackTitleChange(pageId: string, newTitle: string): void {
    const now = Date.now();
    const tracker = this.titleStabilityTrackers.get(pageId);

    if (!tracker) {
      // 首次跟踪此页面的Title变化
      this.titleStabilityTrackers.set(pageId, {
        currentTitle: newTitle,
        stableSince: now,
        changeCount: 1,
        lastChangeTime: now,
      });
      return;
    }

    // 如果Title与当前跟踪的Title相同，不需要重置
    if (tracker.currentTitle === newTitle) {
      return;
    }

    // Title发生变化，重置稳定期计时器
    this.titleStabilityTrackers.set(pageId, {
      currentTitle: newTitle,
      stableSince: now,
      changeCount: tracker.changeCount + 1,
      lastChangeTime: now,
    });
  }

  /**
   * 执行Title更新
   * @param pageId - 页面ID
   * @param title - 要更新的Title
   */
  private async executeTitleUpdate(pageId: string, title: string): Promise<void> {
    const now = Date.now();
    
    // 防抖检查：避免频繁更新导致性能问题
    const lastUpdate = this.lastUpdateTime.get(pageId);
    if (lastUpdate && (now - lastUpdate) < this.UPDATE_DEBOUNCE_MS) {
      return;
    }

    const page = this.gameplayStore.getPageById(pageId);
    if (!page) {
      return;
    }

    if (page.title === title) {
      return;
    }

    await this.updatePageTitleCallback(pageId, title, false);
    
    this.lastUpdateTime.set(pageId, now);
    this.lastUpdatedTitle.set(pageId, title);
    
    const updatedPage = this.gameplayStore.getPageById(pageId);
    if (updatedPage) {
      triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));
    }

    log.debug('Title已稳定并更新', {
      pageId,
      oldTitle: page.title,
      newTitle: title,
    });
  }
}

// 导出单例实例
export const tabTitleMonitor = TabTitleMonitor.getInstance();

