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
import type { TaggedPage, GameplayTag, TagsCollection, PageCollection } from "../../types/gameplayTag";
import { storageService, STORAGE_KEYS } from "../../services/storageService";

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
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [allTags, setAllTags] = useState<GameplayTag[]>([]);
  const [allPages, setAllPages] = useState<TaggedPage[]>([]);
  const [stats, setStats] = useState<UserStats>({ todayCount: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    // [优化] 1. 快速渲染：先从本地 Storage 读取缓存数据
    // 这样用户打开 Popup 瞬间就能看到数据，无需等待 Background 通信
    try {
      const [cachedTags, cachedPages] = await Promise.all([
        storageService.get<TagsCollection | GameplayTag[]>(STORAGE_KEYS.TAGS),
        storageService.get<PageCollection | TaggedPage[]>(STORAGE_KEYS.PAGES)
      ]);
      
      // 注意：STORAGE_KEYS.TAGS 存储的是 Map/Object 结构，需要转数组
      // 假设 storage 中存的是对象 { id: tag }，需要 Object.values
      // 或者是直接存的数组，根据您的 TagManager 实现调整
      if (cachedTags) {
        const tagsArray = Array.isArray(cachedTags) ? cachedTags : Object.values(cachedTags);
        setAllTags(tagsArray);
      }
      if (cachedPages) {
         const pagesArray = Array.isArray(cachedPages) ? cachedPages : Object.values(cachedPages);
         setAllPages(pagesArray);
      }
      
      // 如果有缓存，可以先取消 loading 状态，提升体验
      if (cachedTags || cachedPages) {
        setLoading(false);
      }
    } catch (e) {
      // 忽略缓存读取错误，继续下面的网络请求
      console.warn("Failed to load cached data", e);
    }

    // 2. 真实数据源：从 Background Service 获取最新数据 (Source of Truth)
    // 如果有缓存数据，这里静默更新（不显示 loading）；如果没有缓存，保持 loading
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
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. 初始加载
    loadAllData().catch((err) => {
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
        console.log('[AppContext] 检测到数据变化，自动刷新 UI', {
          tagsChanged,
          pagesChanged,
        });
        // 重新加载所有数据
        loadAllData().catch((err) => {
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
      refreshAllData: loadAllData,
    }),
    [allTags, allPages, stats, loading, error, loadAllData],
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

