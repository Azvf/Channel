/**
 * 页面缓存管理 Hook
 * 封装页面数据的缓存管理逻辑，实现 Stale-While-Revalidate 模式
 */

import { useCallback, useRef } from 'react';
import { useQueryClient, QueryFunction } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';
import { currentPageService } from '@/services/popup/currentPageService';
import { STORAGE_KEYS, storageService } from '@/services/storageService';
import { isUrlMatch } from '@/shared/utils/urlUtils';
import { createLogger } from '@/shared/utils/logger';
import { TIMEOUTS } from '@/shared/constants/timeouts';

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
  
  // 防抖机制：避免频繁触发后台 analyzePageByUrl（平衡数据新鲜度和性能开销）
  const lastBackgroundCallRef = useRef<{ url: string; timestamp: number } | null>(null);

  /**
   * Stale-While-Revalidate 模式的 queryFn
   * 优先从 Chrome Storage 读取，后台同步
   */
  const queryFn = useCallback<QueryFunction<TaggedPage>>(async () => {
    // Stale-While-Revalidate 模式：优先从缓存读取，后台同步最新数据
    try {
      const allPages = await storageService.get<Record<string, TaggedPage>>(
        STORAGE_KEYS.PAGES
      );

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url;

      if (url && allPages) {
        // 使用 isUrlMatch 比较 base URL，忽略 hash 和 query 参数
        const matchedPage = Object.values(allPages).find((page) =>
          isUrlMatch(page.url, url)
        );

        if (matchedPage) {
          // 立即返回缓存数据，不等待 RPC，确保快速响应
          // 同时触发后台分析，校验数据一致性（使用防抖避免频繁调用）
          const now = Date.now();
          const lastCall = lastBackgroundCallRef.current;
          const shouldCall = !lastCall || 
            lastCall.url !== url || 
            (now - lastCall.timestamp) >= TIMEOUTS.PAGE_CACHE_DEBOUNCE;
          
          if (shouldCall) {
            lastBackgroundCallRef.current = { url, timestamp: now };
            
            // 使用独立的分析方法，不依赖 popup 状态，从源头避免错误
            currentPageService.analyzePageByUrl(url).catch((error) => {
              // 静默处理错误，analyzePageByUrl 内部已经处理了大部分错误
              logger.debug('[usePageCache] 后台 analyzePageByUrl 失败（静默处理）:', {
                url,
                error: error instanceof Error ? error.message : String(error),
              });
            });
          } else {
            logger.debug('[usePageCache] 跳过后台 analyzePageByUrl（防抖中）:', {
              url,
              lastCallTimestamp: lastCall?.timestamp,
              timeSinceLastCall: now - (lastCall?.timestamp || 0),
            });
          }
          
          // 触发 invalidateQueries，确保 TanStack Query 缓存同步
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
      // 读取失败，降级到 RPC 获取
    }

    // 缓存不存在或匹配失败，调用 RPC 获取数据
    logger.debug('[Stale-While-Revalidate] 缓存未命中，从 RPC 获取数据');
    return await currentPageService.getCurrentPage();
  }, [queryClient]);

  /**
   * 更新页面缓存
   * 使用页面对象中的 URL 作为缓存键，确保缓存键始终正确
   */
  const mutatePage = useCallback(
    (newPage: TaggedPage) => {
      // 优先使用页面对象中的 URL，如果没有则使用 currentUrl（降级策略）
      const urlForCache = newPage.url || currentUrlRef.current;
      if (urlForCache) {
        // SSOT 验证：确保 newPage 的 URL 与缓存键匹配，避免数据不一致
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

