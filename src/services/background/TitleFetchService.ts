// src/services/background/TitleFetchService.ts
// 页面标题获取服务 - 专门处理从 content script 获取真实页面标题的逻辑

import { isTitleUrl } from '@/shared/utils/titleUtils';

/**
 * TitleFetchService - 页面标题获取服务
 * 
 * 职责：
 * 1. 从 content script 获取真实页面标题
 * 2. 管理请求缓存，防止重复请求
 * 3. 处理请求取消（tab 关闭、URL 变化）
 * 4. 提供清晰的接口供 BackgroundServiceImpl 使用
 * 
 * 设计模式：单例模式
 */
class TitleFetchService {
  private static instance: TitleFetchService | null = null;
  
  /**
   * 请求缓存
   * key: `${tabId}-${url}`, value: Promise<string | null>
   * 用于防止同一 tab 的重复请求
   */
  private readonly pendingFetches = new Map<string, Promise<string | null>>();
  
  /**
   * 配置选项
   */
  private readonly config = {
    timeout: 3000, // 超时时间（毫秒）- 增加到3秒，给页面更多加载时间
    maxRetries: 5, // 最大重试次数 - 从2次增加到5次
    retryDelays: [1000, 2000, 3000, 5000, 8000], // 重试延迟（毫秒），指数退避，总时长约30秒
  };

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TitleFetchService {
    if (!TitleFetchService.instance) {
      TitleFetchService.instance = new TitleFetchService();
    }
    return TitleFetchService.instance;
  }

  /**
   * 异步获取真实页面标题并更新
   * 
   * @param tabId - 标签页 ID
   * @param url - 页面 URL
   * @param pageId - 页面 ID（用于更新）
   * @param updateCallback - 更新回调函数 (pageId, title) => Promise<void>
   * @param getCurrentPage - 获取当前页面的函数，用于检查 title 是否还是 URL 样式和是否被手动编辑
   * @returns Promise<void>
   */
  async fetchAndUpdateTitle(
    tabId: number,
    url: string,
    pageId: string,
    updateCallback: (pageId: string, title: string) => Promise<void>,
    getCurrentPage: () => { title: string; titleManuallyEdited?: boolean } | null
  ): Promise<void> {
    const cacheKey = this.getCacheKey(tabId, url);
    
    // 检查是否已有正在进行的请求
    const existingRequest = this.pendingFetches.get(cacheKey);
    if (existingRequest) {
      console.log('[TitleFetchService] 复用已有请求:', cacheKey);
      try {
        const realTitle = await existingRequest;
        if (realTitle) {
          await this.updateTitleIfNeeded(pageId, url, realTitle, updateCallback, getCurrentPage);
        }
      } catch (error) {
        console.warn('[TitleFetchService] 复用请求失败:', error);
      }
      return;
    }

    // 创建新的请求
    const fetchPromise = this.fetchTitleFromContentScript(tabId, url);
    this.pendingFetches.set(cacheKey, fetchPromise);

    try {
      const realTitle = await fetchPromise;
      if (realTitle) {
        await this.updateTitleIfNeeded(pageId, url, realTitle, updateCallback, getCurrentPage);
      }
    } catch (error) {
      console.warn('[TitleFetchService] 获取真实 title 失败:', error);
    } finally {
      // 清理缓存
      this.pendingFetches.delete(cacheKey);
    }
  }

  /**
   * 从 content script 获取 title
   * 使用重试机制，失败后使用降级策略
   */
  private async fetchTitleFromContentScript(tabId: number, url: string): Promise<string | null> {
    // 使用重试机制获取 title
    const realTitle = await this.retryWithBackoff(
      async () => {
        // 检查 tab 是否仍然存在且 URL 未变化
        if (!(await this.isTabValid(tabId, url))) {
          throw new Error('Tab 已关闭或 URL 已变化');
        }

        // 通过 content script 获取真实 title
        const response = await Promise.race([
          chrome.tabs.sendMessage(tabId, { action: 'getPageInfo' }),
          this.createTimeoutPromise(this.config.timeout),
        ]) as any;

        if (response?.success && response.data?.title) {
          const title = response.data.title;
          
          // 检查 title 是否有效（不是 URL 样式）
          if (title && !isTitleUrl(title, url)) {
            return title;
          }
        }
        
        // 如果没有获取到有效 title，抛出错误以触发重试
        throw new Error('Content script 返回无效 title');
      },
      this.config.maxRetries,
      tabId,
      url
    );

    // 如果重试后仍然失败，检查 tab 是否仍然有效
    // 只有在 tab 仍然有效时才使用降级策略
    if (!realTitle) {
      const isTabStillValid = await this.isTabValid(tabId, url);
      if (isTabStillValid) {
        console.log('[TitleFetchService] 所有重试都失败，使用降级策略');
        return this.getFallbackTitle(url);
      } else {
        console.log('[TitleFetchService] Tab 已关闭，不使用降级策略');
        return null;
      }
    }

    return realTitle;
  }

