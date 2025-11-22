import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

// 1. 创建 Chrome Storage 适配器
// 注意：keyPrefix 需要在 storage 方法中手动处理
const PERSIST_KEY_PREFIX = 'tanstack_cache_';

const chromeStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const prefixedKey = PERSIST_KEY_PREFIX + key;
      const result = await chrome.storage.local.get(prefixedKey);
      return result[prefixedKey] ?? null;
    },
    setItem: async (key, value) => {
      const prefixedKey = PERSIST_KEY_PREFIX + key;
      await chrome.storage.local.set({ [prefixedKey]: value });
    },
    removeItem: async (key) => {
      const prefixedKey = PERSIST_KEY_PREFIX + key;
      await chrome.storage.local.remove(prefixedKey);
    },
  },
  throttleTime: 1000, // 节流，避免频繁写入 Chrome Storage
});

// 2. 初始化 QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 24 * 60 * 60 * 1000, // 24小时未使用则回收内存 (原 cacheTime)
      staleTime: 5 * 60 * 1000,    // 5分钟内认为是新鲜数据 (对应你之前的 ttl)
      retry: 1,
      refetchOnWindowFocus: true,  // 这是一个巨大的体验提升
    },
  },
});

// 3. 启动持久化同步 (重要)
persistQueryClient({
  queryClient,
  persister: chromeStoragePersister,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 持久化缓存保留 7 天
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // 仅持久化状态为 success 的查询
      return query.state.status === 'success';
    },
  },
});

// 导出 persister 供 Provider 使用
export { chromeStoragePersister };

