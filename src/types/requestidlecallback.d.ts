/**
 * requestIdleCallback 类型定义
 * 用于支持浏览器空闲回调 API，避免构建报错
 */

interface IdleRequestCallback {
  (deadline: IdleDeadline): void;
}

interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleRequestOptions {
  timeout?: number;
}

interface Window {
  requestIdleCallback?(
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ): number;
  cancelIdleCallback?(handle: number): void;
}

