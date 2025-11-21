/**
 * 错误类型定义
 */

/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  constructor(
    message: string = '网络连接失败，请检查网络设置',
    public readonly originalError?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message, 'NETWORK_ERROR', { originalError, retryable });
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * 存储错误
 */
export class StorageError extends AppError {
  constructor(
    message: string = '存储操作失败',
    public readonly originalError?: unknown
  ) {
    super(message, 'STORAGE_ERROR', { originalError });
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }

  getUserMessage(): string {
    return '数据保存失败，请重试';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * RPC 错误
 */
export class RpcError extends AppError {
  constructor(
    message: string = '请求失败，请重试',
    public readonly method?: string,
    public readonly originalError?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message, 'RPC_ERROR', { method, originalError, retryable });
    this.name = 'RpcError';
    Object.setPrototypeOf(this, RpcError.prototype);
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * 错误工具函数
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return error.retryable;
  }
  if (error instanceof RpcError) {
    return error.retryable;
  }
  if (error instanceof Error) {
    // 检查常见的可重试错误
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    );
  }
  return false;
}

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.getUserMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '发生未知错误，请重试';
}

