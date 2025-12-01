import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { currentPageService } from "../../services/popup/currentPageService";
import type { TaggedPage, GameplayTag, PageCollection, TagsCollection } from "../../shared/types/gameplayTag";
import { STORAGE_KEYS } from "../../services/storageService";
import { queryKeys } from "../../lib/queryKeys";

interface UserStats {
  todayCount: number;
  streak: number;
}

interface AppState {
  allTags: GameplayTag[];
  allPages: TaggedPage[];
  stats: UserStats;
  loading: boolean;
  error: string | null;
  isInitializing: boolean;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  /**
   * 预加载的页面数据（从 Storage 读取，用于实现 < 100ms 首屏）
   */
  initialPages?: PageCollection;
  /**
   * 预加载的标签数据（从 Storage 读取，用于实现 < 100ms 首屏）
   */
  initialTags?: TagsCollection;
}

export function AppProvider({ 
  children, 
  initialPages = {},
  initialTags = {}
}: AppProviderProps) {
  const queryClient = useQueryClient();
  
  // 使用预加载数据作为初始状态，避免首次渲染时的 Loading
  const [allTags, setAllTags] = useState<GameplayTag[]>(() => 
    Object.values(initialTags)
  );
  const [allPages, setAllPages] = useState<TaggedPage[]>(() => 
    Object.values(initialPages)
  );
  const [stats, setStats] = useState<UserStats>({ todayCount: 0, streak: 0 });
  // 如果有预加载数据，初始状态不是 loading
  const [loading, setLoading] = useState(() => 
    Object.keys(initialPages).length === 0 && Object.keys(initialTags).length === 0
  );
  const [error, setError] = useState<string | null>(null);
  // 新增：区分初始加载和后台刷新
  const [isInitializing, setIsInitializing] = useState(() =>
    Object.keys(initialPages).length === 0 && Object.keys(initialTags).length === 0
  );

  const loadAllData = useCallback(async (isSilent = false) => {
    // 如果是静默刷新，不要设置全局 loading，避免 UI 闪烁
    if (!isSilent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [tagsData, pagesData, statsData] = await Promise.all([
        currentPageService.getAllTags(),
        currentPageService.getAllTaggedPages(),
        currentPageService.getUserStats(),
      ]);
      
      setAllTags(tagsData);
      setAllPages(pagesData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load app context data:", err);
      const message = err instanceof Error ? err.message : "Failed to load data";
      // 静默刷新时，不要设置 error，避免打断用户操作
      if (!isSilent) {
        setError(message);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
      setIsInitializing(false);
    }
  }, []);

  // ✅ 性能优化：增量更新函数，只更新特定类型的数据
  const loadTagsOnly = useCallback(async () => {
    try {
      const tagsData = await currentPageService.getAllTags();
      setAllTags(tagsData);
      // 同时更新 React Query 缓存
      queryClient.setQueryData(queryKeys.allTags, tagsData);
    } catch (err) {
      console.error("Failed to refresh tags:", err);
    }
  }, [queryClient]);

  const loadPagesOnly = useCallback(async () => {
    try {
      const [pagesData, statsData] = await Promise.all([
        currentPageService.getAllTaggedPages(),
        currentPageService.getUserStats(),
      ]);
      setAllPages(pagesData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to refresh pages:", err);
    }
  }, []);

  // ✅ 修复：创建防抖的刷新函数，防止惊群效应
  // 支持增量更新：可以指定只刷新 tags 或 pages
  const debouncedRefresh = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingRefreshType: 'all' | 'tags' | 'pages' = 'all';
    
    return {
      call: (type: 'all' | 'tags' | 'pages' = 'all') => {
        // 记录待刷新的类型（如果已经有待处理的刷新，合并类型）
        if (type === 'all') {
          pendingRefreshType = 'all';
        } else if (pendingRefreshType !== 'all') {
          // 如果之前是 'tags' 或 'pages'，现在要刷新另一个，则升级为 'all'
          if (pendingRefreshType !== type) {
            pendingRefreshType = 'all';
          }
        } else {
          pendingRefreshType = type;
        }

        // 清除之前的定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // 设置新的定时器
        timeoutId = setTimeout(() => {
          const refreshType = pendingRefreshType;
          pendingRefreshType = 'all';
          timeoutId = null;

          if (refreshType === 'tags') {
            loadTagsOnly().catch((err) => {
              console.error("Failed to refresh tags:", err);
            });
          } else if (refreshType === 'pages') {
            loadPagesOnly().catch((err) => {
              console.error("Failed to refresh pages:", err);
            });
          } else {
            loadAllData(true).catch((err) => {
              console.error("Failed to refresh app context data:", err);
            });
          }
        }, 300); // 300ms 延迟，合并短时间内的多次变更
      },
      cancel: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        pendingRefreshType = 'all';
      }
    };
  }, [loadAllData, loadTagsOnly, loadPagesOnly]);

  useEffect(() => {
    // ✅ 性能优化：预热 background service worker
    // 在首次操作前提前触发初始化，减少首次创建 tag 的延迟
    const warmupBackground = async () => {
      try {
        // 发送一个轻量级请求来预热 background service worker
        // 这会触发 getInitializationPromise()，让初始化提前完成
        await currentPageService.getAllTags();
      } catch (_error) {
        // 预热失败不影响应用启动，静默处理
      }
    };

    // 立即启动预热（不等待完成）
    warmupBackground();

    // 1. 初始加载 (非静默)
    loadAllData(false).catch((err) => {
      console.error("Failed to initialize app context:", err);
    });

    // 2. 订阅数据变化 - 监听 chrome.storage.onChanged
    // 当 Background 进程中的 SyncService 更新数据并保存到 storage 时，
    // Popup 进程可以通过这个监听器自动刷新 UI
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: 'sync' | 'local' | 'managed'
    ) => {
      // 只处理 local storage 的变化（sync storage 的变化也会触发，但我们主要关注 local）
      if (areaName !== 'local') {
        return;
      }

      // 优化：检查是否使用原子化存储（page:: 前缀）
      const changedPageKeys = Object.keys(changes).filter(k => k.startsWith('page::'));
      
      if (changedPageKeys.length > 0) {
        // 原子化存储模式：O(1) 直接更新特定 Query
        const scheduleUpdate = window.requestIdleCallback || 
          ((cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 0));
        
        scheduleUpdate(() => {
          changedPageKeys.forEach(key => {
            const newPageData = changes[key].newValue as TaggedPage | undefined;
            
            if (newPageData) {
              // 直接更新特定 Query，无需遍历
              queryClient.setQueryData(queryKeys.currentPage(newPageData.url), newPageData);
            }
          });
          
          // 触发 AppContext 刷新（更新 allPages 状态）
          debouncedRefresh.call();
        }, { timeout: 1000 });
        return;
      }

      // 传统存储模式：检查 TAGS 或 PAGES 是否发生变化
      const tagsChanged = changes[STORAGE_KEYS.TAGS] !== undefined;
      const pagesChanged = changes[STORAGE_KEYS.PAGES] !== undefined;

      if (tagsChanged && pagesChanged) {
        // 如果两者都变化，刷新所有数据
        debouncedRefresh.call('all');
      } else if (tagsChanged) {
        // ✅ 性能优化：只刷新 tags，不重新获取 pages 和 stats
        debouncedRefresh.call('tags');
      } else if (pagesChanged) {
        // ✅ 性能优化：只刷新 pages，不重新获取 tags 和 stats
        debouncedRefresh.call('pages');
      }
    };

    // 添加监听器
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange as any);

      // 清理函数：组件卸载时移除监听器并取消挂起的防抖任务
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange as any);
        // ✅ 关键：组件卸载时取消挂起的防抖任务
        debouncedRefresh.cancel();
      };
    }
  }, [loadAllData, debouncedRefresh, queryClient]);

  const contextValue = useMemo<AppState>(
    () => ({
      allTags,
      allPages,
      stats,
      loading,
      error,
      isInitializing,
      refreshAllData: () => loadAllData(false),
    }),
    [allTags, allPages, stats, loading, error, isInitializing, loadAllData],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

