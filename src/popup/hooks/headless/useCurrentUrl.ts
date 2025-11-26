/**
 * URL 管理 Hook
 * 封装 URL 获取、更新、同步逻辑
 */

import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';
import { getBaseUrl, isUrlMatch } from '@/shared/utils/urlUtils';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('useCurrentUrl');

export interface UseCurrentUrlReturn {
  currentUrl: string | undefined;
  currentUrlRef: React.MutableRefObject<string | undefined>;
  setCurrentUrl: (url: string) => void;
  fetchCurrentUrl: (forceRefresh?: boolean, shouldRefetch?: boolean) => Promise<void>;
  isUrlMatch: (url1: string, url2: string) => boolean;
  getBaseUrl: (url: string) => string;
}

/**
 * URL 管理 Hook
 * 
 * 功能：
 * - 获取当前标签页 URL
 * - 管理 URL 状态和引用
 * - 处理 URL 变化时的缓存清理
 * 
 * @param isMountedRef - 组件挂载状态引用
 * @param refreshPageRef - refetch 函数引用
 * @returns URL 管理相关的状态和方法
 */
export function useCurrentUrl(
  isMountedRef: React.MutableRefObject<boolean>,
  refreshPageRef: React.MutableRefObject<(() => void) | null>
): UseCurrentUrlReturn {
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(undefined);
  const currentUrlRef = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const fetchCurrentUrl = useCallback(
    async (forceRefresh = false, shouldRefetch = true) => {
      // 检查组件是否已卸载
      if (!isMountedRef.current) {
        return;
      }

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        // 再次检查组件是否已卸载（异步操作后）
        if (!isMountedRef.current) {
          return;
        }

        if (tabs && tabs.length > 0 && tabs[0].url && !tabs[0].url.startsWith('about:')) {
          const url = tabs[0].url;
          const oldUrl = currentUrlRef.current;

          // 如果URL发生变化，清除旧缓存
          if (oldUrl && url !== oldUrl) {
            queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
          }

          // 更新URL引用和状态
          const urlChanged = url !== currentUrlRef.current;
          currentUrlRef.current = url;

          // 只有在URL变化或强制刷新时才更新状态
          if ((urlChanged || forceRefresh) && isMountedRef.current) {
            setCurrentUrl(url);

            // URL变化后触发重新获取数据（如果需要）
            // 优化：检查缓存是否存在，如果存在且数据新鲜，不触发 refetch
            if (shouldRefetch && urlChanged && refreshPageRef.current && isMountedRef.current) {
              // 检查缓存是否存在
              const cachedData = queryClient.getQueryData<TaggedPage>(
                queryKeys.currentPage(url)
              );

              // 修复：验证缓存数据的 URL 是否匹配
              // 如果缓存存在但 URL 不匹配，清除缓存，确保触发新的数据获取
              if (cachedData && !isUrlMatch(cachedData.url, url)) {
                logger.debug('检测到缓存数据 URL 不匹配，清除缓存', {
                  cachedUrl: cachedData.url,
                  currentUrl: url,
                });
                queryClient.removeQueries({ queryKey: queryKeys.currentPage(url) });
                // 清除后触发 refetch
                if (isMountedRef.current && refreshPageRef.current) {
                  refreshPageRef.current();
                }
              } else if (!cachedData || forceRefresh) {
                // 缓存不存在或强制刷新，触发 refetch
                if (isMountedRef.current && refreshPageRef.current) {
                  refreshPageRef.current();
                }
              } else {
                // 缓存存在且 URL 匹配，不触发 refetch
                logger.debug('缓存已存在且 URL 匹配，跳过 refetch，使用缓存数据');
              }
            }
          }
        }
      } catch (error) {
        // 如果是 popup 关闭导致的错误，静默处理
        if (chrome.runtime.lastError && chrome.runtime.lastError.message?.includes('message port closed')) {
          return;
        }
        logger.error('获取当前标签页URL失败', error);
      }
    },
    [isMountedRef, refreshPageRef, queryClient]
  );

  const setCurrentUrlWrapper = useCallback(
    (url: string) => {
      if (isMountedRef.current) {
        currentUrlRef.current = url;
        setCurrentUrl(url);
      }
    },
    [isMountedRef, currentUrlRef]
  );

  return {
    currentUrl,
    currentUrlRef,
    setCurrentUrl: setCurrentUrlWrapper,
    fetchCurrentUrl,
    isUrlMatch,
    getBaseUrl,
  };
}

