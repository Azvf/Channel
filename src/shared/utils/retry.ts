/**
 * 重试工具函数
 */

import { isRetryableError } from '../types/errors';

export interface RetryOptions {
  /**
   * 最大重试次数
   */
  maxRetries?: number;
  
  /**
   * 初始延迟（毫秒）
   */
  initialDelay?: number;
  
  /**
   * 最大延迟（毫秒）
   */
  maxDelay?: number;
  
  /**
   * 延迟增长因子
   */
  backoffFactor?: number;
  
  /**
   * 是否只重试可重试的错误
   */
  retryableOnly?: boolean;
  
  /**
   * 自定义重试条件
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableOnly: true,
};

/**
 * 计算延迟时间（指数退避）
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'shouldRetry'>>): number {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * 带重试的异步函数执行器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 检查是否应该重试
      if (attempt >= opts.maxRetries) {
        break;
      }

      // 如果设置了只重试可重试的错误，检查错误类型
      if (opts.retryableOnly && !isRetryableError(error)) {
        break;
      }

      // 自定义重试条件
      if (opts.shouldRetry && !opts.shouldRetry(error, attempt)) {
        break;
      }

      // 计算延迟并等待
      const delay = calculateDelay(attempt, opts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 创建重试装饰器
 */
export function retryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}

