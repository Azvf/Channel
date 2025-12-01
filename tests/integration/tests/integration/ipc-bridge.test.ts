import { resetInitializationForTests } from '../../../../src/background/init';
import { currentPageService } from '../../../../src/services/popup/currentPageService';
import { GameplayStore } from '../../../../src/services/gameplayStore';
import { storageService, STORAGE_KEYS } from '../../../../src/services/storageService';
import { BackgroundServiceImpl } from '../../../../src/services/background/BackgroundServiceImpl';
import { registerRpcHandler } from '../../../../src/shared/rpc-protocol/server';
import { JsonRpcRequest, JsonRpcResponse } from '../../../../src/shared/rpc-protocol/protocol';

// Mock supabase before any imports
jest.mock('../../../../src/infra/database/supabase', () => {
  const { createClient } = require('@supabase/supabase-js');
  const mockSupabaseUrl = 'https://mock.supabase.co';
  const mockSupabaseKey = 'mock-anon-key';
  
  const chromeStorageAdapter = {
    getItem: async (key: string): Promise<string | null> => {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      });
    },
    setItem: async (key: string, value: string): Promise<void> => {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      });
    },
    removeItem: async (key: string): Promise<void> => {
      return new Promise((resolve) => {
        chrome.storage.local.remove(key, () => resolve());
      });
    },
  };

  return {
    supabase: createClient(mockSupabaseUrl, mockSupabaseKey, {
      auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }),
  };
});

// Mock timeService to avoid import.meta.env issues
jest.mock('../../../../src/services/timeService', () => ({
  timeService: {
    calibrate: jest.fn(() => Promise.resolve()),
    now: jest.fn(() => Date.now()),
    get isCalibrated() { return true; },
    getOffset: jest.fn(() => 0),
    reset: jest.fn(),
  },
}));

// Mock syncService to avoid import.meta.env issues
jest.mock('../../../../src/services/syncService', () => {
  return {
    syncService: {
      initialize: jest.fn(() => Promise.resolve()),
      markTagChange: jest.fn(() => Promise.resolve()),
      markPageChange: jest.fn(() => Promise.resolve()),
      sync: jest.fn(() => Promise.resolve()),
      syncAll: jest.fn(() => Promise.resolve()),
      getSyncState: jest.fn(() => ({
        isSyncing: false,
        lastSyncAt: null,
        pendingChangesCount: 0,
        error: null,
      })),
    },
  };
});

jest.mock('../../../../src/services/storageService', () => {
  const actual = jest.requireActual('../../../../src/services/storageService');

  const mockStorage = {
    getMultiple: jest.fn(),
    setMultiple: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    removeMultiple: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
  };

  return {
    ...actual,
    storageService: mockStorage,
  };
});

type MockedStorageService = {
  getMultiple: jest.Mock<Promise<Record<string, unknown>>, [string[]]>;
  setMultiple: jest.Mock<Promise<void>, [Record<string, unknown>]>;
};

const mockedStorage = storageService as unknown as MockedStorageService;

let memoryStorage: Record<string, any> = {};
let backgroundService: BackgroundServiceImpl;

// Mock chrome.runtime.sendMessage to intercept RPC calls
beforeEach(() => {
  jest.clearAllMocks();

  memoryStorage = {};

  mockedStorage.getMultiple.mockReset();
  mockedStorage.setMultiple.mockReset();

  mockedStorage.getMultiple.mockImplementation(async (keys: string[]) => {
    const result: Record<string, unknown> = {};
    keys.forEach(key => {
      result[key] = Object.prototype.hasOwnProperty.call(memoryStorage, key)
        ? memoryStorage[key]
        : null;
    });
    return result;
  });

  mockedStorage.setMultiple.mockImplementation(async (data: Record<string, unknown>) => {
    Object.keys(data).forEach(key => {
      memoryStorage[key] = data[key];
    });
  });

  // 初始化 RPC 服务
  backgroundService = new BackgroundServiceImpl();
  registerRpcHandler(backgroundService);

  // Mock chrome.runtime.sendMessage to handle RPC requests
  // 模拟完整的 RPC 服务器流程，包括初始化、时间校准、业务逻辑、commit
  (global as any).chrome.runtime.sendMessage = jest.fn((
    message: JsonRpcRequest,
    callback?: (response: JsonRpcResponse) => void
  ) => {
    // 模拟完整的 RPC 服务器流程
    (async () => {
      try {
        const method = (backgroundService as any)[message.method];
        if (typeof method !== 'function') {
          if (callback) {
            callback({
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32601,
                message: `Method '${message.method}' not found`
              }
            });
          }
          return;
        }

        // 1. 确保初始化（模拟 RPC 服务器）
        const { getInitializationPromise } = require('../../../../src/background/init');
        await getInitializationPromise();

        // 2. 如果是写入操作，时间校准（模拟 RPC 服务器）
        const isWriteOp = ['create', 'update', 'delete', 'add', 'remove', 'import'].some(
          prefix => message.method.toLowerCase().startsWith(prefix)
        );
        if (isWriteOp) {
          const { timeService } = require('../../../../src/services/timeService');
          await timeService.calibrate().catch(() => {});
        }

        // 3. 执行业务逻辑
        const result = await method.apply(backgroundService, message.args);

        // 4. 事务提交（模拟 RPC 服务器）- 这是关键！会触发存储保存
        const store = GameplayStore.getInstance();
        await store.commit();

        // 5. 返回结果
        if (callback) {
          callback({
            jsonrpc: '2.0',
            id: message.id,
            result
          });
        }
      } catch (error: any) {
        if (callback) {
          callback({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: error.message || 'Internal error',
              stack: error.stack
            }
          });
        }
      }
    })();
  });

  resetInitializationForTests();
  GameplayStore.getInstance().clearAllData();
  (global as any).chrome.runtime.lastError = undefined;
});

