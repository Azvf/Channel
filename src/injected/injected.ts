// Injected Script
// 在页面上下文中直接执行的脚本，可以访问页面的全局变量

console.log('Edge Extension Injected Script 已加载');

// 创建一个全局对象来与content script通信
(window as any).edgeExtension = {
    version: '1.0.0',
    
    // 获取页面信息
    getPageInfo() {
        return {
            title: document.title,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            scrollPosition: {
                x: window.scrollX,
                y: window.scrollY
            },
            timestamp: Date.now()
        };
    },
    
    // 高亮所有链接
    highlightLinks() {
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            (link as HTMLElement).style.border = '2px solid red';
            (link as HTMLElement).style.backgroundColor = 'yellow';
        });
        return `已高亮 ${links.length} 个链接`;
    },
    
    // 添加页面水印
    addWatermark(text: string) {
        const watermark = document.createElement('div');
        watermark.textContent = text || 'Edge Extension';
        watermark.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(0, 0, 0, 0.1);
            pointer-events: none;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(watermark);
        return '水印已添加';
    },
    
    // 移除水印
    removeWatermark() {
        const watermarks = document.querySelectorAll('[data-edge-watermark]');
        watermarks.forEach(watermark => watermark.remove());
        return '水印已移除';
    },
    
    // 获取所有图片信息
    getImagesInfo() {
        const images = Array.from(document.images);
        return images.map(img => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
        }));
    },
    
    // 修改页面标题
    changeTitle(newTitle: string) {
        const originalTitle = document.title;
        document.title = newTitle || 'Edge Extension Modified';
        return `标题已从 "${originalTitle}" 改为 "${document.title}"`;
    },
    
    // 添加自定义CSS
    addCustomCSS(css: string) {
        const style = document.createElement('style');
        style.textContent = css;
        style.setAttribute('data-edge-extension', 'custom-css');
        document.head.appendChild(style);
        return '自定义CSS已添加';
    }
};

// 监听来自content script的消息
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'EDGE_EXTENSION_INJECTED') {
        const { action, data } = event.data;
        
        switch (action) {
            case 'getPageInfo':
                event.source.postMessage({
                    type: 'EDGE_EXTENSION_RESPONSE',
                    action: 'getPageInfo',
                    data: (window as any).edgeExtension.getPageInfo()
                }, '*');
                break;
                
            case 'highlightLinks':
                event.source.postMessage({
                    type: 'EDGE_EXTENSION_RESPONSE',
                    action: 'highlightLinks',
                    data: (window as any).edgeExtension.highlightLinks()
                }, '*');
                break;
                
            case 'addWatermark':
                event.source.postMessage({
                    type: 'EDGE_EXTENSION_RESPONSE',
                    action: 'addWatermark',
                    data: (window as any).edgeExtension.addWatermark(data)
                }, '*');
                break;
        }
    }
});

console.log('Edge Extension Injected Script 初始化完成');
