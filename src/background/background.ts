// src/background/background.ts

// Background Service Worker
// 在Manifest V3中，background script变成了service worker

import { messageHandler, onInstalledHandler } from './messageHandler';

chrome.runtime.onInstalled.addListener(onInstalledHandler);
chrome.runtime.onMessage.addListener(messageHandler);

// 监听标签页更新
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // TODO: 处理标签页更新逻辑
    }
});

// 监听存储变化
chrome.storage.onChanged.addListener((_changes, _namespace) => {
    // TODO: 处理存储变化逻辑
});