  /**
   * 检查 tab 是否仍然有效（存在且 URL 未变化）
   */
  private async isTabValid(tabId: number, expectedUrl: string): Promise<boolean> {
    try {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab || tab.url !== expectedUrl) {
        console.log('[TitleFetchService] Tab 已关闭或 URL 已变化，取消请求');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新 title（如果需要）
   * 检查当前页面的 title 是否还是 URL 样式，如果是则更新
   */
  private async updateTitleIfNeeded(
    pageId: string,
    url: string,
    realTitle: string,
    updateCallback: (pageId: string, title: string) => Promise<void>,
    getCurrentPage: () => { title: string; titleManuallyEdited?: boolean } | null
  ): Promise<void> {
    // 再次检查当前页面的 title 是否还是 URL 样式
    // 如果用户已经手动编辑了 title，则不更新
    const currentPage = getCurrentPage();
    const isManuallyEdited = currentPage?.titleManuallyEdited === true;
    
    if (currentPage && isTitleUrl(currentPage.title, url) && !isManuallyEdited) {
      // 当前 title 仍然是 URL 样式且未被手动编辑，可以安全更新
      await updateCallback(pageId, realTitle);
      console.log('[TitleFetchService] 成功更新 title:', realTitle);
    } else {
      console.log('[TitleFetchService] 跳过更新:', {
        reason: isManuallyEdited ? 'title 已被用户手动编辑' : 'title 不是 URL 样式',
        title: currentPage?.title,
        titleManuallyEdited: currentPage?.titleManuallyEdited,
      });
    }
  }

  /**
   * 生成缓存 key
   */
  private getCacheKey(tabId: number, url: string): string {
    return `${tabId}-${url}`;
  }

  /**
   * 创建超时 Promise
   */
  private createTimeoutPromise(ms: number): Promise<null> {
    return new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    );
  }


  /**
   * 从 URL 提取域名
   * @param url - 完整的 URL
   * @returns 域名，如果提取失败则返回 null
   */
  private extractDomainFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (_error) {
      // 如果 URL 无效，尝试使用正则表达式提取
      const match = url.match(/^https?:\/\/([^/]+)/);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    }
  }

  /**
   * 获取降级标题（从 URL 提取域名）
   * @param url - 页面 URL
   * @returns 降级标题（域名），如果提取失败则返回 null
   */
  private getFallbackTitle(url: string): string | null {
    const domain = this.extractDomainFromUrl(url);
    if (domain) {
      // 移除 www. 前缀（如果存在）
      return domain.replace(/^www\./, '');
    }
    return null;
  }

  /**
   * 指数退避重试机制
   * @param fn - 要重试的函数
   * @param retries - 剩余重试次数
   * @param tabId - 标签页 ID（用于验证）
   * @param url - 页面 URL（用于验证）
   * @returns Promise<string | null>
   */
  private async retryWithBackoff(
    fn: () => Promise<string>,
    retries: number,
    tabId: number,
    url: string
  ): Promise<string | null> {
    try {
      return await fn();
    } catch (_error) {
      // 如果重试次数用尽，返回 null
      if (retries <= 0) {
        console.warn('[TitleFetchService] 重试次数用尽，放弃获取 title');
        return null;
      }

      // 检查 tab 是否仍然有效
      if (!(await this.isTabValid(tabId, url))) {
        console.log('[TitleFetchService] Tab 已关闭或 URL 已变化，取消重试');
        return null;
      }

      // 计算延迟时间（使用配置的延迟数组）
      const delayIndex = this.config.maxRetries - retries;
      const delay = this.config.retryDelays[delayIndex] || 
                    this.config.retryDelays[this.config.retryDelays.length - 1] || 1000;

      console.log(`[TitleFetchService] 重试获取 title (剩余 ${retries} 次，延迟 ${delay}ms)`);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.retryWithBackoff(fn, retries - 1, tabId, url);
    }
  }

  /**
   * 清理指定 tab 的所有缓存（用于 tab 关闭时清理）
   */
  clearCacheForTab(tabId: number): void {
    const keysToDelete: string[] = [];
    for (const key of this.pendingFetches.keys()) {
      if (key.startsWith(`${tabId}-`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.pendingFetches.delete(key));
  }

  /**
   * 清理所有缓存（用于测试或重置）
   */
  clearAllCache(): void {
    this.pendingFetches.clear();
  }
}

// 导出单例实例
export const titleFetchService = TitleFetchService.getInstance();

