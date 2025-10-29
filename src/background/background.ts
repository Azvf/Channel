// Background Service Worker
// 在Manifest V3中，background script变成了service worker

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Edge Extension 已安装', details);
    
    // 设置默认配置
    chrome.storage.sync.set({
        extensionEnabled: true,
        theme: 'default',
        lastUsed: Date.now()
    });
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background 收到消息:', message);
    
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

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('标签页已加载:', tab.url);
    }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('存储发生变化:', changes, namespace);
});