afterEach(() => {
  delete (global as any).chrome.runtime.sendMessage;
});

describe('IPC 桥集成测试 (RPC 架构)', () => {
  it('应该完整测试：创建标签 -> 保存 -> 重新获取', async () => {
    // 设置 mock tab
    (global as any).chrome.tabs = {
      query: jest.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }])),
    };
    (global as any).chrome.scripting = {
      executeScript: jest.fn(() => Promise.resolve([{ frameId: 0, result: 0 }])),
    };

    // 触发异步操作
    const page = await currentPageService.getCurrentPage();
    expect(page).toBeDefined();

    // 继续测试流程...
    const createdTag = await currentPageService.createTagAndAddToPage('New Tag', page.id);

    expect(memoryStorage[STORAGE_KEYS.TAGS]).toBeDefined();
    const storedTags = Object.values(memoryStorage[STORAGE_KEYS.TAGS]) as any[];
    expect(storedTags).toHaveLength(1);
    expect(storedTags[0].name).toBe('New Tag');

    expect(memoryStorage[STORAGE_KEYS.PAGES]).toBeDefined();
    const storedPage = memoryStorage[STORAGE_KEYS.PAGES][page.id];
    expect(storedPage).toBeDefined();
    expect(storedPage.tags).toContain(createdTag.id);

    const allTags = await currentPageService.getAllTags();
    expect(allTags).toHaveLength(1);
    expect(allTags[0].name).toBe('New Tag');
  });

  it('应该完整测试：事务性更新 (EditPageDialog)', async () => {
    (global as any).chrome.tabs = {
      query: jest.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }])),
    };
    (global as any).chrome.scripting = {
      executeScript: jest.fn(() => Promise.resolve([{ frameId: 0, result: 0 }])),
    };

    const page = await currentPageService.getCurrentPage();

    await currentPageService.updatePageDetails(page.id, {
      title: 'New Title',
      tagsToAdd: ['Tag A'],
      tagsToRemove: [],
    });

    expect(memoryStorage[STORAGE_KEYS.PAGES]).toBeDefined();
    const storedPage = memoryStorage[STORAGE_KEYS.PAGES][page.id];
    expect(storedPage).toBeDefined();
    expect(storedPage.title).toBe('New Title');

    expect(memoryStorage[STORAGE_KEYS.TAGS]).toBeDefined();
    const storedTags = Object.values(memoryStorage[STORAGE_KEYS.TAGS]) as any[];
    const tagA = storedTags.find((tag: any) => tag.name === 'Tag A');
    expect(tagA).toBeDefined();
    expect(tagA).not.toBeUndefined();
    if (tagA) {
      expect(storedPage.tags).toContain(tagA.id);
    }
  });

  it('应该完整测试：删除标签并同步页面引用', async () => {
    (global as any).chrome.tabs = {
      query: jest.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }])),
    };
    (global as any).chrome.scripting = {
      executeScript: jest.fn(() => Promise.resolve([{ frameId: 0, result: 0 }])),
    };

    const page = await currentPageService.getCurrentPage();
    const tag = await currentPageService.createTagAndAddToPage('ToDelete', page.id);

    expect(memoryStorage[STORAGE_KEYS.TAGS]).toBeDefined();
    expect(memoryStorage[STORAGE_KEYS.PAGES]).toBeDefined();
    expect(memoryStorage[STORAGE_KEYS.TAGS][tag.id]).toBeDefined();
    expect(memoryStorage[STORAGE_KEYS.PAGES][page.id].tags).toContain(tag.id);

    await currentPageService.deleteTag(tag.id);

    expect(memoryStorage[STORAGE_KEYS.TAGS]).toBeDefined();
    expect(memoryStorage[STORAGE_KEYS.TAGS][tag.id]).toBeUndefined();
    expect(memoryStorage[STORAGE_KEYS.PAGES][page.id].tags).not.toContain(tag.id);

    const allTags = await currentPageService.getAllTags();
    expect(allTags).toHaveLength(0);
  });

  it('应该完整测试：批量更新页面标签', async () => {
    (global as any).chrome.tabs = {
      query: jest.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }])),
    };
    (global as any).chrome.scripting = {
      executeScript: jest.fn(() => Promise.resolve([{ frameId: 0, result: 0 }])),
    };

    const page = await currentPageService.getCurrentPage();

    const updateResult = await currentPageService.updatePageTags(page.id, {
      tagsToAdd: ['Bulk Tag 1', 'Bulk Tag 2'],
      tagsToRemove: [],
    });

    expect(updateResult.newPage).not.toBeNull();
    expect(updateResult.newPage!.tags).toHaveLength(2);

    const storedPageAfterAdd = memoryStorage[STORAGE_KEYS.PAGES][page.id];
    expect(storedPageAfterAdd.tags).toHaveLength(2);

    const storedTagsCollection = memoryStorage[STORAGE_KEYS.TAGS];
    expect(storedTagsCollection).toBeDefined();
    const tagToRemove = Object.values(storedTagsCollection).find(
      (tag: any) => tag.name === 'Bulk Tag 1',
    ) as { id: string; name: string };
    expect(tagToRemove).toBeDefined();

    const removeResult = await currentPageService.updatePageTags(page.id, {
      tagsToAdd: [],
      tagsToRemove: ['Bulk Tag 1'],
    });

    expect(removeResult.newPage).not.toBeNull();
    expect(removeResult.newPage!.tags).toHaveLength(1);
    expect(memoryStorage[STORAGE_KEYS.PAGES][page.id].tags).not.toContain(tagToRemove.id);
  });

  it('应该更新标签名称并同步存储', async () => {
    (global as any).chrome.tabs = {
      query: jest.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }])),
    };
    (global as any).chrome.scripting = {
      executeScript: jest.fn(() => Promise.resolve([{ frameId: 0, result: 0 }])),
    };

    const page = await currentPageService.getCurrentPage();
    const originalTag = await currentPageService.createTagAndAddToPage('Old Name', page.id);
    
    const storeInstance = GameplayStore.getInstance();
    const updateSpy = jest.spyOn(storeInstance, 'updateTagName');

    await currentPageService.updateTag(originalTag.id, 'New Name');

    expect(updateSpy).toHaveBeenCalledWith(originalTag.id, 'New Name');
    const storedTag = memoryStorage[STORAGE_KEYS.TAGS][originalTag.id];
    expect(storedTag.name).toBe('New Name');

    updateSpy.mockRestore();
  });

  it('应该获取所有标签的使用计数', async () => {
    (global as any).chrome.tabs = {
      query: jest.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }])),
    };
    (global as any).chrome.scripting = {
      executeScript: jest.fn(() => Promise.resolve([{ frameId: 0, result: 0 }])),
    };

    const page = await currentPageService.getCurrentPage();

    await currentPageService.updatePageTags(page.id, {
      tagsToAdd: ['Usage A', 'Usage B'],
      tagsToRemove: [],
    });

    const counts = await currentPageService.getAllTagUsageCounts();

    const storedTags = memoryStorage[STORAGE_KEYS.TAGS];
    const usageATag = Object.values(storedTags).find((tag: any) => tag.name === 'Usage A') as { id: string };
    const usageBTag = Object.values(storedTags).find((tag: any) => tag.name === 'Usage B') as { id: string };

    expect(usageATag).toBeDefined();
    expect(usageBTag).toBeDefined();
    expect(counts[usageATag.id]).toBe(1);
    expect(counts[usageBTag.id]).toBe(1);
  });

  it('更新标签失败时应该返回错误并且不触发持久化', async () => {
    const storeInstance = GameplayStore.getInstance();
    const updateSpy = jest.spyOn(storeInstance, 'updateTagName').mockReturnValue({
      success: false,
      error: 'Name exists',
    });
    const commitSpy = jest.spyOn(storeInstance, 'commit');

    await expect(currentPageService.updateTag('t1', 'Existing Name')).rejects.toThrow('Name exists');

    expect(updateSpy).toHaveBeenCalledWith('t1', 'Existing Name');
    // 在 RPC 架构中，错误不会触发 commit
    expect(commitSpy).not.toHaveBeenCalled();

    updateSpy.mockRestore();
    commitSpy.mockRestore();
  });
});
