import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { currentPageService } from "../../services/popup/currentPageService";
import type { TaggedPage, GameplayTag } from "../../shared/types/gameplayTag";
import { STORAGE_KEYS } from "../../services/storageService";

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [allTags, setAllTags] = useState<GameplayTag[]>([]);
  const [allPages, setAllPages] = useState<TaggedPage[]>([]);
  const [stats, setStats] = useState<UserStats>({ todayCount: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 新增：区分初始加载和后台刷新
  const [isInitializing, setIsInitializing] = useState(true);

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

  // ✅ 修复：创建防抖的刷新函数，防止惊群效应
  const debouncedRefresh = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return {
      call: () => {
        // 清除之前的定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // 设置新的定时器
        timeoutId = setTimeout(() => {
          console.log('[AppContext] 执行防抖后的静默刷新');
          loadAllData(true).catch((err) => {
            console.error("Failed to refresh app context data:", err);
          });
          timeoutId = null;
        }, 300); // 300ms 延迟，合并短时间内的多次变更
      },
      cancel: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };
  }, [loadAllData]);

  useEffect(() => {
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

      // 检查 TAGS 或 PAGES 是否发生变化
      const tagsChanged = changes[STORAGE_KEYS.TAGS] !== undefined;
      const pagesChanged = changes[STORAGE_KEYS.PAGES] !== undefined;

      if (tagsChanged || pagesChanged) {
        // ✅ 修复：使用防抖函数触发刷新，防止惊群效应
        debouncedRefresh.call();
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
  }, [loadAllData, debouncedRefresh]);

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

