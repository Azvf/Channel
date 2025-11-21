// src/background/background.ts

// Background Service Worker
// 在Manifest V3中，background script变成了service worker

import { messageHandler, onInstalledHandler, getInitializationPromise } from './messageHandler';
import { syncService } from '../services/syncService';
import { registerRpcHandler } from '../rpc/server';
import { BackgroundServiceImpl } from '../services/background/BackgroundServiceImpl';

chrome.runtime.onInstalled.addListener(onInstalledHandler);

// 注册 RPC 处理器（新的架构）
const backgroundService = new BackgroundServiceImpl();
registerRpcHandler(backgroundService);

// 保留旧的消息处理器以支持向后兼容
// TODO: 前端迁移完成后，可以移除这行
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

// ============================================
// 【兜底机制】Alarms API - 系统的"心跳起搏器"
// ============================================
// 再优雅的代码也怕断电。保留 Alarms API 作为系统的"心跳起搏器"，是架构师的底线思维。

// 设置心跳闹钟（每5分钟检查一次）
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'HEARTBEAT_SYNC_CHECK') {
    try {
      // 确保上下文恢复（如果 SW 刚唤醒，这里会从 Storage 加载数据）
      await getInitializationPromise();
      
      // 检查是否有漏网之鱼（pendingChanges）
      await syncService.syncAll();
      
      console.log('[Background] 心跳同步检查完成');
    } catch (error) {
      console.error('[Background] 心跳同步检查失败:', error);
    }
  }
});

// 创建或更新心跳闹钟
chrome.alarms.create('HEARTBEAT_SYNC_CHECK', {
  periodInMinutes: 5, // 每5分钟执行一次
});

