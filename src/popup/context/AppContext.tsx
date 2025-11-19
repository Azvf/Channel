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
import type { TaggedPage, GameplayTag } from "../../types/gameplayTag";
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
        console.log('[AppContext] 检测到数据变化，静默刷新 UI', {
          tagsChanged,
          pagesChanged,
        });
        // 关键：这里使用静默刷新，避免 UI 闪烁
        loadAllData(true).catch((err) => {
          console.error("Failed to refresh app context data:", err);
        });
      }
    };

    // 添加监听器
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange as any);

      // 清理函数：组件卸载时移除监听器
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange as any);
      };
    }
  }, [loadAllData]);

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

