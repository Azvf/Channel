/**
 * Stale-While-Revalidate 框架
 * 封装缓存优先读取流程，提供统一的 Stale-While-Revalidate 机制
 */

import { QueryFunction } from '@tanstack/react-query';
import { storageService, StorageKey } from '@/services/storageService';

/**
 * Stale-While-Revalidate 配置
 */
export interface StaleWhileRevalidateConfig<TData> {
  /** 查询键（用于日志） */
  queryKey?: unknown[];
  /** 存储键 */
  storageKey: StorageKey;
  /** 远端获取函数 */
  fetchFn: () => Promise<TData>;
  /** 后台同步函数（可选，用于在读取缓存后触发后台同步） */
  syncFn?: (data: TData) => Promise<void>;
  /** 数据过期时间（毫秒），超过此时间的数据被认为是过期的 */
  staleTime?: number;
}

/**
 * 创建 Stale-While-Revalidate 查询函数
 * 
 * 实现缓存优先读取流程：
 * 1. 先读取 Chrome Storage（立即返回）
 * 2. 后台触发同步（不阻塞）
 * 3. 如果没有缓存，从远端获取
 */
export function createStaleWhileRevalidate<TData>(
  config: StaleWhileRevalidateConfig<TData>
): QueryFunction<TData> {
  return async (): Promise<TData> => {
    // 1. 先读取 Chrome Storage（立即返回）
    try {
      const cached = await storageService.get<TData>(config.storageKey);
      
      if (cached) {
        // 检查数据是否过期
        const isStale = config.staleTime
          ? (cached as any).__cachedAt
            ? Date.now() - (cached as any).__cachedAt > config.staleTime
            : true // 如果没有时间戳，认为已过期
          : false; // 如果没有配置 staleTime，认为数据总是新鲜的

        if (!isStale) {
          // 2. 后台触发同步（不阻塞）
          if (config.syncFn) {
            config.syncFn(cached).catch((error) => {
              console.error('[StaleWhileRevalidate] 后台同步失败:', error);
              // 后台同步失败不影响返回缓存数据
            });
          }
          
          // 立即返回缓存数据
          return cached;
        } else {
          console.log('[StaleWhileRevalidate] 缓存已过期，从远端获取');
        }
      }
    } catch (error) {
      console.error('[StaleWhileRevalidate] 读取缓存失败:', error);
      // 读取缓存失败，继续从远端获取
    }

    // 3. 如果没有缓存或缓存已过期，从远端获取
    const fresh = await config.fetchFn();

    // 4. 保存到 Storage（带时间戳）
    try {
      const dataWithTimestamp = {
        ...fresh,
        __cachedAt: Date.now(),
      } as TData & { __cachedAt: number };
      
      await storageService.set(config.storageKey, dataWithTimestamp);
    } catch (error) {
      console.error('[StaleWhileRevalidate] 保存缓存失败:', error);
      // 保存缓存失败不影响返回数据
    }

    return fresh;
  };
}

/**
 * 从缓存数据中移除时间戳
 */
export function removeCacheTimestamp<TData>(data: TData & { __cachedAt?: number }): TData {
  const { __cachedAt, ...rest } = data as any;
  return rest as TData;
}


