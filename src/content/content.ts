// Content Script
// 在网页中注入的脚本，可以访问和修改页面内容


// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    
    // 用于标记是否需要异步响应
    let isAsync = false;
    
    switch (message.action) {
        case 'getPageInfo':
            handleGetPageInfo(sendResponse);
            isAsync = true; // 标记为异步
            break;
            
        case 'highlightText':
            handleHighlightText(message.text, sendResponse);
            isAsync = true; // 标记为异步
            break;
            
        case 'addCustomStyle':
            handleAddCustomStyle(message.css, sendResponse);
            isAsync = true; // 标记为异步
            break;
            
        default:
            // ** 关键修复 **
            // 消息不是发给我的，忽略它。
            // 不要调用 sendResponse()，也不要返回 true。
            // 这允许 background.ts 有机会处理这个消息。
            isAsync = false;
            break;
    }
    
    // 只有当我们明确处理了某个 case 并需要异步响应时，才返回 true。
    return isAsync;
});

// 获取页面信息
function handleGetPageInfo(sendResponse: (response: any) => void) {
    const pageInfo = {
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname,
        wordCount: document.body.innerText.split(/\s+/).length,
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
        
        while (node = walker.nextNode()) {
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

function initializeContentScript() {
    
    // 添加页面标识
    document.body.setAttribute('data-edge-extension', 'loaded');
    
    // 监听页面变化（用于SPA应用）
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
