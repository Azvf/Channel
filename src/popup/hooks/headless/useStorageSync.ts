/**
 * Storage 同步 Hook
 * 封装 Chrome Storage 变化监听和缓存同步逻辑
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';
import { STORAGE_KEYS } from '@/services/storageService';
import { getBaseUrl, isUrlMatch } from '@/shared/utils/urlUtils';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('useStorageSync');

export interface UseStorageSyncReturn {
  isSyncing: boolean;
}

/**
 * Storage 同步 Hook
 * 
 * 功能：
 * - 监听 Chrome Storage 的 PAGES 变化
 * - 同步更新 TanStack Query 缓存
 * - 处理 URL 匹配和缓存迁移
 * - 实现跨上下文的乐观更新
 * 
 * @param currentUrl - 当前 URL
 * @param currentPageRef - 当前页面引用
 * @param currentUrlRef - 当前 URL 引用
 * @param setCurrentUrl - 设置当前 URL 的函数
 * @param isMountedRef - 组件挂载状态引用
 * @returns 同步状态
 */
export function useStorageSync(
  currentUrl: string | undefined,
  currentPageRef: React.MutableRefObject<TaggedPage | undefined>,
  currentUrlRef: React.MutableRefObject<string | undefined>,
  setCurrentUrl: (url: string) => void,
  isMountedRef: React.MutableRefObject<boolean>
): UseStorageSyncReturn {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUrl) {
      return;
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: chrome.storage.AreaName
    ) => {
      // 检查组件是否已卸载
      if (!isMountedRef.current) {
        return;
      }

      // 只处理 local storage 的变化
      if (areaName !== 'local') {
        return;
      }

      // 检查 PAGES 是否发生变化
      const pagesChange = changes[STORAGE_KEYS.PAGES];
      if (!pagesChange || !pagesChange.newValue) {
        return;
      }

      // 从新的 pages 数据中查找当前页面
      const allPages = pagesChange.newValue as Record<string, TaggedPage>;
      // 使用 ref 获取最新的 currentPage，避免闭包问题
      const currentPageId = currentPageRef.current?.id;
      const currentPage = currentPageRef.current;
      const currentUrlValue = currentUrlRef.current;

      if (currentPageId && allPages[currentPageId] && currentUrlValue) {
        const updatedPage = allPages[currentPageId];

        // 检查页面对象是否有变化（不仅仅是 title）
        // 比较关键字段：title、url、updatedAt、titleManuallyEdited
        const hasChanges =
          !currentPage ||
          updatedPage.title !== currentPage.title ||
          updatedPage.url !== currentPage.url ||
          updatedPage.updatedAt !== currentPage.updatedAt ||
          updatedPage.titleManuallyEdited !== currentPage.titleManuallyEdited;

        if (hasChanges) {
          // [SSOT] 关键修复：始终使用页面对象中的 URL 作为缓存键，确保缓存键与页面对象中的 URL 一致
          const pageUrl = updatedPage.url;

          // [SSOT] 验证：确保 updatedPage 的 URL 与当前 URL 匹配（base URL 相同）
          // 如果不匹配，说明这是其他页面的数据更新，不应该更新当前缓存
          if (!isUrlMatch(pageUrl, currentUrlValue)) {
            logger.debug('[SSOT] Storage 更新：URL 不匹配，忽略更新', {
              pageUrl,
              currentUrl: currentUrlValue,
              pageBaseUrl: getBaseUrl(pageUrl),
              currentBaseUrl: currentUrlValue ? getBaseUrl(currentUrlValue) : 'undefined',
            });
            return; // 不更新缓存，保持 SSOT
          }

          // 检查 URL 是否发生变化
          const urlChanged = pageUrl !== currentPage?.url;

          if (urlChanged && currentPage) {
            // URL 变化时，清除旧缓存
            const oldUrl = currentPage.url;
            queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
            logger.debug('[SSOT] 检测到 URL 变化，已清除旧缓存', { oldUrl });

            // 更新 URL 引用和状态
            currentUrlRef.current = pageUrl;
            if (isMountedRef.current) {
              setCurrentUrl(pageUrl);
            }
          } else if (pageUrl !== currentUrlValue) {
            // 即使 URL 没有变化，但如果页面对象中的 URL 与 currentUrlValue 不同
            // 也需要更新 currentUrl 和缓存键（处理时间戳等情况）
            const oldUrl = currentUrlValue;
            if (oldUrl) {
              // [SSOT] 迁移前验证：确保旧缓存数据的 URL 与 pageUrl 匹配
              const oldCacheData = queryClient.getQueryData<TaggedPage>(
                queryKeys.currentPage(oldUrl)
              );
              if (oldCacheData && isUrlMatch(oldCacheData.url, pageUrl)) {
                // URL 匹配，可以安全迁移
                queryClient.setQueryData(queryKeys.currentPage(pageUrl), oldCacheData);
                queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
                logger.debug('[SSOT] 检测到 URL 不匹配（时间戳变化），已迁移缓存数据', {
                  oldUrl,
                  newUrl: pageUrl,
                });
              } else {
                // URL 不匹配，清除旧缓存，不迁移
                logger.debug('[SSOT] 旧缓存数据 URL 不匹配，清除旧缓存', {
                  oldUrl,
                  oldCacheUrl: oldCacheData?.url,
                  newUrl: pageUrl,
                });
                queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
              }
            }

            // 更新 URL 引用和状态
            currentUrlRef.current = pageUrl;
            if (isMountedRef.current) {
              setCurrentUrl(pageUrl);
            }
          }

          // [SSOT] 验证通过后，使用页面对象中的 URL 作为缓存键更新缓存
          const cacheKey = queryKeys.currentPage(pageUrl);
          queryClient.setQueryData(cacheKey, updatedPage);

          // 更新 currentPageRef，确保后续比较使用最新数据
          currentPageRef.current = updatedPage;

          logger.debug('[SSOT] 检测到页面数据更新，已同步缓存', {
            title: updatedPage.title,
            url: pageUrl,
            urlChanged,
            cacheKey: cacheKey.join('/'),
          });
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
    // 注意：currentPageRef, currentUrlRef, isMountedRef 是 ref，不需要加入依赖
    // setCurrentUrl 是稳定的引用（useCallback），但为了确保正确性，仍然加入依赖
  }, [currentUrl, queryClient, setCurrentUrl]);

  return {
    isSyncing: false, // 可以扩展为实际同步状态
  };
}

