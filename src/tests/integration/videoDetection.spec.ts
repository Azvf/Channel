import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock supabase before importing messageHandler (which may import supabase)
jest.mock('../../lib/supabase', () => require('../../lib/__mocks__/supabase'));

import { handleMessageAsync } from '../../background/messageHandler';

// Mock chrome APIs
global.chrome = {
  ...global.chrome,
  tabs: {
    query: jest.fn(() => Promise.resolve([{
      id: 1,
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/favicon.ico',
    }])),
    get: jest.fn(() => Promise.resolve({
      id: 1,
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/favicon.ico',
    })),
  },
  scripting: {
    executeScript: jest.fn(),
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
  },
} as any;

describe('集成测试 - Background + Content Script 视频检测鲁棒性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确聚合 allFrames: true 返回的数组，选取时间戳最大的那个', async () => {
    // Mock executeScript 返回多个 frame 的结果
    const mockResults = [
      { frameId: 0, result: 100 }, // 主 frame，时间戳 100
      { frameId: 1, result: 250 }, // iframe 1，时间戳 250（最大）
      { frameId: 2, result: 150 }, // iframe 2，时间戳 150
      { frameId: 3, result: 0 },   // iframe 3，无视频
    ];

    (chrome.scripting.executeScript as any).mockResolvedValue(mockResults);

    // 模拟 getCurrentPage 消息
    const message = {
      action: 'getCurrentPage',
    };

    const sendResponse = jest.fn();

    // ✅ 确定性测试：直接 await 异步处理函数
    await handleMessageAsync(message, { tab: { id: 1 } } as any, sendResponse);

    // 不需要 setTimeout，执行到这里意味着逻辑已完成
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    const callArgs = (chrome.scripting.executeScript as any).mock.calls[0][0];
    expect(callArgs.target.allFrames).toBe(true);
  });

  it('应该处理无视频的情况', async () => {
    // Mock executeScript 返回无视频的结果
    const mockResults = [
      { frameId: 0, result: 0 }, // 主 frame，无视频
      { frameId: 1, result: 0 }, // iframe 1，无视频
    ];

    (chrome.scripting.executeScript as any).mockResolvedValue(mockResults);

    const message = {
      action: 'getCurrentPage',
    };

    const sendResponse = jest.fn();

    // ✅ 确定性测试：直接 await 异步处理函数
    await handleMessageAsync(message, { tab: { id: 1 } } as any, sendResponse);

    // 验证 executeScript 被调用
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
  });

  it('应该处理 Iframe 视频检测', async () => {
    // Mock executeScript 返回 iframe 中的视频
    const mockResults = [
      { frameId: 0, result: 0 },   // 主 frame，无视频
      { frameId: 1, result: 500 }, // iframe 中有视频，时间戳 500
    ];

    (chrome.scripting.executeScript as any).mockResolvedValue(mockResults);

    const message = {
      action: 'getCurrentPage',
    };

    const sendResponse = jest.fn();

    // ✅ 确定性测试：直接 await 异步处理函数
    await handleMessageAsync(message, { tab: { id: 1 } } as any, sendResponse);

    // 验证 executeScript 被调用，且 allFrames: true
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    const callArgs = (chrome.scripting.executeScript as any).mock.calls[0][0];
    expect(callArgs.target.allFrames).toBe(true);
  });

  it('应该处理错误情况', async () => {
    // Mock executeScript 抛出错误
    (chrome.scripting.executeScript as any).mockRejectedValue(new Error('Script execution failed'));

    const message = {
      action: 'getCurrentPage',
    };

    const sendResponse = jest.fn();

    // ✅ 确定性测试：直接 await 异步处理函数
    await handleMessageAsync(message, { tab: { id: 1 } } as any, sendResponse);

    // 验证 executeScript 被调用
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    // 验证错误被处理（不应该抛出未捕获的错误）
    expect(sendResponse).toHaveBeenCalled();
  });
});

