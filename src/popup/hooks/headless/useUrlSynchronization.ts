/**
 * URL 同步 Hook
 * 封装页面数据返回后的 URL 同步逻辑，处理时间戳变化等情况
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';
import { getBaseUrl, isUrlMatch } from '@/shared/utils/urlUtils';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('useUrlSynchronization');

export interface UseUrlSynchronizationOptions {
  currentPage: TaggedPage | undefined;
  currentUrlRef: React.MutableRefObject<string | undefined>;
  setCurrentUrl: (url: string) => void;
  isMountedRef: React.MutableRefObject<boolean>;
}

/**
 * URL 同步 Hook
 * 
 * 功能：
 * - 当 getCurrentPage() 返回数据后，使用页面对象中的 URL 更新 currentUrl 和缓存键
 * - 处理 URL 时间戳变化导致的缓存键不匹配问题
 * - 处理真正的 URL 变化（base URL 不同）
 * 
 * @param options - 配置选项
 */
export function useUrlSynchronization({
  currentPage,
  currentUrlRef,
  setCurrentUrl,
  isMountedRef,
}: UseUrlSynchronizationOptions): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentPage || !isMountedRef.current) {
      return;
    }

    const pageUrl = currentPage.url;
    const currentUrlValue = currentUrlRef.current;

    // 只在 URL 真正不同时才更新（避免不必要的更新）
    if (pageUrl && pageUrl !== currentUrlValue) {
      // [SSOT] 检查是否是时间戳导致的差异（URL 包含 ?t= 或类似的 searchParams）
      // 如果 base URL 相同，说明可能是时间戳变化，需要更新缓存键
      // 使用统一的 getBaseUrl 函数进行比较
      const baseUrlMatch = currentUrlValue && getBaseUrl(pageUrl) === getBaseUrl(currentUrlValue);

      // 如果 URL 差异是由于时间戳导致的，需要更新缓存键
      // 否则，可能是真正的 URL 变化（比如从 extension 页面切换到普通网页）
      if (baseUrlMatch) {
        // base URL 相同，只是时间戳不同，可以安全迁移缓存
        logger.debug('[SSOT] 检测到页面 URL 与缓存键不匹配（时间戳变化），同步 URL', {
          oldUrl: currentUrlValue,
          newUrl: pageUrl,
        });

        // 如果旧 URL 存在，将缓存数据迁移到新 URL 的缓存键
        if (currentUrlValue) {
          const oldCacheData = queryClient.getQueryData<TaggedPage>(
            queryKeys.currentPage(currentUrlValue)
          );

          // [SSOT] 验证旧缓存数据的 URL 是否匹配（防止错误迁移）
          if (
            oldCacheData &&
            isUrlMatch(oldCacheData.url, currentUrlValue) &&
            isUrlMatch(oldCacheData.url, pageUrl)
          ) {
            // 旧缓存数据的 URL 与新旧 URL 都匹配，可以安全迁移
            queryClient.setQueryData(queryKeys.currentPage(pageUrl), oldCacheData);
            // 清除旧缓存
            queryClient.removeQueries({ queryKey: queryKeys.currentPage(currentUrlValue) });
            logger.debug('[SSOT] 已迁移缓存数据到新 URL 的缓存键');
          } else {
            // 旧缓存数据 URL 不匹配，清除它
            logger.debug('[SSOT] 旧缓存数据 URL 不匹配，清除旧缓存', {
              oldCacheUrl: oldCacheData?.url,
              oldUrl: currentUrlValue,
              newUrl: pageUrl,
            });
            queryClient.removeQueries({ queryKey: queryKeys.currentPage(currentUrlValue) });
          }
        }

        // 更新 URL 引用和状态
        currentUrlRef.current = pageUrl;
        if (isMountedRef.current) {
          setCurrentUrl(pageUrl);
        }
      } else if (!currentUrlValue) {
        // 首次加载，直接更新 URL
        currentUrlRef.current = pageUrl;
        if (isMountedRef.current) {
          setCurrentUrl(pageUrl);
        }
      } else {
        // [SSOT] base URL 不同，这是真正的 URL 变化（比如从 extension 页面切换到普通网页）
        // 清除旧缓存，不进行迁移，确保 SSOT
        logger.debug('[SSOT] 检测到 base URL 变化，清除旧缓存，不迁移', {
          oldUrl: currentUrlValue,
          newUrl: pageUrl,
          oldBaseUrl: getBaseUrl(currentUrlValue),
          newBaseUrl: getBaseUrl(pageUrl),
        });

        if (currentUrlValue) {
          queryClient.removeQueries({ queryKey: queryKeys.currentPage(currentUrlValue) });
        }

        // 更新 URL 引用和状态
        currentUrlRef.current = pageUrl;
        if (isMountedRef.current) {
          setCurrentUrl(pageUrl);
        }
      }
    }
    // 注意：isMountedRef, currentUrlRef 是 ref，不需要加入依赖
    // setCurrentUrl 是稳定的引用（useCallback），但为了确保正确性，仍然加入依赖
  }, [currentPage, queryClient, setCurrentUrl]);
}

