// src/services/background/BackgroundServiceImpl.ts
// 后端服务实现 - 具体的业务逻辑

import { GameplayStore } from '../gameplayStore';
import { syncService } from '../syncService';
import { triggerBackgroundSync } from '../../shared/rpc-protocol/server';
import { IBackgroundApi } from '../../shared/rpc-protocol/protocol';
import { GameplayTag, TaggedPage } from '../../shared/types/gameplayTag';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../../shared/types/pageSettings';
import { storageService, STORAGE_KEYS } from '../storageService';
import { titleFetchService } from './TitleFetchService';
import { tabTitleMonitor } from './TabTitleMonitor';
import { isTitleUrl } from '@/shared/utils/titleUtils';

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
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      // 检查是否有运行时错误（可能是 popup 关闭导致的）
      if (chrome.runtime.lastError) {
        console.warn('[getCurrentPage] Chrome runtime 错误（可能是 popup 已关闭）:', chrome.runtime.lastError.message);
        throw new Error('Popup 窗口已关闭或无法访问标签页');
      }

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

    let analyzePageResponse: any = null;
    let videoTimestamp = 0;

    if (syncVideoTimestamp) {
      // ========== 方式1: 优先使用消息机制（新架构） ==========
      try {
        const response = await Promise.race([
          chrome.tabs.sendMessage(tab.id!, { action: 'ANALYZE_PAGE' }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1000)
          ),
        ]) as any;

        analyzePageResponse = response;

        if (response?.success && response.data) {
          const { video } = response.data;
          if (video && video.timestamp > 0) {
            videoTimestamp = video.timestamp;
            console.log('[getCurrentPage] 通过消息机制获取视频时间戳:', videoTimestamp);
          }
        }
      } catch (error) {
        console.warn('[getCurrentPage] 消息机制失败，回退到 executeScript:', error);
        
        // ========== 方式2: 兜底使用 executeScript（兼容未加载的情况） ==========
        try {
          // 向所有 Frame 广播检测请求，使用 allFrames: true 遍历所有 frame
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => {
              // 执行简单检测（与旧逻辑保持一致，作为兜底方案）
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
                if (video.currentTime > 0) {
                  return Math.floor(video.currentTime);
                }
              }
              return 0;
            },
          });

          // results 是一个数组，包含所有 Frame 的执行结果
          // executeScript 中的函数返回数字时间戳
          const validTimestamps = results
            .map(r => r.result as number)
            .filter(timestamp => typeof timestamp === 'number' && timestamp > 0);
          
          if (validTimestamps.length > 0) {
            // 取最大的时间戳（通常表示最活跃的视频）
            videoTimestamp = Math.max(...validTimestamps);
            console.log('[getCurrentPage] 通过 executeScript 获取视频时间戳:', videoTimestamp);
          }
        } catch (fallbackError) {
          console.warn('[getCurrentPage] executeScript 也失败，跳过检测:', fallbackError);
        }
      }

      // 如果检测到视频时间戳，添加到 URL
      if (videoTimestamp > 0) {
        resolvedUrl = addTimestampToUrl(tab.url, videoTimestamp);
      }
    }

    console.log('[getCurrentPage] 准备更新页面数据');

    let domain: string;
    try {
      domain = new URL(resolvedUrl).hostname;
    } catch (_error) {
      const protocolMatch = resolvedUrl.match(/^([a-z]+):\/\//);
      domain = protocolMatch ? `${protocolMatch[1]}-page` : 'internal-page';
    }

    // [架构修复核心点]
    // 1. 先尝试通过 URL 获取已存在的页面数据
    const existingPage = gameplayStore.getPageByUrl(resolvedUrl);
    
    // 2. 决策标题策略：
    // - 如果页面已存在：使用数据库中的标题
    // - 如果页面不存在：优先使用 ANALYZE_PAGE 响应中的 title，否则使用浏览器 Tab 的标题
    let titleToUse: string;
    if (existingPage) {
      titleToUse = existingPage.title;
    } else {
      // 优先使用 ANALYZE_PAGE 响应中的 metadata.title
      const metadataTitle = analyzePageResponse?.success && analyzePageResponse?.data?.metadata?.title;
      if (metadataTitle && !isTitleUrl(metadataTitle, tab.url)) {
        titleToUse = metadataTitle;
        console.log('[getCurrentPage] 使用 ANALYZE_PAGE 响应中的 title:', titleToUse);
      } else {
        titleToUse = tab.title || '无标题';
      }
    }

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

    // 4. 如果 title 是 URL 样式，异步获取真实 title（不阻塞返回）
    // 优化：只在创建新页面或 title 是 URL 时才启动异步任务
    // 如果 existingPage 存在且 title 不是 URL，说明已经有正确的 title，不需要异步获取
    if (isTitleUrl(page.title, resolvedUrl)) {
      // 使用 TitleFetchService 异步获取真实 title，不阻塞当前返回
      titleFetchService.fetchAndUpdateTitle(
        tab.id!,
        resolvedUrl,
        page.id,
        // 更新回调（自动更新，不设置手动编辑标记）
        async (pageId: string, title: string) => {
          await this.updatePageTitle(pageId, title, false);
        },
        // 获取当前页面的函数，用于检查 title 是否还是 URL 样式和是否被手动编辑
        () => gameplayStore.getPageById(page.id) || null
      ).catch((error) => {
        console.warn('[getCurrentPage] 异步获取真实 title 失败:', error);
      });
    }

    console.log('[getCurrentPage] 成功获取页面');
    return page;
    } catch (error) {
      // 如果是已知的错误（popup 关闭等），直接抛出
      if (error instanceof Error && (error.message.includes('Popup') || error.message.includes('无法获取'))) {
        throw error;
      }
      // 其他错误也记录并抛出
      console.error('[getCurrentPage] 处理请求时发生错误:', error);
      throw error;
    }
  }

  async getAllTaggedPages(): Promise<TaggedPage[]> {
    return gameplayStore.getTaggedPages();
  }

  async updatePageTitle(pageId: string, title: string, isManualEdit = false): Promise<void> {
    if (!pageId || !title) {
      throw new Error('页面ID和标题不能为空');
    }

    const success = gameplayStore.updatePageTitle(pageId, title, isManualEdit);
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
      // 通过 updatePageDetails 更新的是用户手动编辑的，设置 isManualEdit: true
      const success = gameplayStore.updatePageTitle(pageId, normalizedTitle, true);
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

  async importBookmarks(): Promise<{ 
    pagesProcessed: number; 
    tagsCreated: number; 
    tagsAdded: number;
    errors: Array<{ url: string; error: string }>;
  }> {
    // Runtime Safety: 检查扩展上下文是否有效
    if (!chrome.runtime?.id) {
      throw new Error('扩展上下文无效');
    }

    // 检查bookmarks权限
    if (!chrome.bookmarks) {
      throw new Error('书签权限未授予，请在扩展设置中启用书签权限');
    }

    const stats = {
      pagesProcessed: 0,
      tagsCreated: 0,
      tagsAdded: 0,
      errors: [] as Array<{ url: string; error: string }>,
    };

    // 用于跟踪已创建的tag（全局，避免重复计数）
    const createdTagNames = new Set<string>();

    /**
     * 检查URL是否有效
     */
    const isValidUrl = (url: string | undefined): boolean => {
      if (!url || typeof url !== 'string') {
        return false;
      }
      const lowerUrl = url.toLowerCase();
      // 过滤无效协议
      return !lowerUrl.startsWith('javascript:') &&
             !lowerUrl.startsWith('chrome:') &&
             !lowerUrl.startsWith('about:') &&
             !lowerUrl.startsWith('file:') &&
             (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://'));
    };

    /**
     * 递归遍历书签树，提取URL和文件夹路径
     */
    const traverseBookmarks = (
      nodes: chrome.bookmarks.BookmarkTreeNode[],
      folderPath: string[] = []
    ): void => {
      for (const node of nodes) {
        // 跳过根节点（"Bookmarks Bar"和"Other Bookmarks"）
        if (node.id === '0' || node.id === '1' || node.id === '2') {
          if (node.children) {
            traverseBookmarks(node.children, []);
          }
          continue;
        }

        // 如果是文件夹节点
        if (node.children && !node.url) {
          const currentFolderName = node.title || '';
          // 只添加非空的文件夹名
          const newPath = currentFolderName ? [...folderPath, currentFolderName] : folderPath;
          traverseBookmarks(node.children, newPath);
        }
        // 如果是书签节点（有URL）
        else if (node.url && isValidUrl(node.url)) {
          try {
            const url = node.url;
            const title = node.title || '无标题';
            
            // 提取domain
            let domain: string;
            try {
              domain = new URL(url).hostname;
            } catch {
              domain = 'unknown';
            }

            // 创建或更新页面
            const page = gameplayStore.createOrUpdatePage(url, title, domain);
            stats.pagesProcessed++;

            // 记录添加tag之前的页面状态
            const pageBeforeTags = gameplayStore.getPageById(page.id);
            const tagsBefore = new Set(pageBeforeTags?.tags || []);

            // 为每个文件夹名创建tag并添加到页面
            for (const folderName of folderPath) {
              if (!folderName || folderName.trim() === '') {
                continue;
              }

              const trimmedFolderName = folderName.trim();
              
              // 检查tag是否已存在（在调用createTagAndAddToPage之前）
              const existingTagBefore = gameplayStore.findTagByName(trimmedFolderName);
              
              // 如果tag不存在，记录为新建tag
              if (!existingTagBefore && !createdTagNames.has(trimmedFolderName)) {
                createdTagNames.add(trimmedFolderName);
                stats.tagsCreated++;
              }

              // 使用createTagAndAddToPage，它会自动处理tag创建和添加到页面
              // 这个方法会：
              // 1. 如果tag不存在，创建新tag
              // 2. 如果tag已存在，使用现有tag
              // 3. 将tag添加到页面（如果页面还没有此tag）
              gameplayStore.createTagAndAddToPage(trimmedFolderName, page.id);
            }

            // 检查页面是否真的添加了新tag
            const pageAfterTags = gameplayStore.getPageById(page.id);
            const tagsAfter = new Set(pageAfterTags?.tags || []);
            
            // 计算新增的tag数量
            const newTagsCount = tagsAfter.size - tagsBefore.size;
            if (newTagsCount > 0) {
              stats.tagsAdded += newTagsCount;
            }

            // 触发同步
            if (pageAfterTags) {
              triggerBackgroundSync(syncService.markPageChange('update', pageAfterTags.id, pageAfterTags));
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            stats.errors.push({
              url: node.url || 'unknown',
              error: errorMessage,
            });
          }
        }
      }
    };

    try {
      // 获取所有书签树
      const bookmarkTree = await chrome.bookmarks.getTree();
      
      // 遍历书签树
      traverseBookmarks(bookmarkTree);

      // 触发后台全量同步，确保导入的数据上传到云端
      triggerBackgroundSync(syncService.syncAll());

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`导入书签失败: ${errorMessage}`);
    }
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

  /**
   * 初始化 Tab Title 监听器
   * 应该在 BackgroundServiceImpl 实例创建后调用
   */
  initializeTabTitleMonitor(): void {
    tabTitleMonitor.start(async (pageId: string, title: string) => {
      await this.updatePageTitle(pageId, title);
    });
  }

}

