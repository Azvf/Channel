// src/background/background.ts

// Background Service Worker
// 在Manifest V3中，background script变成了service worker

// 错误处理：捕获顶层错误，防止 Service Worker 启动失败
self.addEventListener('error', (event) => {
  console.error('[Background] 全局错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Background] 未处理的 Promise 拒绝:', event.reason);
});

import { onInstalledHandler, getInitializationPromise } from './init';
import { syncService } from '../services/syncService';
import { registerRpcHandler } from '../shared/rpc-protocol/server';
import { BackgroundServiceImpl } from '../services/background/BackgroundServiceImpl';

// 注册插件安装监听器
try {
  chrome.runtime.onInstalled.addListener(onInstalledHandler);
} catch (error) {
  console.error('[Background] 注册 onInstalled 监听器失败:', error);
}

// 注册 RPC 处理器（新的架构）
// 所有前端调用已切换到 RPC 客户端，旧的消息处理器已移除
try {
  const backgroundService = new BackgroundServiceImpl();
  registerRpcHandler(backgroundService);
  console.log('[Background] Service Worker 启动成功，RPC 处理器已注册');
} catch (error) {
  console.error('[Background] Service Worker 启动错误:', error);
  // 即使 RPC 注册失败，也不要让整个 Service Worker 崩溃
}

// 监听标签页更新
try {
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      // TODO: 处理标签页更新逻辑
    }
  });
} catch (error) {
  console.error('[Background] 注册 tabs.onUpdated 监听器失败:', error);
}

// 监听存储变化
try {
  chrome.storage.onChanged.addListener((_changes, _namespace) => {
    // TODO: 处理存储变化逻辑
  });
} catch (error) {
  console.error('[Background] 注册 storage.onChanged 监听器失败:', error);
}

// ============================================
// 【兜底机制】Alarms API - 系统的"心跳起搏器"
// ============================================
// 再优雅的代码也怕断电。保留 Alarms API 作为系统的"心跳起搏器"，是架构师的底线思维。

// 安全检查：确保 chrome.alarms API 可用
try {
  if (chrome.alarms) {
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
    
    console.log('[Background] 心跳闹钟已设置');
  } else {
    console.warn('[Background] chrome.alarms API 不可用，请检查 manifest.json 是否包含 "alarms" 权限');
  }
} catch (error) {
  console.error('[Background] 设置 Alarms API 失败:', error);
  // 即使 Alarms 设置失败，也不要让整个 Service Worker 崩溃
}
