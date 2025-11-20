import { TagManager } from '../services/tagManager';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { syncService } from '../services/syncService';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../types/pageSettings';
import { TagsCollection, PageCollection } from '../types/gameplayTag';

const tagManager = TagManager.getInstance();
let currentPageSettings: PageSettings = DEFAULT_PAGE_SETTINGS;
let initPromise: Promise<void> | null = null;

interface RuntimeMessage {
  action: string;
  // 使用 any 保持兼容性，具体类型由各个处理器验证
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * 辅助函数：触发后台同步但不阻塞响应
 * 这实现了 "Fire and Forget" 模式，确保 UI 操作流畅
 */
function triggerBackgroundSync(syncPromise: Promise<void>): void {
  syncPromise.catch((err) => {
    console.warn('[Background] 异步同步触发失败 (已由 SyncService 内部处理，此处仅记录):', err);
  });
}

/**
 * 【核心设计】事务操作包装器
 * @param handler 具体的业务逻辑函数
 */
const withTransaction = <T>(
  handler: (data: any) => T | Promise<T>
) => {
  return async (data: any, sendResponse: (response: any) => void) => {
    try {
      // 1. 准备阶段：确保内存数据是最新的 (Rehydration)
      // 如果 SW 刚唤醒，这里会从 Storage 加载数据；如果活着，则是空操作
      await getInitializationPromise();

      // 2. 执行阶段：运行纯业务逻辑 (In-Memory, Fast)
      const result = await handler(data);

      // 3. 提交阶段：原子化持久化 (Atomic Commit)
      // 只有当业务逻辑成功且数据脏了时，才写入 Storage
      // 这就是 "Barrier"，确保在 SW 终止前数据落地
      await tagManager.commit();

      // 4. 响应阶段：此时数据已安全
      sendResponse({ success: true, data: result });

      // 5. 副作用阶段：触发后台同步 (Fire-and-forget)
      // 即使 SW 在这之后死掉，数据已在 Storage 中，下次唤醒会通过 pendingChanges 上传
      // 注意：这里需要根据具体的操作类型触发相应的同步
      // 由于不同操作需要不同的同步逻辑，这部分在具体的 handler 中处理

    } catch (error) {
      console.error('Transaction failed:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
};

export function resetInitializationForTests(): void {
  initPromise = null;
  currentPageSettings = DEFAULT_PAGE_SETTINGS;
}

export async function getInitializationPromise(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('Background: 启动初始化...');

      const data = await storageService.getMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES,
        STORAGE_KEYS.PAGE_SETTINGS,
      ]);

      tagManager.initialize({
        tags: data[STORAGE_KEYS.TAGS] as TagsCollection | null,
        pages: data[STORAGE_KEYS.PAGES] as PageCollection | null,
      });

      const pageSettings = data[STORAGE_KEYS.PAGE_SETTINGS] as PageSettings | null;
      currentPageSettings = {
        syncVideoTimestamp:
          typeof pageSettings?.syncVideoTimestamp === 'boolean'
            ? pageSettings.syncVideoTimestamp
            : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
      };

      // 初始化同步服务
      await syncService.initialize();

      console.log('Background: 初始化完成。');
    } catch (error) {
      console.error('Background: 初始化失败:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function onInstalledHandler(_details: chrome.runtime.InstalledDetails): void {
  (async () => {
    try {
      await getInitializationPromise();

      await syncStorageService.setMultiple({
        [STORAGE_KEYS.EXTENSION_ENABLED]: true,
        [STORAGE_KEYS.THEME]: 'default',
        [STORAGE_KEYS.LAST_USED]: Date.now(),
      });
      console.log('Background: 插件已安装并设置默认值。');
    } catch (error) {
      console.error('Background: onInstalled 失败:', error);
    }
  })();
}

async function getPageSettings(): Promise<PageSettings> {
  return currentPageSettings;
}

/**
 * 核心异步消息处理逻辑（可等待）
 * 提取为独立函数，便于测试
 */
export const handleMessageAsync = async (
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void,
): Promise<void> => {
  try {
    await getInitializationPromise();

    switch (message.action) {
      case 'getTabInfo':
        await handleGetTabInfo(sender.tab?.id, sendResponse);
        break;
      case 'changePageColor':
        await handleChangePageColor(sender.tab?.id, sendResponse);
        break;
      case 'showNotification':
        await handleShowNotification(sendResponse);
        break;

      case 'getCurrentPage':
        await handleGetCurrentPage(sendResponse);
        break;
      case 'getAllTags':
        await handleGetAllTags(sendResponse);
        break;
      case 'getAllTaggedPages':
        await handleGetAllTaggedPages(sendResponse);
        break;
      case 'createTag':
        handleCreateTag(message.data, sendResponse);
        break;
      case 'addTagToPage':
        handleAddTagToPage(message.data, sendResponse);
        break;
      case 'createTagAndAddToPage':
        handleCreateTagAndAddToPage(message.data, sendResponse);
        break;
      case 'removeTagFromPage':
        handleRemoveTagFromPage(message.data, sendResponse);
        break;
      case 'updatePageTags':
        handleUpdatePageTags(message.data, sendResponse);
        break;
      case 'updatePageTitle':
        handleUpdatePageTitle(message.data, sendResponse);
        break;
      case 'updatePageDetails':
        handleUpdatePageDetails(message.data, sendResponse);
        break;
      case 'getUserStats':
        await handleGetUserStats(sendResponse);
        break;
      case 'exportData':
        await handleExportData(sendResponse);
        break;
      case 'importData':
        handleImportData(message.data, sendResponse);
        break;
      case 'updateTag':
        handleUpdateTag(message.data, sendResponse);
        break;
      case 'deleteTag':
        handleDeleteTag(message.data, sendResponse);
        break;
      case 'getAllTagUsageCounts':
        await handleGetAllTagUsageCounts(sendResponse);
        break;
      default:
        sendResponse({ success: false, error: '未知操作' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Background: 处理器执行失败 (可能由于初始化失败):', errorMessage);
    sendResponse({ success: false, error: `Background 处理器失败: ${errorMessage}` });
  }
};

/**
 * Chrome Extension 消息处理器（包装器）
 * 触发异步处理，不等待，保持 channel 开放
 */
export const messageHandler = (
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void,
): boolean => {
  // 触发异步处理，不等待
  handleMessageAsync(message, sender, sendResponse);
  return true; // 保持 channel 开放
};

async function handleGetTabInfo(
  tabId: number | undefined,
  sendResponse: (response: any) => void,
): Promise<void> {
  try {
    if (!tabId) {
      throw new Error('无法获取标签页ID');
    }

    const tab = await chrome.tabs.get(tabId);
    sendResponse({
      success: true,
      data: {
        title: tab.title,
        url: tab.url,
        id: tab.id,
      },
    });
  } catch (error) {
    console.error('获取标签页信息失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取标签页信息失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleChangePageColor(
  tabId: number | undefined,
  sendResponse: (response: any) => void,
): Promise<void> {
  try {
    if (!tabId) {
      sendResponse({ success: false, error: '无法获取标签页ID' });
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.body.style.filter = 'hue-rotate(180deg)';
      },
    });

    sendResponse({ success: true, message: '页面颜色已改变' });
  } catch (error) {
    console.error('改变页面颜色失败:', error);
    const errorMessage = error instanceof Error ? error.message : '改变页面颜色失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleShowNotification(sendResponse: (response: any) => void): Promise<void> {
  try {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Edge Extension',
        message: '这是一个来自插件的通知！',
      });
      sendResponse({ success: true, message: '通知已发送' });
    } else {
      sendResponse({ success: false, error: '通知功能不可用' });
    }
  } catch (error) {
    console.error('显示通知失败:', error);
    const errorMessage = error instanceof Error ? error.message : '显示通知失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleGetCurrentPage(sendResponse: (response: any) => void): Promise<void> {
  console.log('[handleGetCurrentPage] 开始处理请求 (使用 chrome.tabs.query)');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || tabs.length === 0) {
      console.error('[handleGetCurrentPage] 没有找到活动标签页');
      throw new Error('无法获取当前标签页');
    }

    const tab = tabs[0];
    console.log('[handleGetCurrentPage] 活动标签页 URL (来自 query):', tab.url);

    if (!tab || !tab.id || !tab.url || tab.url.startsWith('about:')) {
      console.error('[handleGetCurrentPage] 无效的标签页信息 (URL 为空或 about:blank)');
      throw new Error('无法在当前页面上操作 (页面尚未加载完成)');
    }

    let resolvedUrl = tab.url;
    const pageSettings = await getPageSettings();
    const syncVideoTimestamp = pageSettings.syncVideoTimestamp;

    if (syncVideoTimestamp) {
      try {
        // 向所有 Frame 广播检测请求，使用 allFrames: true 遍历所有 frame
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true }, // 关键：遍历所有 Frame
          func: () => {
            // 这里复用 content.ts 的 detectBestVideo 逻辑的简化版
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
        // 我们取最大的那个时间戳，或者按照优先级取
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

    console.log('[handleGetCurrentPage] 准备更新页面数据');

    let domain: string;
    try {
      domain = new URL(resolvedUrl).hostname;
    } catch (error) {
      const protocolMatch = resolvedUrl.match(/^([a-z]+):\/\//);
      domain = protocolMatch ? `${protocolMatch[1]}-page` : 'internal-page';
    }

    // [架构修复核心点]
    // 1. 先尝试通过 URL 获取已存在的页面数据
    const existingPage = tagManager.getPageByUrl(resolvedUrl);
    
    // 2. 决策标题策略：
    // - 如果页面已存在：使用数据库中的标题 (existingPage.title)。这意味着用户可能编辑过它，或者是刚刚保存的新标题。
    // - 如果页面不存在：使用浏览器 Tab 的标题 (tab.title) 作为初始值。
    const titleToUse = existingPage ? existingPage.title : (tab.title || '无标题');

    // 3. 调用 createOrUpdatePage
    // 注意：这里我们传入的是 titleToUse，从而保护了可能存在的自定义标题不被覆盖
    // 同时，createOrUpdatePage 依然会更新 updatedAt, favicon 等其他我们希望更新的字段
    const page = tagManager.createOrUpdatePage(
      resolvedUrl,
      titleToUse, 
      domain,
      tab.favIconUrl,
    );

    // 4. 提交事务（确保数据已保存）
    await tagManager.commit();

    // [修改] 异步触发同步，不等待
    if (page.createdAt === page.updatedAt) {
      triggerBackgroundSync(syncService.markPageChange('create', page.id, page));
    } else {
      triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
    }

    console.log('[handleGetCurrentPage] 成功获取页面，准备发送响应');
    sendResponse({ success: true, data: page });
    console.log('[handleGetCurrentPage] 响应已发送');
  } catch (error) {
    console.error('[handleGetCurrentPage] 发生错误:', error);
    const errorMessage = error instanceof Error ? error.message : '获取当前页面失败';
    console.error('[handleGetCurrentPage] 发送错误响应:', errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

// 未使用的函数，保留以备将来使用
// @ts-expect-error - 保留以备将来使用
function _detectVideoTimestamp(): number {
  try {
    const videos = document.querySelectorAll('video');

    for (const video of Array.from(videos)) {
      if (video.readyState >= 1) {
        const currentTime = video.currentTime;
        if (!isNaN(currentTime) && currentTime >= 0) {
          return Math.floor(currentTime);
        }
      }
    }

    if ((window as any).player?.getCurrentTime) {
      const time = (window as any).player.getCurrentTime();
      if (typeof time === 'number' && !isNaN(time) && time >= 0) {
        return Math.floor(time);
      }
    }

    if ((window as any).yt?.player?.getCurrentTime) {
      const time = (window as any).yt.player.getCurrentTime();
      if (typeof time === 'number' && !isNaN(time) && time >= 0) {
        return Math.floor(time);
      }
    }

    return 0;
  } catch (error) {
    console.warn('检测视频时间戳时出错:', error);
    return 0;
  }
}

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

async function handleGetAllTags(sendResponse: (response: any) => void): Promise<void> {
  try {
    const tags = tagManager.getAllTags();
    sendResponse({ success: true, data: tags });
  } catch (error) {
    console.error('获取所有标签失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取所有标签失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleGetAllTaggedPages(sendResponse: (response: any) => void): Promise<void> {
  try {
    const pages = tagManager.getTaggedPages();
    sendResponse({ success: true, data: pages });
  } catch (error) {
    console.error('获取所有标签页失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取所有标签页失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

// 1. 创建标签
const handleCreateTag = withTransaction((data) => {
  if (!data?.name) {
    throw new Error('标签名称不能为空');
  }

  const tag = tagManager.createTag(data.name, data.description, data.color);
  
  // 触发后台同步（在事务提交后，由 withTransaction 的副作用阶段处理）
  // 但为了保持现有逻辑，我们在这里也触发（fire-and-forget）
  triggerBackgroundSync(syncService.markTagChange('create', tag.id, tag));
  
  return tag;
});

// 2. 添加标签到页面
const handleAddTagToPage = withTransaction((data) => {
  if (!data?.pageId || !data?.tagId) {
    throw new Error('页面ID和标签ID不能为空');
  }

  const success = tagManager.addTagToPage(data.pageId, data.tagId);
  if (!success) {
    throw new Error('添加标签到页面失败');
  }

  const page = tagManager.getPageById(data.pageId);
  if (page) {
    triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
  }
  
  return { success: true };
});

// 3. 创建标签并添加到页面
const handleCreateTagAndAddToPage = withTransaction((data) => {
  if (!data?.tagName || !data?.pageId) {
    throw new Error('标签名称和页面ID不能为空');
  }

  const tag = tagManager.createTagAndAddToPage(data.tagName, data.pageId);
  
  triggerBackgroundSync(syncService.markTagChange('create', tag.id, tag));
  const page = tagManager.getPageById(data.pageId);
  if (page) {
    triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
  }
  
  return tag;
});

// 4. 从页面移除标签
const handleRemoveTagFromPage = withTransaction((data) => {
  if (!data?.pageId || !data?.tagId) {
    throw new Error('页面ID和标签ID不能为空');
  }

  const success = tagManager.removeTagFromPage(data.pageId, data.tagId);
  if (!success) {
    throw new Error('从页面移除标签失败');
  }

  const page = tagManager.getPageById(data.pageId);
  if (page) {
    triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
  }
  
  return { success: true };
});

interface UpdatePageTagsPayload {
  pageId: string;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
}

interface UpdatePageDetailsPayload {
  pageId: string;
  title: string;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
}

// 5. 批量更新页面标签
const handleUpdatePageTags = withTransaction((data: UpdatePageTagsPayload) => {
  if (!data?.pageId) {
    throw new Error('页面ID不能为空');
  }

  const tagsToAdd = Array.isArray(data.tagsToAdd) ? data.tagsToAdd : [];
  const tagsToRemove = Array.isArray(data.tagsToRemove) ? data.tagsToRemove : [];

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

  const page = tagManager.getPageById(data.pageId);
  if (!page) {
    throw new Error('页面不存在');
  }

  normalizedTagsToAdd.forEach(tagName => {
    tagManager.createTagAndAddToPage(tagName, data.pageId);
  });

  normalizedTagsToRemove.forEach(tagIdentifier => {
    const existingById = tagManager.getTagById(tagIdentifier);
    if (existingById) {
      tagManager.removeTagFromPage(data.pageId, existingById.id);
      return;
    }

    const existingByName = tagManager.findTagByName(tagIdentifier);
    if (existingByName) {
      tagManager.removeTagFromPage(data.pageId, existingByName.id);
    }
  });

  const updatedPage = tagManager.getPageById(data.pageId);
  if (!updatedPage) {
    throw new Error('更新页面失败');
  }

  triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));

  const stats = tagManager.getUserStats();

  return {
    newPage: updatedPage,
    newStats: stats,
  };
});

// 6. 更新页面标题
const handleUpdatePageTitle = withTransaction((data) => {
  if (!data?.pageId || !data?.title) {
    throw new Error('页面ID和标题不能为空');
  }

  const success = tagManager.updatePageTitle(data.pageId, data.title);
  if (!success) {
    throw new Error('更新页面标题失败');
  }

  const page = tagManager.getPageById(data.pageId);
  if (page) {
    triggerBackgroundSync(syncService.markPageChange('update', page.id, page));
  }
  
  return { success: true };
});

// 7. 更新页面详情
const handleUpdatePageDetails = withTransaction((data: UpdatePageDetailsPayload) => {
  const { pageId, title, tagsToAdd = [], tagsToRemove = [] } = data ?? {};

  if (!pageId) {
    throw new Error('页面ID不能为空');
  }

  const page = tagManager.getPageById(pageId);
  if (!page) {
    throw new Error('页面不存在');
  }

  let titleUpdated = false;
  let tagsUpdated = false;

  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  if (normalizedTitle && normalizedTitle !== page.title) {
    const success = tagManager.updatePageTitle(pageId, normalizedTitle);
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
      tagManager.createTagAndAddToPage(tagName, pageId);
    });

    normalizedTagsToRemove.forEach(tagIdentifier => {
      const existingById = tagManager.getTagById(tagIdentifier);
      if (existingById) {
        tagManager.removeTagFromPage(pageId, existingById.id);
        return;
      }

      const existingByName = tagManager.findTagByName(tagIdentifier);
      if (existingByName) {
        tagManager.removeTagFromPage(pageId, existingByName.id);
      }
    });

    tagsUpdated = true;
  }

  if (titleUpdated || tagsUpdated) {
    const updatedPage = tagManager.getPageById(pageId);
    if (updatedPage) {
      triggerBackgroundSync(syncService.markPageChange('update', updatedPage.id, updatedPage));
    }
  }

  return { success: true };
});

async function handleGetUserStats(sendResponse: (response: any) => void): Promise<void> {
  try {
    const stats = tagManager.getUserStats();
    sendResponse({ success: true, data: stats });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取用户统计失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleExportData(sendResponse: (response: any) => void): Promise<void> {
  try {
    const jsonData = tagManager.exportData();
    sendResponse({ success: true, data: jsonData });
  } catch (error) {
    console.error('导出数据失败:', error);
    const errorMessage = error instanceof Error ? error.message : '导出数据失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

// 8. 批量导入
const handleImportData = withTransaction(async (data: { jsonData: string; mergeMode: boolean }) => {
  if (!data || typeof data.jsonData !== 'string') {
    throw new Error('无效的导入数据');
  }

  // 即使内部循环创建了1000个标签，commit() 只会在最后执行一次
  const result = await tagManager.importData(data.jsonData, data.mergeMode);

  if (!result.success) {
    throw new Error(result.error || '导入数据失败');
  }

  return result.imported;
});

// 9. 更新标签
const handleUpdateTag = withTransaction((data: { tagId: string; newName: string }) => {
  if (!data?.tagId || !data?.newName) {
    throw new Error('标签ID和新名称不能为空');
  }

  const result = tagManager.updateTagName(data.tagId, data.newName);

  if (!result.success) {
    throw new Error(result.error || '更新标签失败');
  }

  const tag = tagManager.getTagById(data.tagId);
  if (tag) {
    triggerBackgroundSync(syncService.markTagChange('update', tag.id, tag));
  }
  
  return { success: true };
});

// 10. 删除标签
const handleDeleteTag = withTransaction((data: { tagId: string }) => {
  if (!data?.tagId) {
    throw new Error('标签ID不能为空');
  }

  const success = tagManager.deleteTag(data.tagId);

  if (!success) {
    throw new Error('删除标签失败（可能标签不存在）');
  }

  triggerBackgroundSync(syncService.markTagChange('delete', data.tagId));
  
  return { success: true };
});

// [新增]
async function handleGetAllTagUsageCounts(
  sendResponse: (response: any) => void,
): Promise<void> {
  try {
    const counts = tagManager.getAllTagUsageCounts();
    sendResponse({ success: true, data: counts });
  } catch (error) {
    console.error('获取标签使用计数失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取标签使用计数失败';
    sendResponse({ success: false, error: errorMessage });
  }
}


