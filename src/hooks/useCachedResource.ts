import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '../services/cacheService';
import { logger } from '../infra/logger';

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
  // 使用 lazy initializer 确保 initialData 只在挂载时使用一次
  const [data, setData] = useState<T | null>(() => initialData || null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 首次加载（无缓存时）
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false); // 后台刷新

  // 2. 挂载引用
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // 使用 ref 追踪 data 状态，以便在 effect 中读取而不触发重运行
  // 解决 "setData(prev => { if(!prev) setLoading(true) })" 的反模式问题
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 使用 ref 存储回调函数
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
      let hasCachedData = false;
      if (!forceNetwork) {
        const memCache = cacheService.getMemoryCache<T>(key);
        if (memCache) {
          if (isMounted.current) {
            setData(memCache.data);
          }
          hasCachedData = true;
          if (now - memCache.timestamp < ttl) {
             // 缓存新鲜，可选择是否跳过网络请求
          }
        } else {
          // 内存无缓存，尝试 Storage
          // 只有在当前没有任何数据时才显示 Loading
          if (isMounted.current && !dataRef.current) {
             setIsLoading(true);
          }
          
          const storedCache = await cacheService.storageService.get<{ data: T; timestamp: number }>(`cache_${key}`);
          if (isMounted.current && storedCache) {
            setData(storedCache.data);
            await cacheService.set(key, storedCache.data); // 恢复到内存
            hasCachedData = true;
            setIsLoading(false); // 拿到缓存，取消 Loading
          }
        }
      }

      // --- 阶段 B: 发起网络请求 (Revalidate) ---
      if (isMounted.current) {
        setIsRefreshing(true);
        // 只有在没有缓存数据且当前没有任何数据时才设置 isLoading
        // 修复：直接使用 dataRef 判断，而不是在 setData 回调中副作用设置
        if (!hasCachedData && !dataRef.current) {
           setIsLoading(true);
        }
      }

      const newData = await fetcherRef.current();

      if (isMounted.current) {
        setData(newData);
        setError(null);
        setIsLoading(false); // 成功，取消 Loading
        await cacheService.set(key, newData);
        onSuccessRef.current?.(newData);
      }
    } catch (err) {
      if (isMounted.current) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false); // 失败，取消 Loading
        log.error(`Fetch failed for ${key}`, { error: errorObj });
        onErrorRef.current?.(err);
      }
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [key, enabled, ttl]); 

  // 4. 初始触发（带竞态条件保护）
  useEffect(() => {
    if (!enabled) return;

    let isCurrentEffect = true;

    const run = async () => {
      try {
        // --- 阶段 A: 尝试读取缓存 (Stale) ---
        let hasCachedData = false;
        const memCache = cacheService.getMemoryCache<T>(key);
        
        if (memCache) {
          if (isMounted.current && isCurrentEffect) {
            setData(memCache.data);
          }
          hasCachedData = true;
        } else {
          // Storage 读取前，如果没有数据，显示 Loading
          if (isMounted.current && isCurrentEffect && !dataRef.current) {
            setIsLoading(true);
          }
          
          const storedCache = await cacheService.storageService.get<{ data: T; timestamp: number }>(`cache_${key}`);
          if (isMounted.current && isCurrentEffect && storedCache) {
            setData(storedCache.data);
            await cacheService.set(key, storedCache.data);
            hasCachedData = true;
            setIsLoading(false);
          }
        }

        // --- 阶段 B: 发起网络请求 (Revalidate) ---
        if (isMounted.current && isCurrentEffect) {
          setIsRefreshing(true);
          // 修复：使用 dataRef 判断，移除 setData 中的副作用
          if (!hasCachedData && !dataRef.current) {
             setIsLoading(true);
          }
        }

        const newData = await fetcherRef.current();

        if (isMounted.current && isCurrentEffect) {
          setData(newData);
          setError(null);
          setIsLoading(false);
          await cacheService.set(key, newData);
          onSuccessRef.current?.(newData);
        }
      } catch (err) {
        if (isMounted.current && isCurrentEffect) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          setError(errorObj);
          setIsLoading(false);
          log.error(`Fetch failed for ${key}`, { error: errorObj });
          onErrorRef.current?.(err);
        }
      } finally {
        if (isMounted.current && isCurrentEffect) {
          setIsRefreshing(false);
        }
      }
    };

    run();

    return () => {
      isCurrentEffect = false;
    };
  }, [key, enabled, ttl]);

  // 5. 暴露操作
  const refresh = useCallback(() => fetchData(true), [fetchData]);
  
  const mutate = useCallback((newData: T) => {
    setData(newData);
    cacheService.set(key, newData);
  }, [key]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    mutate
  };
}
