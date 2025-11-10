import { currentPageService } from '../currentPageService';

const ORIGINAL_HANDLER = (global as any).__CHROME_SEND_MESSAGE_HANDLER__;

describe('currentPageService', () => {
  afterEach(() => {
    jest.useRealTimers();
    (global as any).__CHROME_SEND_MESSAGE_HANDLER__ = ORIGINAL_HANDLER;
    (global as any).__MOCK_CHROME_RESPONSE__ = undefined;
    (global as any).chrome.runtime.lastError = undefined;
  });

  it('resolves when background responds successfully', async () => {
    const page = { id: 'page-1', title: 'Test', url: 'https://example.com', tags: [] };

    (global as any).__CHROME_SEND_MESSAGE_HANDLER__ = (message: any, callback?: (response: any) => void) => {
      expect(message.action).toBe('getCurrentPage');
      callback?.({ success: true, data: page });
    };

    const result = await currentPageService.getCurrentPage();

    expect(result).toEqual(page);
  });

  it('rejects when runtime lastError is set', async () => {
    (global as any).__CHROME_SEND_MESSAGE_HANDLER__ = (_message: any, callback?: (response: any) => void) => {
      (global as any).chrome.runtime.lastError = { message: 'Service Worker 错误' };
      callback?.(undefined);
    };

    await expect(currentPageService.getCurrentPage()).rejects.toThrow('Service Worker 错误');
  });

  it('rejects on timeout when no response is received', async () => {
    jest.useFakeTimers();

    (global as any).__CHROME_SEND_MESSAGE_HANDLER__ = (_message: any, _callback?: (response: any) => void) => {
      // 故意不调用回调，触发超时
    };

    const promise = currentPageService.getCurrentPage();

    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('消息超时');
  });
});

