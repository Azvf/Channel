// Background Service Worker
// 在Manifest V3中，background script变成了service worker

import { TagManager } from '../services/tagManager';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../types/pageSettings';

// 初始化 TagManager
const tagManager = TagManager.getInstance();

/**
 * 获取页面设置（与 appInitService 保持一致的逻辑）
 * 确保初始化方式和验证逻辑完全一致
 */
async function getPageSettings(): Promise<PageSettings> {
    const pageSettings = await storageService.get<PageSettings>(STORAGE_KEYS.PAGE_SETTINGS);
    return {
        syncVideoTimestamp: typeof pageSettings?.syncVideoTimestamp === 'boolean' 
            ? pageSettings.syncVideoTimestamp 
            : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
    };
}

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(async (_details) => {
    // 初始化 TagManager
    await tagManager.initialize();
    
    // 设置默认配置
    await syncStorageService.setMultiple({
        [STORAGE_KEYS.EXTENSION_ENABLED]: true,
        [STORAGE_KEYS.THEME]: 'default',
        [STORAGE_KEYS.LAST_USED]: Date.now()
    });
});

// 插件启动时的初始化（MV3 service worker）
(async () => {
    await tagManager.initialize();
})();

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    switch (message.action) {
        case 'getTabInfo':
            handleGetTabInfo(sender.tab?.id, sendResponse);
            return true; // 保持消息通道开放以进行异步响应
            
        case 'changePageColor':
            handleChangePageColor(sender.tab?.id, sendResponse);
            return true;
            
        case 'showNotification':
            handleShowNotification(sendResponse);
            return true;
        
        // TagManager 相关消息
        case 'getCurrentPage':
            handleGetCurrentPage(sendResponse);
            return true;
            
        case 'getAllTags':
            handleGetAllTags(sendResponse);
            return true;
            
        case 'getAllTaggedPages':
            handleGetAllTaggedPages(sendResponse);
            return true;
            
        case 'createTag':
            handleCreateTag(message.data, sendResponse);
            return true;
            
        case 'addTagToPage':
            handleAddTagToPage(message.data, sendResponse);
            return true;
            
        case 'createTagAndAddToPage':
            handleCreateTagAndAddToPage(message.data, sendResponse);
            return true;
            
        case 'removeTagFromPage':
            handleRemoveTagFromPage(message.data, sendResponse);
            return true;
            
        case 'updatePageTitle':
            handleUpdatePageTitle(message.data, sendResponse);
            return true;
            
        default:
            sendResponse({ error: '未知操作' });
    }
});

// 处理获取标签页信息
async function handleGetTabInfo(tabId: number | undefined, sendResponse: (response: any) => void) {
    try {
        if (!tabId) {
            sendResponse({ error: '无法获取标签页ID' });
            return;
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

// 处理改变页面颜色
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

// 处理显示通知
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

// TagManager 相关处理函数
async function handleGetCurrentPage(sendResponse: (response: any) => void) {
    try {
        // 确保 TagManager 已初始化
        await tagManager.initialize();
        
        // 获取当前标签页信息
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0].id || !tabs[0].url) {
            const page = await tagManager.getCurrentTabAndRegisterPage();
            sendResponse({ success: true, data: page });
            return;
        }
        
        const tab = tabs[0];
        const tabId = tab.id;
        const tabUrl = tab.url;
        
        if (!tabId || !tabUrl) {
            const page = await tagManager.getCurrentTabAndRegisterPage();
            sendResponse({ success: true, data: page });
            return;
        }
        
        let resolvedUrl = tabUrl;
        
        // 检查是否启用了视频时间戳同步（使用统一的初始化方式）
        const pageSettings = await getPageSettings();
        const syncVideoTimestamp = pageSettings.syncVideoTimestamp;
        
        if (syncVideoTimestamp) {
            try {
                // 在页面中检测视频控件并获取时间戳
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: detectVideoTimestamp
                });
                
                if (results && results.length > 0 && results[0].result) {
                    const timestamp = results[0].result as number;
                    if (timestamp > 0) {
                        // 将时间戳添加到 URL 中
                        resolvedUrl = addTimestampToUrl(tabUrl, timestamp);
                    }
                }
            } catch (error) {
                // 如果执行脚本失败（可能是权限问题），忽略错误，继续使用原始 URL
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