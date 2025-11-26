// src/services/background/TabTitleMonitor.ts
// Tab Title 监听服务 - 监听标签页标题变化并自动更新页面标题

import { GameplayStore } from '@/services/gameplayStore';
import { syncService } from '@/services/syncService';
import { triggerBackgroundSync } from '@/shared/rpc-protocol/server';
import { isTitleUrl, isTitleSimilar } from '@/shared/utils/titleUtils';

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
  private readonly UPDATE_DEBOUNCE_MS = 2000;
  // 避免相同或相似标题的重复更新
  private lastUpdatedTitle: Map<string, string> = new Map();
  // 已完成 title 更新的页面，停止监听以避免重复检测
  private completedPages: Set<string> = new Set();
  // LRU 缓存配置
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 小时
  private cleanupTimer: number | null = null;

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
      console.log('[TabTitleMonitor] 监听器已在运行');
      return;
    }

    this.updatePageTitleCallback = updatePageTitleCallback;

    try {
      chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
      chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
      this.isListening = true;
      this.startCleanupTimer();
      console.log('[TabTitleMonitor] 监听器已启动');
    } catch (error) {
      console.error('[TabTitleMonitor] 启动监听器失败:', error);
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
      this.lastUpdateTime.clear();
      this.lastUpdatedTitle.clear();
      this.completedPages.clear();
      console.log('[TabTitleMonitor] 监听器已停止');
    } catch (error) {
      console.error('[TabTitleMonitor] 停止监听器失败:', error);
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
        this.completedPages.delete(pageId);
      }
    }

    // 如果超出大小限制，使用 LRU 策略清理最旧的条目
    this.enforceMaxSize(this.lastUpdateTime, this.MAX_CACHE_SIZE);
    this.enforceMaxSize(this.lastUpdatedTitle, this.MAX_CACHE_SIZE);
    
    // completedPages 使用 Set，需要转换为 Map 才能按时间排序
    // 简化处理：如果 completedPages 太大，清空一半
    if (this.completedPages.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.completedPages);
      const toKeep = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE / 2));
      this.completedPages.clear();
      toKeep.forEach(id => this.completedPages.add(id));
    }
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

      if (this.completedPages.has(page.id)) {
        return;
      }

      const isManuallyEdited = page.titleManuallyEdited === true;
      if (isManuallyEdited) {
        return;
      }
      
      const lastUpdate = this.lastUpdateTime.get(page.id);
      const now = Date.now();
      if (lastUpdate && (now - lastUpdate) < this.UPDATE_DEBOUNCE_MS) {
        return;
      }
      
      if (isTitleSimilar(page.title, newTitle)) {
        this.completedPages.add(page.id);
        return;
      }
      
      const lastUpdated = this.lastUpdatedTitle.get(page.id);
      if (lastUpdated === newTitle) {
        return;
      }
      
      await this.updatePageTitleCallback(page.id, newTitle, false);
      
      this.lastUpdateTime.set(page.id, now);
      this.lastUpdatedTitle.set(page.id, newTitle);
      
      const updatedPage = this.gameplayStore.getPageById(page.id);
      if (updatedPage) {
        triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));
      }
      
      this.completedPages.add(page.id);
    } catch (error) {
      console.error('[TabTitleMonitor] 处理 title 更新失败:', error);
    }
  }
}

// 导出单例实例
export const tabTitleMonitor = TabTitleMonitor.getInstance();

