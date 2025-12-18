// src/background/init.ts
// Background Service Worker 初始化逻辑

import { GameplayStore } from '../services/gameplayStore';
import { syncStorageService, storageService, STORAGE_KEYS } from '../services/storageService';
import { syncService } from '../services/syncService';
import { TagsCollection, PageCollection, TaggedPage } from '../shared/types/gameplayTag';

const gameplayStore = GameplayStore.getInstance();
let initPromise: Promise<void> | null = null;

/**
 * 加载核心数据（阶段1：阻塞初始化，快速返回）
 * 核心数据包括：tags、页面设置、最近50个页面
 */
async function loadCoreData(): Promise<{
  tags: TagsCollection | null;
  pages: PageCollection;
  pageIndex: string[];
  allPages: PageCollection; // 所有已加载的页面（用于后台加载）
}> {
  const startTime = performance.now();
  let pages: PageCollection = {};
  let allPages: PageCollection = {}; // 保存所有加载的页面
  let tags: TagsCollection | null = null;
  let pageIndex: string[] = [];
  
  try {
    // 并行加载基础数据（tags、设置、索引）
    const [pageIndexData, tagsData, settingsData] = await Promise.all([
      storageService.get<string[]>('page_index'),
      storageService.get<TagsCollection>(STORAGE_KEYS.TAGS),
      storageService.get(STORAGE_KEYS.PAGE_SETTINGS),
    ]);
    
    pageIndex = pageIndexData ?? [];
    tags = tagsData ?? null;
    // 读取页面设置（保持加载以初始化存储状态）
    void settingsData;
    
    // 如果原子化存储有数据，批量加载所有页面，然后按时间排序取最近50个
    if (pageIndex.length > 0) {
      try {
        // ✅ 性能优化：批量读取 - 将 O(N) 次 IPC 降为 O(1)
        // 一次性批量加载所有页面
        const atomicKeys = pageIndex.map(pageId => `page::${pageId}`);
        const atomicData = await storageService.getMultiple(atomicKeys);
        
        // 组装所有页面数据
        const allPagesArray: TaggedPage[] = [];
        Object.values(atomicData).forEach((page) => {
          if (page && (page as TaggedPage).id) {
            const taggedPage = page as TaggedPage;
            allPagesArray.push(taggedPage);
            allPages[taggedPage.id] = taggedPage; // 保存所有页面
          }
        });
        
        // 按 updatedAt 排序，取最近50个作为核心数据
        const sortedPages = allPagesArray.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const recentPages = sortedPages.slice(0, 50);
        
        // 将最近50个页面添加到核心数据
        recentPages.forEach(page => {
          pages[page.id] = page;
        });
        
        const coreLoadTime = performance.now() - startTime;
        console.log(`Background: 核心数据加载完成，耗时 ${coreLoadTime.toFixed(2)}ms，加载 ${Object.keys(pages).length} 个页面（共 ${allPagesArray.length} 个页面）`);
      } catch (error) {
        console.warn('Background: 从原子化存储批量加载页面失败，尝试集合存储:', error);
        // 降级到集合存储
        const legacyData = await storageService.get<PageCollection>(STORAGE_KEYS.PAGES);
        if (legacyData) {
          // 只取前50个页面（按updatedAt排序）
          const legacyPagesArray = Object.values(legacyData)
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          
          // 保存所有页面
          Object.values(legacyData).forEach(page => {
            allPages[page.id] = page;
          });
          
          // 只取前50个作为核心数据
          legacyPagesArray.slice(0, 50).forEach(page => {
            pages[page.id] = page;
          });
        }
      }
    }
    
    // 如果原子化存储中没有数据，尝试从集合存储加载（向后兼容）
    if (Object.keys(pages).length === 0) {
      const legacyData = await storageService.get<PageCollection>(STORAGE_KEYS.PAGES);
      if (legacyData) {
        // 只取前50个页面（按updatedAt排序）
        const legacyPagesArray = Object.values(legacyData)
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        
        // 保存所有页面
        Object.values(legacyData).forEach(page => {
          allPages[page.id] = page;
        });
        
        // 只取前50个作为核心数据
        legacyPagesArray.slice(0, 50).forEach(page => {
          pages[page.id] = page;
        });
        console.log('Background: 降级加载 Legacy Pages 完成');
      }
    }
  } catch (error) {
    console.error('Background: 核心数据加载失败:', error);
    throw error;
  }
  
  return { tags, pages, pageIndex, allPages };
}

/**
 * 加载剩余数据（阶段2：后台异步加载，不阻塞）
 * 将核心加载时已读取但未加入GameplayStore的剩余页面添加到Store
 */
async function loadRemainingData(allPages: PageCollection, corePages: PageCollection): Promise<void> {
  const startTime = performance.now();
  
  try {
    // 获取已加载的核心页面ID集合
    const corePageIds = new Set(Object.keys(corePages));
    
    // 找出需要添加的剩余页面
    const remainingPages: PageCollection = {};
    Object.entries(allPages).forEach(([pageId, page]) => {
      if (!corePageIds.has(pageId)) {
        remainingPages[pageId] = page;
      }
    });
    
    if (Object.keys(remainingPages).length === 0) {
      return;
    }
    
    // 将剩余页面添加到 GameplayStore
    gameplayStore.addPages(remainingPages);
    const backgroundLoadTime = performance.now() - startTime;
    console.log(`Background: 后台数据加载完成，耗时 ${backgroundLoadTime.toFixed(2)}ms，加载 ${Object.keys(remainingPages).length} 个页面`);
  } catch (error) {
    console.warn('Background: 后台数据加载失败（不影响核心功能）:', error);
    // 静默失败，不影响核心功能
  }
}

/**
 * 初始化 Background Service Worker
 * 加载数据、初始化 TagManager 和 SyncService
 * 
 * 性能优化：
 * - 阶段1：核心数据（tags + 最近50页面）立即加载，阻塞初始化
 * - 阶段2：剩余数据后台异步加载，不阻塞
 */
export async function getInitializationPromise(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const initStartTime = performance.now();
    try {
      console.log('Background: 启动初始化...');

      // 阶段1：加载核心数据（阻塞初始化，快速返回）
      const { tags, pages, allPages } = await loadCoreData();

      // 初始化 GameplayStore（使用核心数据）
      gameplayStore.initialize({
        tags: tags,
        pages: pages,
      });

      // 延迟初始化同步服务，不阻塞首次操作
      syncService.initialize().catch((error) => {
        console.warn('Background: SyncService 后台初始化失败（不影响核心功能）:', error);
      });

      const coreInitTime = performance.now() - initStartTime;
      console.log(`Background: 核心初始化全部完成，总耗时 ${coreInitTime.toFixed(2)}ms`);

      // 阶段2：后台异步加载剩余数据（不阻塞）
      // 使用已加载的所有页面数据，避免重复读取
      loadRemainingData(allPages, pages).catch((error) => {
        console.warn('Background: 后台数据加载失败（不影响核心功能）:', error);
      });
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
