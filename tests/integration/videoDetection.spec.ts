import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock supabase before importing
jest.mock('../../src/infra/database/supabase', () => require('../../src/infra/database/supabase/__mocks__/index'));

import { BackgroundServiceImpl } from '../../src/services/background/BackgroundServiceImpl';
import { GameplayStore } from '../../src/services/gameplayStore';
import { storageService, STORAGE_KEYS } from '../../src/services/storageService';
import { resetInitializationForTests } from '../../src/background/init';

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

// Mock services
jest.mock('../../src/services/timeService', () => ({
  timeService: {
    calibrate: jest.fn(() => Promise.resolve()),
    now: jest.fn(() => Date.now()),
    get isCalibrated() { return true; },
    getOffset: jest.fn(() => 0),
    reset: jest.fn(),
  },
}));

jest.mock('../../src/services/syncService', () => ({
  syncService: {
    initialize: jest.fn(() => Promise.resolve()),
    markTagChange: jest.fn(() => Promise.resolve()),
    markPageChange: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/services/storageService', () => {
  const actual = jest.requireActual('../../src/services/storageService') as any;
  return {
    ...actual,
    storageService: {
      getMultiple: jest.fn(() => Promise.resolve({
        [actual.STORAGE_KEYS.TAGS]: {},
        [actual.STORAGE_KEYS.PAGES]: {},
        [actual.STORAGE_KEYS.PAGE_SETTINGS]: { syncVideoTimestamp: true },
      })),
      setMultiple: jest.fn(() => Promise.resolve()),
    },
  };
});

describe('集成测试 - Background + Content Script 视频检测鲁棒性 (RPC 架构)', () => {
  let backgroundService: BackgroundServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInitializationForTests();
    GameplayStore.getInstance().clearAllData();
    
    // 确保 getPageSettings 返回 syncVideoTimestamp: true
    (storageService.getMultiple as jest.Mock<any>).mockResolvedValue({
      [STORAGE_KEYS.TAGS]: {},
      [STORAGE_KEYS.PAGES]: {},
      [STORAGE_KEYS.PAGE_SETTINGS]: { syncVideoTimestamp: true },
    });

    backgroundService = new BackgroundServiceImpl();
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

    // 直接调用 RPC 服务方法
    const page = await backgroundService.getCurrentPage();

    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    const callArgs = (chrome.scripting.executeScript as any).mock.calls[0][0];
    expect(callArgs.target.allFrames).toBe(true);
    
    // 验证 URL 包含了最大时间戳
    expect(page.url).toContain('t=250');
  });

  it('应该处理无视频的情况', async () => {
    // Mock executeScript 返回无视频的结果
    const mockResults = [
      { frameId: 0, result: 0 }, // 主 frame，无视频
      { frameId: 1, result: 0 }, // iframe 1，无视频
    ];

    (chrome.scripting.executeScript as any).mockResolvedValue(mockResults);

    const page = await backgroundService.getCurrentPage();

    // 验证 executeScript 被调用
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    // URL 不应该包含时间戳参数
    expect(page.url).toBe('https://example.com');
  });

  it('应该处理 Iframe 视频检测', async () => {
    // Mock executeScript 返回 iframe 中的视频
    const mockResults = [
      { frameId: 0, result: 0 },   // 主 frame，无视频
      { frameId: 1, result: 500 }, // iframe 中有视频，时间戳 500
    ];

    (chrome.scripting.executeScript as any).mockResolvedValue(mockResults);

    const page = await backgroundService.getCurrentPage();

    // 验证 executeScript 被调用，且 allFrames: true
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    const callArgs = (chrome.scripting.executeScript as any).mock.calls[0][0];
    expect(callArgs.target.allFrames).toBe(true);
    
    // 验证 URL 包含了 iframe 中的时间戳
    expect(page.url).toContain('t=500');
  });

  it('应该处理错误情况', async () => {
    // Mock executeScript 抛出错误
    (chrome.scripting.executeScript as any).mockRejectedValue(new Error('Script execution failed'));

    // 错误不应该导致整个方法失败，应该降级处理
    const page = await backgroundService.getCurrentPage();

    // 验证 executeScript 被调用
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
    // 即使脚本执行失败，也应该返回页面（使用原始 URL，不包含时间戳）
    expect(page).toBeDefined();
    expect(page.url).toBe('https://example.com');
  });
});
