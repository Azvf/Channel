// src/services/background/BackgroundServiceImpl.ts
// 后端服务实现 - 具体的业务逻辑

import { GameplayStore } from '../gameplayStore';
import { syncService } from '../syncService';
import { triggerBackgroundSync } from '../../rpc/server';
import { IBackgroundApi } from '../../rpc/protocol';
import { GameplayTag, TaggedPage } from '../../types/gameplayTag';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../../types/pageSettings';
import { storageService, STORAGE_KEYS } from '../storageService';

const gameplayStore = GameplayStore.getInstance();
let currentPageSettings: PageSettings = DEFAULT_PAGE_SETTINGS;

/**
 * 获取页面设置
 */
async function getPageSettings(): Promise<PageSettings> {
  try {
    const data = await storageService.getMultiple([STORAGE_KEYS.PAGE_SETTINGS]);
    const pageSettings = data[STORAGE_KEYS.PAGE_SETTINGS] as PageSettings | null;
    if (pageSettings) {
      currentPageSettings = {
        syncVideoTimestamp:
          typeof pageSettings?.syncVideoTimestamp === 'boolean'
            ? pageSettings.syncVideoTimestamp
            : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
      };
    }
    return currentPageSettings;
  } catch (error) {
    console.error('获取页面设置失败:', error);
    return currentPageSettings;
  }
}

/**
 * 添加时间戳到 URL
 */
function addTimestampToUrl(url: string, timestamp: number): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('t', timestamp.toString());
    return urlObj.toString();
  } catch (error) {
    console.warn('添加时间戳到 URL 失败:', error);
    return url;
  }
}

/**
 * 背景服务实现
 * 注意：这里的代码是纯粹的业务逻辑，不需要关心 chrome.runtime
 * RPC Server 层会统一处理事务、初始化、时间校准等
 */
export class BackgroundServiceImpl implements IBackgroundApi {
  // ==================== Tag 相关 ====================
  
  async getAllTags(): Promise<GameplayTag[]> {
    return gameplayStore.getAllTags();
  }

  async createTag(name: string, description?: string, color?: string): Promise<GameplayTag> {
    if (!name) {
      throw new Error('标签名称不能为空');
    }

    const tag = gameplayStore.createTag(name, description, color);
    
    // 触发后台同步（fire-and-forget）
    triggerBackgroundSync(syncService.markTagChange('create', tag.id, tag));
    
    return tag;
  }

  async deleteTag(tagId: string): Promise<void> {
    if (!tagId) {
      throw new Error('标签ID不能为空');
    }

    const success = gameplayStore.deleteTag(tagId);

    if (!success) {
      throw new Error('删除标签失败（可能标签不存在）');
    }

    triggerBackgroundSync(syncService.markTagChange('delete', tagId));
  }

  async updateTag(tagId: string, newName: string): Promise<void> {
    if (!tagId || !newName) {
      throw new Error('标签ID和新名称不能为空');
    }

    const result = gameplayStore.updateTagName(tagId, newName);

    if (!result.success) {
      throw new Error(result.error || '更新标签失败');
    }

    const tag = gameplayStore.getTagById(tagId);
    if (tag) {
      triggerBackgroundSync(syncService.markTagChange('update', tag.id, tag));
    }
  }

  async getAllTagUsageCounts(): Promise<Record<string, number>> {
    return gameplayStore.getAllTagUsageCounts();
  }

  // ==================== Page 相关 ====================

  async getCurrentPage(): Promise<TaggedPage> {
    console.log('[getCurrentPage] 开始处理请求 (使用 chrome.tabs.query)');
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || tabs.length === 0) {
      console.error('[getCurrentPage] 没有找到活动标签页');
      throw new Error('无法获取当前标签页');
    }

    const tab = tabs[0];
    console.log('[getCurrentPage] 活动标签页 URL (来自 query):', tab.url);

    if (!tab || !tab.id || !tab.url || tab.url.startsWith('about:')) {
      console.error('[getCurrentPage] 无效的标签页信息 (URL 为空或 about:blank)');
      throw new Error('无法在当前页面上操作 (页面尚未加载完成)');
    }

    let resolvedUrl = tab.url;
    const pageSettings = await getPageSettings();
    const syncVideoTimestamp = pageSettings.syncVideoTimestamp;

