// src/background/init.ts
// Background Service Worker 初始化逻辑

import { GameplayStore } from '../services/gameplayStore';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { syncService } from '../services/syncService';
import { TagsCollection, PageCollection, TaggedPage } from '../shared/types/gameplayTag';

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

      // 优先使用原子化存储加载页面数据
      let pages: PageCollection = {};
      let tags: TagsCollection | null = null;
      
      try {
        // 尝试从原子化存储加载
        const pageIndex = await storageService.get<string[]>('page_index');
        if (pageIndex && pageIndex.length > 0) {
          const pagePromises = pageIndex.map(async (pageId) => {
            const atomicKey = `page::${pageId}`;
            return await storageService.get<TaggedPage>(atomicKey);
          });
          const loadedPages = (await Promise.all(pagePromises)).filter((page): page is TaggedPage => page !== null);
          
          // 转换为 Collection 格式
          for (const page of loadedPages) {
            pages[page.id] = page;
          }
        }
      } catch (error) {
        console.warn('Background: 从原子化存储加载页面失败，尝试集合存储:', error);
      }
      
      // 如果原子化存储中没有数据，尝试从集合存储加载（向后兼容）
      if (Object.keys(pages).length === 0) {
        const data = await storageService.getMultiple([
          STORAGE_KEYS.TAGS,
          STORAGE_KEYS.PAGES,
          STORAGE_KEYS.PAGE_SETTINGS,
        ]);
        pages = (data[STORAGE_KEYS.PAGES] as PageCollection | null) ?? {};
        tags = (data[STORAGE_KEYS.TAGS] as TagsCollection | null) ?? null;
        // 读取页面设置（保持加载以初始化存储状态）
        void data[STORAGE_KEYS.PAGE_SETTINGS];
      } else {
        // 如果原子化存储有数据，仍然需要加载 TAGS 和 PAGE_SETTINGS
        const data = await storageService.getMultiple([
          STORAGE_KEYS.TAGS,
          STORAGE_KEYS.PAGE_SETTINGS,
        ]);
        tags = (data[STORAGE_KEYS.TAGS] as TagsCollection | null) ?? null;
        // 读取页面设置（保持加载以初始化存储状态）
        void data[STORAGE_KEYS.PAGE_SETTINGS];
      }

      // 如果 tags 还没有加载，单独加载
      if (tags === null) {
        tags = await storageService.get<TagsCollection>(STORAGE_KEYS.TAGS) ?? null;
      }

      gameplayStore.initialize({
        tags: tags,
        pages: pages,
      });

      // ✅ 性能优化：延迟初始化同步服务，不阻塞首次操作
      // 同步服务在后台异步初始化，允许首次操作立即返回
      syncService.initialize().catch((error) => {
        console.warn('Background: SyncService 后台初始化失败（不影响核心功能）:', error);
      });

      console.log('Background: 核心初始化完成（SyncService 正在后台初始化）。');
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
