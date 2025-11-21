import { currentPageService } from '../currentPageService';
import type { JsonRpcRequest, JsonRpcResponse } from '../../../rpc/protocol';

describe('currentPageService (RPC 架构)', () => {
  const originalSendMessage = (global as any).chrome?.runtime?.sendMessage;

  afterEach(() => {
    jest.useRealTimers();
    (global as any).chrome.runtime.sendMessage = originalSendMessage;
    (global as any).chrome.runtime.lastError = undefined;
  });

  it('resolves when background responds successfully', async () => {
    const page = { id: 'page-1', title: 'Test', url: 'https://example.com', tags: [] };

    // Mock RPC format response
    (global as any).chrome.runtime.sendMessage = jest.fn((
      message: JsonRpcRequest,
      callback?: (response: JsonRpcResponse) => void
    ) => {
      // 验证 RPC 消息格式
      expect(message.jsonrpc).toBe('2.0');
      expect(message.method).toBe('getCurrentPage');
      expect(message.id).toBeDefined();
      
      // 返回 RPC 格式的响应
      if (callback) {
        callback({
          jsonrpc: '2.0',
          id: message.id,
          result: page
        });
      }
    });

    const result = await currentPageService.getCurrentPage();

    expect(result).toEqual(page);
  });

  it('rejects when runtime lastError is set', async () => {
    (global as any).chrome.runtime.sendMessage = jest.fn((
      _message: JsonRpcRequest,
      callback?: (response: JsonRpcResponse) => void
    ) => {
      (global as any).chrome.runtime.lastError = { message: 'Service Worker 错误' };
      if (callback) {
        callback(undefined as any);
      }
    });

    await expect(currentPageService.getCurrentPage()).rejects.toThrow('Service Worker 错误');
  });

  it('rejects on timeout when no response is received', async () => {
    jest.useFakeTimers();

    (global as any).chrome.runtime.sendMessage = jest.fn((
      _message: JsonRpcRequest,
      _callback?: (response: JsonRpcResponse) => void
    ) => {
      // 故意不调用回调，触发超时
    });

    const promise = currentPageService.getCurrentPage();

    jest.advanceTimersByTime(10000);

    // RPC 架构的超时错误消息已更新
    await expect(promise).rejects.toThrow('RPC Call');
  });
});