    if (syncVideoTimestamp) {
      try {
        // 向所有 Frame 广播检测请求，使用 allFrames: true 遍历所有 frame
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: () => {
            // 检测视频时间戳
            const videos = document.querySelectorAll('video');
            let bestVideo: HTMLVideoElement | null = null;
            let maxScore = -1;

            videos.forEach((video) => {
              const rect = video.getBoundingClientRect();
              const area = rect.width * rect.height;
              
              // 排除不可见视频
              if (area < 100) return;

              let score = area;
              if (!video.paused) score *= 2; // 正在播放的优先级最高
              if (video.currentTime > 0) score *= 1.5; // 有进度的优先级高

              if (score > maxScore) {
                maxScore = score;
                bestVideo = video;
              }
            });

            // 如果找到最佳视频，返回其时间戳
            if (bestVideo !== null) {
              const video = bestVideo as HTMLVideoElement;
              if (video.currentTime > 0 && !video.paused) {
                return Math.floor(video.currentTime);
              }
              // 如果暂停但有进度
              if (video.currentTime > 0) {
                return Math.floor(video.currentTime);
              }
            }
            return 0;
          },
        });

        // results 是一个数组，包含所有 Frame 的执行结果
        const validResults = results
          .map(r => r.result as number)
          .filter(timestamp => timestamp > 0);
        
