// src/background/init.ts
// Background Service Worker 初始化逻辑

import { GameplayStore } from '../services/gameplayStore';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { syncService } from '../services/syncService';
import { TagsCollection, PageCollection } from '../types/gameplayTag';

const gameplayStore = GameplayStore.getInstance();
let initPromise: Promise<void> | null = null;

/**
 * 初始化 Background Service Worker
 * 加载数据、初始化 TagManager 和 SyncService
 */
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

      gameplayStore.initialize({
        tags: data[STORAGE_KEYS.TAGS] as TagsCollection | null,
        pages: data[STORAGE_KEYS.PAGES] as PageCollection | null,
      });

      // 读取页面设置（保持加载以初始化存储状态）
      void data[STORAGE_KEYS.PAGE_SETTINGS];

      // 初始化同步服务
      await syncService.initialize();

      console.log('Background: 初始化完成。');
    } catch (error) {
      console.error('Background: 初始化失败:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * 处理插件安装事件
 * 设置默认配置
 */
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


/**
 * 重置初始化状态（仅用于测试）
 */
export function resetInitializationForTests(): void {
  initPromise = null;
}
