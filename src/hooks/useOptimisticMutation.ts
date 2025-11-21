/**
 * 乐观更新通用 Hook
 * 封装"预测-执行-回滚"的原子操作，提供统一的乐观更新能力
 */

import { useState, useCallback, useRef } from 'react';
import { withRetry, RetryOptions } from '../utils/retry';
import { RpcError, NetworkError, getUserFriendlyMessage } from '../types/errors';

/**
 * 乐观更新配置接口
 */
export interface MutationConfig<TData, TVariables, TContext = unknown> {
  /**
   * 实际的异步操作（RPC Call）
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * 乐观更新逻辑：返回回滚所需的上下文（快照）
   */
  onMutate: (variables: TVariables) => Promise<TContext> | TContext;

  /**
   * 错误回滚逻辑
   */
  onError?: (error: unknown, variables: TVariables, context: TContext | undefined) => void;

  /**
   * 成功/结算后的逻辑（如重新拉取数据）
   */
  onSettled?: (
    data: TData | undefined,
    error: unknown,
    variables: TVariables,
    context: TContext | undefined
  ) => void;

  /**
   * 成功回调
   */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
  
  /**
   * 重试配置
   */
  retry?: RetryOptions | boolean;
  
  /**
   * 错误消息格式化
   */
  getErrorMessage?: (error: unknown) => string;
}

/**
 * 乐观更新 Hook 返回值
 */
export interface UseOptimisticMutationReturn<TData, TVariables> {
  /**
   * 执行变更
   */
  mutate: (variables: TVariables) => Promise<TData>;

  /**
   * 是否正在加载
   */
  isLoading: boolean;

  /**
   * 错误信息
   */
  error: unknown;

  /**
   * 取消当前请求
   */
  cancel: () => void;

  /**
   * 重置状态
   */
  reset: () => void;
}

/**
 * 乐观更新通用 Hook
 * 
 * @example
 * ```tsx
 * const { mutate: updateTitle } = useOptimisticMutation({
 *   mutationFn: (newTitle: string) => backgroundApi.updatePageTitle(pageId, newTitle),
 *   onMutate: (newTitle) => {
 *     const previousTitle = pageData?.title;
 *     setPageData(prev => prev ? { ...prev, title: newTitle } : null);
 *     return { previousTitle };
 *   },
 *   onError: (err, newTitle, context) => {
 *     if (context?.previousTitle) {
 *       setPageData(prev => prev ? { ...prev, title: context.previousTitle! } : null);
 *     }
 *   }
 * });
 * ```
 */
export function useOptimisticMutation<TData, TVariables, TContext = unknown>(
  config: MutationConfig<TData, TVariables, TContext>
): UseOptimisticMutationReturn<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  
  // 使用 ref 追踪最新的上下文，避免闭包问题
  const contextRef = useRef<TContext | undefined>();
  const variablesRef = useRef<TVariables | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);

      let context: TContext | undefined;

      try {
        // 1. 触发乐观更新
        context = await config.onMutate(variables);
        contextRef.current = context; // 保存上下文
        variablesRef.current = variables; // 保存变量

        // 检查是否已取消
        if (abortController.signal.aborted) {
          // 回滚乐观更新
          config.onError?.(new Error('Cancelled'), variables, context);
          throw new Error('Mutation cancelled');
        }

        // 2. 执行实际请求（带重试）
        const executeMutation = async () => {
          try {
            return await config.mutationFn(variables);
          } catch (err) {
            // 包装错误以便更好地处理
            if (err instanceof Error) {
              // 检查是否是网络相关错误
              const message = err.message.toLowerCase();
              if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
                throw new NetworkError(getUserFriendlyMessage(err), err);
              }
              // 检查是否是 RPC 错误
              if (message.includes('rpc') || message.includes('jsonrpc')) {
                throw new RpcError(getUserFriendlyMessage(err), undefined, err);
              }
            }
            throw err;
          }
        };
        
        const data = config.retry !== false
          ? await withRetry(executeMutation, typeof config.retry === 'object' ? config.retry : {})
          : await executeMutation();

        // 再次检查是否已取消
        if (abortController.signal.aborted) {
          config.onError?.(new Error('Cancelled'), variables, context);
          throw new Error('Mutation cancelled');
        }

        // 3. 成功处理
        config.onSuccess?.(data, variables, context);
        config.onSettled?.(data, null, variables, context);
        
        return data;
      } catch (err) {
        // 4. 失败回滚（使用最新的上下文）
        if (!abortController.signal.aborted) {
          const errorMessage = config.getErrorMessage
            ? config.getErrorMessage(err)
            : getUserFriendlyMessage(err);
          
          // 如果错误消息不同，创建一个新的错误对象
          const finalError = errorMessage !== getUserFriendlyMessage(err)
            ? new Error(errorMessage)
            : err;
          
          config.onError?.(finalError, variables, contextRef.current);
          config.onSettled?.(undefined, finalError, variables, contextRef.current);
          setError(finalError);
        }
        throw err;
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      }
    },
    [config]
  );

  // 取消方法
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // 触发错误回调以回滚乐观更新
      if (contextRef.current !== undefined && variablesRef.current !== undefined) {
        config.onError?.(new Error('Cancelled'), variablesRef.current, contextRef.current);
      }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [config]);

  // 重置方法
  const reset = useCallback(() => {
    cancel();
    setError(null);
    setIsLoading(false);
    contextRef.current = undefined;
    variablesRef.current = undefined;
  }, [cancel]);

  return { mutate, isLoading, error, cancel, reset };
}

