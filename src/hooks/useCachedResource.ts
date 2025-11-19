import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '../services/cacheService';
import { logger } from '../services/logger';

const log = logger('useCachedResource');

export interface UseCachedResourceOptions<T> {
  /** 缓存 Key，必须唯一 */
  key: string;
  /** 数据获取函数 (API 请求) */
  fetcher: () => Promise<T>;
  /** 缓存有效期 (ms)，默认 5 分钟 */
  ttl?: number;
  /** 是否启用 (用于依赖查询) */
  enabled?: boolean;
  /** 初始数据 (用于 SSR 或预设值) */
  initialData?: T;
  /** 数据获取成功回调 */
  onSuccess?: (data: T) => void;
  /** 数据获取失败回调 */
  onError?: (error: any) => void;
}

export interface CachedResourceResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean; // 区别于 isLoading，这是后台静默刷新状态
  error: Error | null;
  refresh: () => Promise<void>;
  mutate: (newData: T) => void; // 乐观更新接口
}

export function useCachedResource<T>(
  options: UseCachedResourceOptions<T>
): CachedResourceResult<T> {
  const {
    key,
    fetcher,
    ttl = 5 * 60 * 1000,
    enabled = true,
    initialData = null,
    onSuccess,
    onError
  } = options;

  // 1. 状态定义
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 首次加载（无缓存时）
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false); // 后台刷新

  // 2. 挂载引用，防止组件卸载后更新状态
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // 使用 ref 存储回调函数，避免依赖变化导致重新创建 fetchData
  const fetcherRef = useRef(fetcher);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    fetcherRef.current = fetcher;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [fetcher, onSuccess, onError]);

  // 3. 核心获取逻辑
  const fetchData = useCallback(async (forceNetwork = false) => {
    if (!enabled) return;

    try {
      const now = Date.now();
      
      // --- 阶段 A: 尝试读取缓存 (Stale) ---
      if (!forceNetwork) {
        // 优先读取内存缓存（同步/极快）
        const memCache = cacheService.getMemoryCache<T>(key);
        if (memCache) {
          setData(memCache.data);
          // 如果内存缓存很新鲜，甚至可以跳过网络请求（可选策略，这里默认 SWR）
          if (now - memCache.timestamp < ttl) {
             // 如果不需要强制刷新，且缓存有效，可以在此 return
             // 但为了保持数据绝对实时，我们通常继续执行后台刷新
          }
        } else {
          // 只有在内存没有时，才尝试读取 Storage (异步)
          // 此时可能需要显示 Loading (如果也没有 initialData)
          setData(prevData => {
            if (!prevData) setIsLoading(true);
            return prevData;
          });
          
          const storedCache = await cacheService.storageService.get<{ data: T; timestamp: number }>(`cache_${key}`);
          if (isMounted.current && storedCache) {
            setData(storedCache.data);
            // 恢复到内存，加速下次读取
            await cacheService.set(key, storedCache.data);
            setIsLoading(false); // 拿到缓存，取消 Loading
          }
        }
      }

      // --- 阶段 B: 发起网络请求 (Revalidate) ---
      setIsRefreshing(true);
      setData(prevData => {
        if (!prevData) setIsLoading(true);
        return prevData;
      });

      const newData = await fetcherRef.current();

      if (isMounted.current) {
        setData(newData);
        setError(null);
        // 更新缓存
        await cacheService.set(key, newData);
        onSuccessRef.current?.(newData);
      }
    } catch (err) {
      if (isMounted.current) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        log.error(`Fetch failed for ${key}`, { error: errorObj });
        onErrorRef.current?.(err);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [key, enabled, ttl]); 

  // 4. 初始触发
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 5. 暴露操作
  const refresh = useCallback(() => fetchData(true), [fetchData]);
  
  const mutate = useCallback((newData: T) => {
    setData(newData);
    cacheService.set(key, newData);
  }, [key]);

  return {
    data,
    isLoading,     // 只有在没有任何数据可显示时为 true
    isRefreshing,  // 有旧数据显示，但正在后台更新时为 true
    error,
    refresh,
    mutate
  };
}

