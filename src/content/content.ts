// Content Script
// 在网页中注入的脚本，可以访问和修改页面内容


// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.action) {
        case 'getPageInfo':
            handleGetPageInfo(sendResponse);
            return true; // 标记为异步
            
        case 'highlightText':
            handleHighlightText(message.text, sendResponse);
            return true; // 标记为异步
            
        case 'addCustomStyle':
            handleAddCustomStyle(message.css, sendResponse);
            return true; // 标记为异步
            
        case 'GET_VIDEO_TIMESTAMP':
            const status = detectBestVideo();
            sendResponse(status);
            return true; // 标记为异步
            
        default:
            // ** 修复：消息不是发给我的，忽略它 **
            // 通过不返回任何值（返回 undefined）来表明不处理此消息
            // 这允许 background.ts 有机会处理这个消息
            break;
    }
    
    // 如果没有匹配到任何 case，函数默认返回 undefined
    // 这是正确的行为，表示消息未被此监听器处理
});

// 获取页面信息
function handleGetPageInfo(sendResponse: (response: any) => void) {
    const bodyElement = document.body;
    const rawText = bodyElement?.innerText ?? bodyElement?.textContent ?? '';
    const normalizedText = typeof rawText === 'string' ? rawText.trim() : '';
    const wordCount =
        normalizedText.length > 0 ? normalizedText.split(/\s+/).length : 0;

    const pageInfo = {
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname,
        wordCount,
        imageCount: document.images.length,
        linkCount: document.links.length,
        timestamp: Date.now()
    };
    
    sendResponse({ success: true, data: pageInfo });
}

// 高亮文本
function handleHighlightText(text: string, sendResponse: (response: any) => void) {
    try {
        if (!text) {
            sendResponse({ error: '未提供要高亮的文本' });
            return;
        }
        
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let node;
        let found = false;
        
        while ((node = walker.nextNode()) !== null) {
            if (node.textContent?.includes(text)) {
                const parent = node.parentElement;
                if (parent) {
                    const highlightedText = node.textContent.replace(
                        new RegExp(text, 'gi'),
                        `<mark style="background-color: yellow; padding: 2px;">${text}</mark>`
                    );
                    parent.innerHTML = parent.innerHTML.replace(node.textContent, highlightedText);
                    found = true;
                }
            }
        }
        
        sendResponse({ 
            success: true, 
            message: found ? `已高亮文本: ${text}` : `未找到文本: ${text}` 
        });
    } catch (error) {
        console.error('高亮文本失败:', error);
        sendResponse({ error: '高亮文本失败' });
    }
}

// 添加自定义样式
function handleAddCustomStyle(css: string, sendResponse: (response: any) => void) {
    try {
        if (!css) {
            sendResponse({ error: '未提供CSS样式' });
            return;
        }
        
        const styleId = 'edge-extension-custom-style';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement;
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = css;
        
        sendResponse({ success: true, message: '自定义样式已应用' });
    } catch (error) {
        console.error('添加自定义样式失败:', error);
        sendResponse({ error: '添加自定义样式失败' });
    }
}

// 页面加载完成后的初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

interface VideoStatus {
    hasVideo: boolean;
    currentTime: number;
    isPlaying: boolean;
    duration: number;
    area: number; // 视频面积，用于判断是否为主视频
}

/**
 * 启发式算法：找到"用户正在看的主视频"
 * 通过面积、播放状态、时间进度等指标进行评分
 */
function detectBestVideo(): VideoStatus | null {
    const videos = document.querySelectorAll('video');
    if (videos.length === 0) return null;

    let bestVideo: HTMLVideoElement | null = null;
    let maxScore = -1;

    videos.forEach((video) => {
        // 启发式评分算法：
        // 1. 面积越大，权重越高 (排除角落的小广告视频)
        // 2. 正在播放，权重极高
        // 3. 有时间进度，权重高
        
        const rect = video.getBoundingClientRect();
        const area = rect.width * rect.height;
        
        // 排除不可见视频 (width/height ~ 0)
        if (area < 100) return; 

        let score = area;
        if (!video.paused) score *= 2; // 正在播放的优先级最高
        if (video.currentTime > 0) score *= 1.5; // 有进度的优先级高

        if (score > maxScore) {
            maxScore = score;
            bestVideo = video;
        }
    });

    if (bestVideo === null) return null;

    const video = bestVideo as HTMLVideoElement;
    return {
        hasVideo: true,
        currentTime: video.currentTime,
        isPlaying: !video.paused,
        duration: video.duration,
        area: maxScore // 简化处理，用分数代表权重
    };
}

function initializeContentScript() {
    
    // 添加页面标识
    document.body.setAttribute('data-edge-extension', 'loaded');
    
    // 监听页面变化（用于SPA应用）
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // TODO: 处理子节点变化逻辑
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
