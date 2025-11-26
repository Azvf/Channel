// src/services/background/__tests__/TitleFetchService.test.ts

import { titleFetchService } from '../TitleFetchService';

// Mock chrome API
const mockChrome = {
  tabs: {
    get: jest.fn(),
    sendMessage: jest.fn(),
  },
};

(global as any).chrome = mockChrome;

describe('TitleFetchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 清理缓存
    titleFetchService.clearAllCache();
  });

  describe('降级策略', () => {
    it('应该在 content script 失败时使用域名作为降级标题', async () => {
      const tabId = 1;
      const url = 'https://example.com/page';
      const pageId = 'p1';

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: url,
      });
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Content script failed'));

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: url, // 当前 title 是 URL
      }));

      // 执行
      await titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 验证降级策略被调用，使用域名作为 title
      expect(updateCallback).toHaveBeenCalledWith(pageId, 'example.com');
    });

    it('应该从 URL 正确提取域名（移除 www 前缀）', async () => {
      const tabId = 1;
      const url = 'https://www.example.com/page';
      const pageId = 'p1';

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: url,
      });
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Failed'));

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: url,
      }));

      await titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 验证 www 前缀被移除
      expect(updateCallback).toHaveBeenCalledWith(pageId, 'example.com');
    });

    it('应该处理无效 URL 的情况', async () => {
      const tabId = 1;
      const invalidUrl = 'not-a-valid-url';
      const pageId = 'p1';

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: invalidUrl,
      });
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Failed'));

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: invalidUrl,
      }));

      await titleFetchService.fetchAndUpdateTitle(
        tabId,
        invalidUrl,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 无效 URL 时，降级策略应该返回 null，不会调用 updateCallback
      expect(updateCallback).not.toHaveBeenCalled();
    });
  });

  describe('重试机制', () => {
    it('应该在失败时自动重试', async () => {
      const tabId = 1;
      const url = 'https://example.com/page';
      const pageId = 'p1';
      let attemptCount = 0;

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: url,
      });
      mockChrome.tabs.sendMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          success: true,
          data: { title: 'Real Title' },
        });
      });

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: url,
      }));

      // 使用 Promise.race 来避免测试超时
      const testPromise = titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 等待足够的时间让重试完成（初始尝试 + 第一次重试延迟 500ms + 第二次尝试）
      await Promise.race([
        testPromise,
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);

      // 验证重试了（总共尝试了 2 次）
      expect(attemptCount).toBe(2);
      expect(updateCallback).toHaveBeenCalledWith(pageId, 'Real Title');
    });

    it('应该在重试次数用尽后使用降级策略', async () => {
      const tabId = 1;
      const url = 'https://example.com/page';
      const pageId = 'p1';

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: url,
      });
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Network error'));

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: url,
      }));

      const testPromise = titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 等待所有重试完成（初始尝试 + 2 次重试，每次延迟 500ms 和 1000ms）
      await Promise.race([
        testPromise,
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);

      // 验证降级策略被调用
      expect(updateCallback).toHaveBeenCalledWith(pageId, 'example.com');
    });

    it('应该在 tab 关闭时取消重试且不使用降级策略', async () => {
      const tabId = 1;
      const url = 'https://example.com/page';
      const pageId = 'p1';

      // 第一次调用返回有效 tab，后续调用返回 null（tab 已关闭）
      mockChrome.tabs.get
        .mockResolvedValueOnce({
          id: tabId,
          url: url,
        })
        .mockResolvedValueOnce(null) // 第一次重试检查时 tab 已关闭
        .mockResolvedValueOnce(null); // 降级策略检查时 tab 已关闭

      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Network error'));

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: url,
      }));

      const testPromise = titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 等待重试延迟
      await Promise.race([
        testPromise,
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);

      // 验证在 tab 关闭后没有继续重试，也没有调用 updateCallback（包括降级策略）
      expect(updateCallback).not.toHaveBeenCalled();
    });
  });

  describe('请求缓存', () => {
    it('应该复用相同 tab 的请求', async () => {
      const tabId = 1;
      const url = 'https://example.com/page';
      const pageId = 'p1';

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: url,
      });
      mockChrome.tabs.sendMessage.mockResolvedValue({
        success: true,
        data: { title: 'Real Title' },
      });

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: url,
      }));

      // 同时发起两个请求
      const promise1 = titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );
      const promise2 = titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      await Promise.all([promise1, promise2]);

      // 验证 sendMessage 只被调用一次（请求被复用）
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      // 但 updateCallback 应该被调用两次（每个请求都会更新）
      expect(updateCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('防止覆盖用户编辑', () => {
    it('应该跳过更新如果 title 已被用户编辑', async () => {
      const tabId = 1;
      const url = 'https://example.com/page';
      const pageId = 'p1';

      mockChrome.tabs.get.mockResolvedValue({
        id: tabId,
        url: url,
      });
      mockChrome.tabs.sendMessage.mockResolvedValue({
        success: true,
        data: { title: 'Real Title' },
      });

      const updateCallback = jest.fn().mockResolvedValue(undefined);
      // 模拟用户已经编辑了 title（不再是 URL）
      const getCurrentPage = jest.fn(() => ({
        id: pageId,
        title: 'User Edited Title',
      }));

      await titleFetchService.fetchAndUpdateTitle(
        tabId,
        url,
        pageId,
        updateCallback,
        getCurrentPage
      );

      // 验证没有调用 updateCallback（因为 title 已被用户编辑）
      expect(updateCallback).not.toHaveBeenCalled();
    });
  });
});

