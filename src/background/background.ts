// Background Service Worker
// 在Manifest V3中，background script变成了service worker

import { TagManager } from '../services/tagManager';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../types/pageSettings';

const tagManager = TagManager.getInstance();
let currentPageSettings: PageSettings = DEFAULT_PAGE_SETTINGS;

// 1. 创建一个单一的、共享的、惰性启动的初始化 Promise
//    我们使用一个 IIFE 来创建一个闭包
const getInitializationPromise = (() => {
    let initPromise: Promise<void> | null = null;
    
    return () => {
        if (initPromise) {
            return initPromise; // 如果已在进行或已完成，返回它
        }
        
        // 启动初始化
        initPromise = (async () => {
            try {
                console.log('Background: 启动初始化...');
                
                // tagManager.initialize() 已经是幂等的，但我们在这里再次确保
                await tagManager.initialize();
                
                const pageSettings = await storageService.get<PageSettings>(STORAGE_KEYS.PAGE_SETTINGS);
                currentPageSettings = {
                    syncVideoTimestamp: typeof pageSettings?.syncVideoTimestamp === 'boolean' 
                        ? pageSettings.syncVideoTimestamp 
                        : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
                };
                console.log('Background: 初始化完成。');
            } catch (e) {
                console.error('Background: 初始化失败:', e);
                initPromise = null; // 失败时允许重试
                throw e; // 抛出错误
            }
        })();
        
        return initPromise;
    };
})();

// 2. getPageSettings 保持同步（它依赖于在初始化时设置的缓存）
async function getPageSettings(): Promise<PageSettings> {
    return currentPageSettings;
}

// 3. onInstalled 逻辑
chrome.runtime.onInstalled.addListener(async (_details) => {
    try {
        // 确保安装时初始化完成
        await getInitializationPromise();
        
        await syncStorageService.setMultiple({
            [STORAGE_KEYS.EXTENSION_ENABLED]: true,
            [STORAGE_KEYS.THEME]: 'default',
            [STORAGE_KEYS.LAST_USED]: Date.now()
        });
        console.log('Background: 插件已安装并设置默认值。');
    } catch (e) {
        console.error('Background: onInstalled 失败:', e);
    }
});

// 4. *** 关键 ***
//    在顶层同步注册 onMessage 监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 5. 使用一个 async IIFE 来处理 Promise，同时同步返回 true
    (async () => {
        try {
            // 6. **在所有操作之前**，等待共享的初始化 Promise 完成
            await getInitializationPromise();

            // 7. 初始化完成后，安全地分发消息
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
                
                // TagManager cases
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
                    
                default:
                    sendResponse({ error: '未知操作' });
            }
        } catch (initError) {
            const errorMessage = initError instanceof Error ? initError.message : String(initError);
            console.error('Background: 处理器执行失败 (可能由于初始化失败):', errorMessage);
            sendResponse({ success: false, error: `Background 处理器失败: ${errorMessage}` });
        }
    })();
    
    // 8. **立即**同步返回 true，以保持消息通道开放
    return true;
});

// --- 9. 所有处理器不再需要调用 initialize() ---

async function handleGetTabInfo(tabId: number | undefined, sendResponse: (response: any) => void) {
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
                id: tab.id
            }
        });
    } catch (error) {
        console.error('获取标签页信息失败:', error);
        sendResponse({ error: '获取标签页信息失败' });
    }
}

async function handleChangePageColor(tabId: number | undefined, sendResponse: (response: any) => void) {
    try {
        if (!tabId) {
            sendResponse({ error: '无法获取标签页ID' });
            return;
        }
        
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                document.body.style.filter = 'hue-rotate(180deg)';
            }
        });
        
        sendResponse({ success: true, message: '页面颜色已改变' });
    } catch (error) {
        console.error('改变页面颜色失败:', error);
        sendResponse({ error: '改变页面颜色失败' });
    }
}

async function handleShowNotification(sendResponse: (response: any) => void) {
    try {
        // 注意：需要在manifest.json中添加notifications权限
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png', // 使用插件图标
                title: 'Edge Extension',
                message: '这是一个来自插件的通知！'
            });
            sendResponse({ success: true, message: '通知已发送' });
        } else {
            sendResponse({ error: '通知功能不可用' });
        }
    } catch (error) {
        console.error('显示通知失败:', error);
        sendResponse({ error: '显示通知失败' });
    }
}

async function handleGetCurrentPage(sendResponse: (response: any) => void) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            throw new Error('无法获取当前标签页');
        }

        const tab = tabs[0];
        if (!tab || !tab.id || !tab.url) {
            throw new Error('无效的标签页');
        }
        
        let resolvedUrl = tab.url;
        const pageSettings = await getPageSettings(); // (现在从缓存读取，很快)
        const syncVideoTimestamp = pageSettings.syncVideoTimestamp;

        if (syncVideoTimestamp) {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: detectVideoTimestamp
                });
                if (results && results.length > 0 && results[0].result) {
                    const timestamp = results[0].result as number;
                    if (timestamp > 0) {
                        resolvedUrl = addTimestampToUrl(tab.url, timestamp);
                    }
                }
            } catch (error) {
                console.warn('检测视频时间戳失败:', error);
            }
        }
        
        const page = await tagManager.getCurrentTabAndRegisterPage(resolvedUrl);
        sendResponse({ success: true, data: page });
    } catch (error) {
        console.error('获取当前页面失败:', error);
        const errorMessage = error instanceof Error ? error.message : '获取当前页面失败';
        sendResponse({ success: false, error: errorMessage });
    }
}