        if (validResults.length > 0) {
          // 取最大的时间戳（通常表示最活跃的视频）
          const videoTimestamp = Math.max(...validResults);
          if (videoTimestamp > 0) {
            resolvedUrl = addTimestampToUrl(tab.url, videoTimestamp);
          }
        }
      } catch (error) {
        console.warn('检测视频时间戳失败 (可能为内部页面):', error);
      }
    }

    console.log('[getCurrentPage] 准备更新页面数据');

    let domain: string;
    try {
      domain = new URL(resolvedUrl).hostname;
    } catch (error) {
      const protocolMatch = resolvedUrl.match(/^([a-z]+):\/\//);
      domain = protocolMatch ? `${protocolMatch[1]}-page` : 'internal-page';
    }

    // [架构修复核心点]
    // 1. 先尝试通过 URL 获取已存在的页面数据
    const existingPage = gameplayStore.getPageByUrl(resolvedUrl);
    
    // 2. 决策标题策略：
    // - 如果页面已存在：使用数据库中的标题
    // - 如果页面不存在：使用浏览器 Tab 的标题
    const titleToUse = existingPage ? existingPage.title : (tab.title || '无标题');

    // 3. 调用 createOrUpdatePage
    const page = gameplayStore.createOrUpdatePage(
      resolvedUrl,
      titleToUse, 
      domain,
      tab.favIconUrl,
    );

    // 注意：不需要手动调用 commit()，RPC Server 层会统一处理事务

    // [修改] 异步触发同步，不等待
    if (page.createdAt === page.updatedAt) {
      triggerBackgroundSync(syncService.markPageChange('create', page.id, page));
    } else {
      triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
    }

    console.log('[getCurrentPage] 成功获取页面');
    return page;
  }

  async getAllTaggedPages(): Promise<TaggedPage[]> {
    return gameplayStore.getTaggedPages();
  }

  async updatePageTitle(pageId: string, title: string): Promise<void> {
    if (!pageId || !title) {
      throw new Error('页面ID和标题不能为空');
    }

    const success = gameplayStore.updatePageTitle(pageId, title);
    if (!success) {
      throw new Error('更新页面标题失败');
    }

    const page = gameplayStore.getPageById(pageId);
    if (page) {
      triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
    }
  }

  async updatePageTags(
    pageId: string, 
    payload: { tagsToAdd: string[]; tagsToRemove: string[] }
  ): Promise<{ newPage: TaggedPage; newStats: { todayCount: number; streak: number } }> {
    if (!pageId) {
      throw new Error('页面ID不能为空');
    }

    const tagsToAdd = Array.isArray(payload.tagsToAdd) ? payload.tagsToAdd : [];
    const tagsToRemove = Array.isArray(payload.tagsToRemove) ? payload.tagsToRemove : [];

    const normalizedTagsToAdd = Array.from(
      new Set(
        tagsToAdd
          .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(tag => tag.length > 0),
      ),
    );

    const normalizedTagsToRemove = Array.from(
      new Set(
        tagsToRemove
          .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(tag => tag.length > 0),
      ),
    );

    const page = gameplayStore.getPageById(pageId);
    if (!page) {
      throw new Error('页面不存在');
    }

    normalizedTagsToAdd.forEach(tagName => {
      gameplayStore.createTagAndAddToPage(tagName, pageId);
    });

    normalizedTagsToRemove.forEach(tagIdentifier => {
      const existingById = gameplayStore.getTagById(tagIdentifier);
      if (existingById) {
        gameplayStore.removeTagFromPage(pageId, existingById.id);
        return;
      }

      const existingByName = gameplayStore.findTagByName(tagIdentifier);
      if (existingByName) {
        gameplayStore.removeTagFromPage(pageId, existingByName.id);
      }
    });

    const updatedPage = gameplayStore.getPageById(pageId);
    if (!updatedPage) {
      throw new Error('更新页面失败');
    }

    triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));

    const stats = gameplayStore.getUserStats();

    return {
      newPage: updatedPage,
      newStats: stats,
    };
  }

  async updatePageDetails(
    pageId: string, 
    payload: { title: string; tagsToAdd: string[]; tagsToRemove: string[] }
  ): Promise<void> {
    const { title, tagsToAdd = [], tagsToRemove = [] } = payload;

    if (!pageId) {
      throw new Error('页面ID不能为空');
    }

    const page = gameplayStore.getPageById(pageId);
    if (!page) {
      throw new Error('页面不存在');
    }

    let titleUpdated = false;
    let tagsUpdated = false;

    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    if (normalizedTitle && normalizedTitle !== page.title) {
      const success = gameplayStore.updatePageTitle(pageId, normalizedTitle);
      if (success) {
        titleUpdated = true;
      }
    }

    const normalizedTagsToAdd = Array.from(
      new Set(
        tagsToAdd
          .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(tag => tag.length > 0),
      ),
    );

    const normalizedTagsToRemove = Array.from(
      new Set(
        tagsToRemove
          .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(tag => tag.length > 0),
      ),
    );

    if (normalizedTagsToAdd.length > 0 || normalizedTagsToRemove.length > 0) {
      normalizedTagsToAdd.forEach(tagName => {
        gameplayStore.createTagAndAddToPage(tagName, pageId);
      });

      normalizedTagsToRemove.forEach(tagIdentifier => {
        const existingById = gameplayStore.getTagById(tagIdentifier);
        if (existingById) {
          gameplayStore.removeTagFromPage(pageId, existingById.id);
          return;
        }

        const existingByName = gameplayStore.findTagByName(tagIdentifier);
        if (existingByName) {
          gameplayStore.removeTagFromPage(pageId, existingByName.id);
        }
      });

      tagsUpdated = true;
    }

    if (titleUpdated || tagsUpdated) {
      const updatedPage = gameplayStore.getPageById(pageId);
      if (updatedPage) {
        triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));
      }
    }
  }

  async addTagToPage(pageId: string, tagId: string): Promise<void> {
    if (!pageId || !tagId) {
      throw new Error('页面ID和标签ID不能为空');
    }

    const success = gameplayStore.addTagToPage(pageId, tagId);
    if (!success) {
      throw new Error('添加标签到页面失败');
    }

    const page = gameplayStore.getPageById(pageId);
    if (page) {
      triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
    }
  }

  async removeTagFromPage(pageId: string, tagId: string): Promise<void> {
    if (!pageId || !tagId) {
      throw new Error('页面ID和标签ID不能为空');
    }

    const success = gameplayStore.removeTagFromPage(pageId, tagId);
    if (!success) {
      throw new Error('从页面移除标签失败');
    }

    const page = gameplayStore.getPageById(pageId);
    if (page) {
      triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
    }
  }

  async createTagAndAddToPage(tagName: string, pageId: string): Promise<GameplayTag> {
    if (!tagName || !pageId) {
      throw new Error('标签名称和页面ID不能为空');
    }

    const tag = gameplayStore.createTagAndAddToPage(tagName, pageId);
    
    triggerBackgroundSync(syncService.markTagChange('create', tag.id, tag));
    const page = gameplayStore.getPageById(pageId);
    if (page) {
      triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
    }
    
    return tag;
  }

  // ==================== Stats 相关 ====================

  async getUserStats(): Promise<{ todayCount: number; streak: number }> {
    return gameplayStore.getUserStats();
  }

  // ==================== Data 相关 ====================

  async exportData(): Promise<string> {
    return gameplayStore.exportData();
  }

  async importData(jsonData: string, mergeMode: boolean): Promise<{ tagsCount: number; pagesCount: number }> {
    if (!jsonData || typeof jsonData !== 'string') {
      throw new Error('无效的导入数据');
    }

    const result = await gameplayStore.importData(jsonData, mergeMode);

    if (!result.success) {
      throw new Error(result.error || '导入数据失败');
    }

    // ✅ 修复：触发后台全量同步，确保导入的数据上传到云端
    // 使用 triggerBackgroundSync 确保不阻塞 UI 响应
    // 注意：importData 可能包含大量数据，无法逐条标记 markChange
    // 因此调用 syncAll() 来发现本地的新数据并上传
    triggerBackgroundSync(syncService.syncAll());

    return result.imported!;
  }

  // ==================== Tab 相关 (保留用于兼容) ====================

  async getTabInfo(tabId: number | undefined): Promise<{ title: string; url: string; id: number | undefined }> {
    if (!tabId) {
      throw new Error('无法获取标签页ID');
    }

    const tab = await chrome.tabs.get(tabId);
    return {
      title: tab.title || '',
      url: tab.url || '',
      id: tab.id
    };
  }
}

