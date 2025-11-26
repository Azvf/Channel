/**
 * 防抖 Refetch Hook
 * 封装防抖的 refetch 逻辑，避免短时间内多次调用
 */

import { useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { TaggedPage } from '@/shared/types/gameplayTag';

export interface UseDebouncedRefetchReturn {
  debouncedRefetch: () => void;
  cancel: () => void;
}

/**
 * 防抖 Refetch Hook
 * 
 * 功能：
 * - 防抖 refetch 调用
 * - 检查缓存状态，避免不必要的 refetch
 * - 提供清理方法
 * 
 * @param refreshPageRef - refetch 函数引用
 * @param currentUrlRef - 当前 URL 引用
 * @param isMountedRef - 组件挂载状态引用
 * @returns 防抖 refetch 相关的方法
 */
export function useDebouncedRefetch(
  refreshPageRef: React.MutableRefObject<(() => void) | null>,
  currentUrlRef: React.MutableRefObject<string | undefined>,
  isMountedRef: React.MutableRefObject<boolean>
): UseDebouncedRefetchReturn {
  const queryClient = useQueryClient();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedRefetch = useMemo(() => {
    return () => {
      // 检查组件是否已卸载
      if (!isMountedRef.current) {
        return;
      }

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(() => {
        // 再次检查组件是否已卸载
        if (!isMountedRef.current || !refreshPageRef.current) {
          timeoutIdRef.current = null;
          return;
        }

        // 优化：检查缓存是否存在
        const currentUrlValue = currentUrlRef.current;
        if (currentUrlValue) {
          const cachedData = queryClient.getQueryData<TaggedPage>(
            queryKeys.currentPage(currentUrlValue)
          );

          if (cachedData) {
            // 缓存已存在，跳过 refetch
            console.log('[useDebouncedRefetch] 缓存已存在，跳过 refetch，使用缓存数据');
            timeoutIdRef.current = null;
            return;
          }
        }

        // 缓存不存在时才触发 refetch
        refreshPageRef.current();
        timeoutIdRef.current = null;
      }, 50); // 50ms 防抖延迟，合并短时间内的多次调用
    };
  }, [refreshPageRef, currentUrlRef, isMountedRef, queryClient]);

  const cancel = useMemo(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []);

  return {
    debouncedRefetch,
    cancel,
  };
}

