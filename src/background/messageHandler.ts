import { TagManager } from '../services/tagManager';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../types/pageSettings';
import { TagsCollection, PageCollection } from '../types/gameplayTag';

const tagManager = TagManager.getInstance();
let currentPageSettings: PageSettings = DEFAULT_PAGE_SETTINGS;
let initPromise: Promise<void> | null = null;

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

      console.log('Background: 初始化完成。');
    } catch (error) {
      console.error('Background: 初始化失败:', error);
      initPromise = null;
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

export const messageHandler: chrome.runtime.MessageListener = (message, sender, sendResponse) => {
  (async () => {
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
          await handleCreateTag(message.data, sendResponse);
          break;
        case 'addTagToPage':
          await handleAddTagToPage(message.data, sendResponse);
          break;
        case 'createTagAndAddToPage':
          await handleCreateTagAndAddToPage(message.data, sendResponse);
          break;
        case 'removeTagFromPage':
          await handleRemoveTagFromPage(message.data, sendResponse);
          break;
        case 'updatePageTitle':
          await handleUpdatePageTitle(message.data, sendResponse);
          break;
        case 'getUserStats':
          await handleGetUserStats(sendResponse);
          break;
        default:
          sendResponse({ success: false, error: '未知操作' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Background: 处理器执行失败 (可能由于初始化失败):', errorMessage);
      sendResponse({ success: false, error: `Background 处理器失败: ${errorMessage}` });
    }
  })();

  return true;
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
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: detectVideoTimestamp,
        });
        if (results && results.length > 0 && results[0].result) {
          const timestamp = results[0].result as number;
          if (timestamp > 0) {
            resolvedUrl = addTimestampToUrl(tab.url, timestamp);
          }
        }
      } catch (error) {
        console.warn('检测视频时间戳失败 (可能为内部页面):', error);
      }
    }

    console.log('[handleGetCurrentPage] 准备调用 tagManager.createOrUpdatePage');

    let domain: string;
    try {
      domain = new URL(resolvedUrl).hostname;
    } catch (error) {
      const protocolMatch = resolvedUrl.match(/^([a-z]+):\/\//);
      domain = protocolMatch ? `${protocolMatch[1]}-page` : 'internal-page';
    }

    const page = tagManager.createOrUpdatePage(
      resolvedUrl,
      tab.title || '无标题',
      domain,
      tab.favIconUrl,
    );

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

function detectVideoTimestamp(): number {
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

async function handleCreateTag(data: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    if (!data?.name) {
      sendResponse({ success: false, error: '标签名称不能为空' });
      return;
    }

    const tag = tagManager.createTag(data.name, data.description, data.color);
    await tagManager.syncToStorage();
    sendResponse({ success: true, data: tag });
  } catch (error) {
    console.error('创建标签失败:', error);
    const errorMessage = error instanceof Error ? error.message : '创建标签失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleAddTagToPage(data: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    if (!data?.pageId || !data?.tagId) {
      sendResponse({ success: false, error: '页面ID和标签ID不能为空' });
      return;
    }

    const success = tagManager.addTagToPage(data.pageId, data.tagId);
    if (success) {
      await tagManager.syncToStorage();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: '添加标签到页面失败' });
    }
  } catch (error) {
    console.error('添加标签到页面失败:', error);
    const errorMessage = error instanceof Error ? error.message : '添加标签到页面失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleCreateTagAndAddToPage(data: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    if (!data?.tagName || !data?.pageId) {
      sendResponse({ success: false, error: '标签名称和页面ID不能为空' });
      return;
    }

    const tag = tagManager.createTagAndAddToPage(data.tagName, data.pageId);
    await tagManager.syncToStorage();
    sendResponse({ success: true, data: tag });
  } catch (error) {
    console.error('创建标签并添加到页面失败:', error);
    const errorMessage = error instanceof Error ? error.message : '创建标签并添加到页面失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleRemoveTagFromPage(data: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    if (!data?.pageId || !data?.tagId) {
      sendResponse({ success: false, error: '页面ID和标签ID不能为空' });
      return;
    }

    const success = tagManager.removeTagFromPage(data.pageId, data.tagId);
    if (success) {
      await tagManager.syncToStorage();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: '从页面移除标签失败' });
    }
  } catch (error) {
    console.error('从页面移除标签失败:', error);
    const errorMessage = error instanceof Error ? error.message : '从页面移除标签失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleUpdatePageTitle(data: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    if (!data?.pageId || !data?.title) {
      sendResponse({ success: false, error: '页面ID和标题不能为空' });
      return;
    }

    const success = tagManager.updatePageTitle(data.pageId, data.title);
    if (success) {
      await tagManager.syncToStorage();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: '更新页面标题失败' });
    }
  } catch (error) {
    console.error('更新页面标题失败:', error);
    const errorMessage = error instanceof Error ? error.message : '更新页面标题失败';
    sendResponse({ success: false, error: errorMessage });
  }
}

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


