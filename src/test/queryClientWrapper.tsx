/**
 * 测试用的 QueryClient Provider Wrapper
 * 用于在测试中提供 TanStack Query 的上下文
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * 创建一个新的 QueryClient 实例用于测试
 * 配置为快速失败，避免测试超时
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 测试中不重试，快速失败
        gcTime: 0, // 测试中立即回收，避免内存泄漏
      },
      mutations: {
        retry: false, // 测试中不重试
      },
    },
  });
}

/**
 * 测试用的 QueryClient Provider Wrapper
 * 用法：
 * ```tsx
 * render(
 *   <QueryClientWrapper>
 *     <YourComponent />
 *   </QueryClientWrapper>
 * );
 * ```
 */
export function QueryClientWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

