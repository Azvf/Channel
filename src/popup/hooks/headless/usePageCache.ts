/**
 * 页面缓存管理 Hook
 * 封装页面数据的缓存管理逻辑，实现 Stale-While-Revalidate 模式
 */

import { useCallback } from 'react';
import { useQueryClient, QueryFunction } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';
import { currentPageService } from '@/services/popup/currentPageService';
import { STORAGE_KEYS, storageService } from '@/services/storageService';
import { isUrlMatch } from '@/shared/utils/urlUtils';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('usePageCache');

export interface UsePageCacheReturn {
  queryFn: QueryFunction<TaggedPage>;
  mutatePage: (newPage: TaggedPage) => void;
  getCachedPage: (url: string) => TaggedPage | undefined;
  isCacheMatched: (url: string) => boolean;
}

/**
 * 页面缓存管理 Hook
 * 
 * 功能：
 * - 实现 Stale-While-Revalidate 模式的 queryFn
 * - 管理 TanStack Query 缓存
 * - 提供缓存匹配和更新方法
 * 
 * @param currentUrlRef - 当前 URL 引用
 * @returns 缓存管理相关的方法
 */
export function usePageCache(
  currentUrlRef: React.MutableRefObject<string | undefined>
): UsePageCacheReturn {
  const queryClient = useQueryClient();

  /**
   * Stale-While-Revalidate 模式的 queryFn
   * 优先从 Chrome Storage 读取，后台同步
   */
  const queryFn = useCallback<QueryFunction<TaggedPage>>(async () => {
    // [Stale-While-Revalidate] 1. 立即从 Chrome Storage 读取（不等待 URL）
    try {
      const allPages = await storageService.get<Record<string, TaggedPage>>(
        STORAGE_KEYS.PAGES
      );

      // 2. 获取当前 URL
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url;

      if (url && allPages) {
        // 3. 查找匹配的页面（使用 isUrlMatch 比较 base URL）
        const matchedPage = Object.values(allPages).find((page) =>
          isUrlMatch(page.url, url)
        );

        if (matchedPage) {
          // 4. 立即返回缓存数据（不等待 RPC）
          // 5. 后台触发 RPC 同步（非阻塞）
          queryClient
            .invalidateQueries({
              queryKey: queryKeys.currentPage(url),
            })
            .catch(console.error);

          logger.debug('[Stale-While-Revalidate] 从 Chrome Storage 读取缓存数据，后台同步');
          return matchedPage;
        }
      }
    } catch (error) {
      logger.error('[Stale-While-Revalidate] 读取 Chrome Storage 失败', error);
      // 读取失败，继续从 RPC 获取
    }

    // 6. 缓存不存在或匹配失败，调用 RPC 获取数据
    logger.debug('[Stale-While-Revalidate] 缓存未命中，从 RPC 获取数据');
    return await currentPageService.getCurrentPage();
  }, [queryClient]);

  /**
   * 更新页面缓存
   * 使用页面对象中的 URL 作为缓存键，确保缓存键始终正确
   */
  const mutatePage = useCallback(
    (newPage: TaggedPage) => {
      // 优先使用页面对象中的 URL，如果没有则使用 currentUrl
      const urlForCache = newPage.url || currentUrlRef.current;
      if (urlForCache) {
        // [SSOT] 验证：确保 newPage 的 URL 与缓存键匹配
        if (newPage.url && !isUrlMatch(newPage.url, urlForCache)) {
          logger.warn('[SSOT] mutatePage: URL 不匹配，跳过更新', {
            pageUrl: newPage.url,
            cacheKeyUrl: urlForCache,
          });
          return; // 不更新缓存，保持 SSOT
        }
        queryClient.setQueryData(queryKeys.currentPage(urlForCache), newPage);
      }
    },
    [currentUrlRef, queryClient]
  );

  /**
   * 获取缓存的页面数据
   */
  const getCachedPage = useCallback(
    (url: string): TaggedPage | undefined => {
      return queryClient.getQueryData<TaggedPage>(queryKeys.currentPage(url));
    },
    [queryClient]
  );

  /**
   * 检查缓存是否匹配
   */
  const isCacheMatched = useCallback(
    (url: string): boolean => {
      const cachedPage = getCachedPage(url);
      if (!cachedPage) {
        return false;
      }
      return isUrlMatch(cachedPage.url, url);
    },
    [getCachedPage]
  );

  return {
    queryFn,
    mutatePage,
    getCachedPage,
    isCacheMatched,
  };
}

