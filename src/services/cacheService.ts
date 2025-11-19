import { storageService } from './storageService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: string;
}

interface CacheOptions<T> {
  key: string;
  ttl?: number; // 毫秒，默认 5 分钟
  fetcher: () => Promise<T>;
  forceRefresh?: boolean;
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  /**
   * 同步获取内存缓存（供 Hook 使用）
   */
  getMemoryCache<T>(key: string): CacheEntry<T> | undefined {
    return this.memoryCache.get(key);
  }

  /**
   * 获取存储服务实例（供 Hook 使用）
   */
  get storageService() {
    return storageService;
  }

  /**
   * 获取数据：内存 -> 存储 -> 网络 (Stale-While-Revalidate)
   */
  async get<T>(options: CacheOptions<T>): Promise<T> {
    const { key, ttl = this.DEFAULT_TTL, fetcher, forceRefresh = false } = options;
    const now = Date.now();

    // 1. 尝试内存缓存 (最快)
    if (!forceRefresh && this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (now - entry.timestamp < ttl) {
        return entry.data;
      }
    }

    // 2. 尝试持久化缓存 (次快，用于 Popup 重启后)
    if (!forceRefresh) {
      const stored = await storageService.get<CacheEntry<T>>(`cache_${key}`);
      if (stored) {
        // 恢复到内存
        this.memoryCache.set(key, stored);
        // 如果未过期，直接返回
        if (now - stored.timestamp < ttl) {
          return stored.data;
        }
        // 如果已过期但存在，可以考虑返回旧数据同时后台更新（可选策略），
        // 这里为了简单且保证数据新鲜度，过期则视为失效，继续向下执行
      }
    }

    // 3. 执行网络请求 (最慢)
    try {
      const data = await fetcher();
      this.set(key, data); // 更新缓存
      return data;
    } catch (error) {
      // 4. 容错：如果网络失败但有旧缓存，返回旧缓存并提示
      const stored = await storageService.get<CacheEntry<T>>(`cache_${key}`);
      if (stored) {
        console.warn(`[CacheService] Fetch failed for ${key}, using stale cache.`, error);
        return stored.data;
      }
      throw error;
    }
  }

  /**
   * 更新缓存 (内存 + 持久化)
   */
  async set<T>(key: string, data: T): Promise<void> {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    this.memoryCache.set(key, entry);
    // 异步写入存储，不阻塞 UI
    storageService.set(`cache_${key}`, entry).catch(err => 
      console.warn('[CacheService] Write failed', err)
    );
  }

  /**
   * 移除缓存
   */
  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await storageService.remove(`cache_${key}`);
  }
  
  /**
   * 清空所有缓存 (例如登出时)
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    // 注意：这里假设所有缓存 key 都以 cache_ 开头，可以遍历删除
    // 为简单起见，通常在 logout 时调用 storageService.removeMultiple 指定 key
  }
}

export const cacheService = new CacheService();