/**
 * 在页面上下文中执行的函数：检测视频控件并返回当前播放时间戳
 * 返回 0 表示未检测到视频或视频未播放
 */
function detectVideoTimestamp(): number {
    try {
        // 查找所有视频元素
        const videos = document.querySelectorAll('video');
        
        // 遍历所有视频元素，找到第一个正在播放或已加载的视频
        for (const video of Array.from(videos)) {
            // 检查视频是否已加载元数据且可获取时间戳
            if (video.readyState >= 1) { // HAVE_METADATA
                const currentTime = video.currentTime;
                // 如果视频有播放时间且不是 NaN，返回时间戳
                if (!isNaN(currentTime) && currentTime >= 0) {
                    return Math.floor(currentTime); // 返回秒数（整数）
                }
            }
        }
        
        // 如果没有找到，尝试查找常见的视频播放器容器（如 YouTube、Bilibili 等）
        // 这些网站可能使用自定义播放器，但通常会通过全局对象暴露时间戳
        if ((window as any).player?.getCurrentTime) {
            const time = (window as any).player.getCurrentTime();
            if (typeof time === 'number' && !isNaN(time) && time >= 0) {
                return Math.floor(time);
            }
        }
        
        // YouTube 特定的 API
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

/**
 * 将时间戳添加到 URL 的查询参数中
 */
function addTimestampToUrl(url: string, timestamp: number): string {
    try {
        const urlObj = new URL(url);
        // 使用 't' 作为时间戳参数名（常见于视频网站）
        urlObj.searchParams.set('t', timestamp.toString());
        return urlObj.toString();
    } catch (error) {
        console.warn('添加时间戳到 URL 失败:', error);
        return url;
    }
}

async function handleGetAllTags(sendResponse: (response: any) => void) {
    try {
        const tags = tagManager.getAllTags();
        sendResponse({ success: true, data: tags });
    } catch (error) {
        console.error('获取所有标签失败:', error);
        sendResponse({ error: '获取所有标签失败' });
    }
}

async function handleGetAllTaggedPages(sendResponse: (response: any) => void) {
    try {
        const pages = tagManager.getTaggedPages();
        sendResponse({ success: true, data: pages });
    } catch (error) {
        console.error('获取所有标签页失败:', error);
        sendResponse({ error: '获取所有标签页失败' });
    }
}

async function handleCreateTag(data: any, sendResponse: (response: any) => void) {
    try {
        if (!data.name) {
            sendResponse({ error: '标签名称不能为空' });
            return;
        }
        
        const tag = tagManager.createTag(data.name, data.description, data.color);
        await tagManager.syncToStorage();
        sendResponse({ success: true, data: tag });
    } catch (error) {
        console.error('创建标签失败:', error);
        sendResponse({ error: error instanceof Error ? error.message : '创建标签失败' });
    }
}

async function handleAddTagToPage(data: any, sendResponse: (response: any) => void) {
    try {
        if (!data.pageId || !data.tagId) {
            sendResponse({ error: '页面ID和标签ID不能为空' });
            return;
        }
        
        const success = tagManager.addTagToPage(data.pageId, data.tagId);
        if (success) {
            await tagManager.syncToStorage();
            sendResponse({ success: true });
        } else {
            sendResponse({ error: '添加标签到页面失败' });
        }
    } catch (error) {
        console.error('添加标签到页面失败:', error);
        sendResponse({ error: '添加标签到页面失败' });
    }
}

async function handleCreateTagAndAddToPage(data: any, sendResponse: (response: any) => void) {
    try {
        if (!data.tagName || !data.pageId) {
            sendResponse({ error: '标签名称和页面ID不能为空' });
            return;
        }
        
        const tag = tagManager.createTagAndAddToPage(data.tagName, data.pageId);
        await tagManager.syncToStorage();
        sendResponse({ success: true, data: tag });
    } catch (error) {
        console.error('创建标签并添加到页面失败:', error);
        sendResponse({ error: error instanceof Error ? error.message : '创建标签并添加到页面失败' });
    }
}

async function handleRemoveTagFromPage(data: any, sendResponse: (response: any) => void) {
    try {
        if (!data.pageId || !data.tagId) {
            sendResponse({ error: '页面ID和标签ID不能为空' });
            return;
        }
        
        const success = tagManager.removeTagFromPage(data.pageId, data.tagId);
        if (success) {
            await tagManager.syncToStorage();
            sendResponse({ success: true });
        } else {
            sendResponse({ error: '从页面移除标签失败' });
        }
    } catch (error) {
        console.error('从页面移除标签失败:', error);
        sendResponse({ error: '从页面移除标签失败' });
    }
}

async function handleUpdatePageTitle(data: any, sendResponse: (response: any) => void) {
    try {
        if (!data.pageId || !data.title) {
            sendResponse({ error: '页面ID和标题不能为空' });
            return;
        }
        
        const success = tagManager.updatePageTitle(data.pageId, data.title);
        if (success) {
            await tagManager.syncToStorage();
            sendResponse({ success: true });
        } else {
            sendResponse({ error: '更新页面标题失败' });
        }
    } catch (error) {
        console.error('更新页面标题失败:', error);
        sendResponse({ error: '更新页面标题失败' });
    }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
    }
});

// 监听存储变化
chrome.storage.onChanged.addListener((_changes, _namespace) => {
});
