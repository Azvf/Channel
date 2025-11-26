/**
 * Title Refetch Hook
 * 封装 title 为 URL 时的定期 refetch 逻辑
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';
import { isTitleUrl } from '@/shared/utils/titleUtils';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('useTitleRefetch');

export interface UseTitleRefetchReturn {
  isRefetching: boolean;
}

/**
 * Title Refetch Hook
 * 
 * 功能：
 * - 检测 title 是否为 URL 样式
 * - 如果是，定期 refetch（最多尝试 3 次）
 * - 如果 title 更新为非 URL，停止定时器
 * 
 * @param currentPage - 当前页面数据
 * @param currentUrl - 当前 URL
 * @param refreshPage - refetch 函数
 * @param isMountedRef - 组件挂载状态引用
 * @returns refetch 状态
 */
export function useTitleRefetch(
  currentPage: TaggedPage | undefined,
  currentUrl: string | undefined,
  refreshPage: () => void,
  isMountedRef: React.MutableRefObject<boolean>
): UseTitleRefetchReturn {
  const queryClient = useQueryClient();
  const isRefetchingRef = useRef(false);

  useEffect(() => {
    // 优化条件判断：确保有 currentUrl 且 currentPage 存在
    if (!currentUrl) {
      return;
    }

    // 如果 currentPage 不存在，等待它加载完成
    if (!currentPage) {
      return;
    }

    // 如果 title 不是 URL 样式，不需要 refetch
    if (!isTitleUrl(currentPage.title, currentPage.url)) {
      return;
    }

    // 延迟启动定时器，避免在 popup 打开时立即启动，给初始渲染留出时间
    const startTimerDelay = 500; // 延迟 500ms 启动定时器
    let refetchInterval: NodeJS.Timeout | null = null;

    const timerId = setTimeout(() => {
      // 检查组件是否已卸载
      if (!isMountedRef.current) {
        return;
      }

      // 延迟后再次检查条件，确保仍然需要定时器
      const currentPageData = queryClient.getQueryData<TaggedPage>(
        queryKeys.currentPage(currentUrl)
      );

      if (!currentPageData || !isTitleUrl(currentPageData.title, currentPageData.url)) {
        return;
      }

      // 如果 title 是 URL 样式，设置定时器定期 refetch（最多尝试 3 次，每次间隔 1.5 秒）
      let attemptCount = 0;
      const maxAttempts = 3; // 最多尝试 3 次
      const interval = 1500; // 1.5 秒间隔

      isRefetchingRef.current = true;
      refetchInterval = setInterval(() => {
        // 检查组件是否已卸载
        if (!isMountedRef.current) {
          if (refetchInterval) {
            clearInterval(refetchInterval);
            refetchInterval = null;
          }
          isRefetchingRef.current = false;
          return;
        }

        // 检查当前页面数据
        const currentPageData = queryClient.getQueryData<TaggedPage>(
          queryKeys.currentPage(currentUrl)
        );

        if (!currentPageData) {
          // 如果页面数据不存在，继续等待，不触发 refetch（避免在加载过程中重复请求）
          return;
        }

        // 如果 title 已经更新为非 URL，停止定时器
        if (!isTitleUrl(currentPageData.title, currentPageData.url)) {
          logger.debug('Title 已更新为非 URL，停止 refetch', { title: currentPageData.title });
          if (refetchInterval) {
            clearInterval(refetchInterval);
            refetchInterval = null;
          }
          isRefetchingRef.current = false;
          return;
        }

        // 如果达到最大尝试次数，停止定时器
        if (attemptCount >= maxAttempts) {
          logger.debug('达到最大尝试次数，停止 refetch');
          if (refetchInterval) {
            clearInterval(refetchInterval);
            refetchInterval = null;
          }
          isRefetchingRef.current = false;
          return;
        }

        // 触发 refetch（只在组件仍然挂载时）
        if (isMountedRef.current) {
          logger.debug(`触发 refetch 以获取真实 title (尝试 ${attemptCount + 1}/${maxAttempts})`);
          refreshPage();
          attemptCount++;
        }
      }, interval);
    }, startTimerDelay);

    return () => {
      clearTimeout(timerId);
      if (refetchInterval) {
        clearInterval(refetchInterval);
        refetchInterval = null;
      }
      isRefetchingRef.current = false;
    };
    // 注意：isMountedRef 是 ref，不需要加入依赖
    // refreshPage 是稳定的引用，但为了确保正确性，仍然加入依赖
  }, [currentPage, currentUrl, queryClient, refreshPage]);

  return {
    isRefetching: isRefetchingRef.current,
  };
}

