import { messageHandler, resetInitializationForTests } from '../../background/messageHandler';
import { currentPageService } from '../../services/popup/currentPageService';
import { TagManager } from '../../services/tagManager';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

// Mock supabase before any imports
jest.mock('../../lib/supabase', () => {
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

// Mock syncService to avoid import.meta.env issues
jest.mock('../../services/syncService', () => {
  return {
    syncService: {
      initialize: jest.fn(() => Promise.resolve()),
      markTagChange: jest.fn(() => Promise.resolve()),
      markPageChange: jest.fn(() => Promise.resolve()),
      sync: jest.fn(() => Promise.resolve()),
      getSyncState: jest.fn(() => ({
        isSyncing: false,
        lastSyncAt: null,
        pendingChangesCount: 0,
        error: null,
      })),
    },
  };
});

jest.mock('../../services/storageService', () => {
  const actual = jest.requireActual('../../services/storageService');

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

  (global as any).__CHROME_SEND_MESSAGE_HANDLER__ = (
    message: any,
    callback?: (response: any) => void,
  ) => {
    setTimeout(() => {
      messageHandler(
        message,
        {} as chrome.runtime.MessageSender,
        response => {
          if (typeof callback === 'function') {
            callback(response);
          }
        },
      );
    }, 0);
  };

  resetInitializationForTests();
  TagManager.getInstance().clearAllData();
  global.chrome.runtime.lastError = undefined;
});

afterEach(() => {
  delete (global as any).__CHROME_SEND_MESSAGE_HANDLER__;
});

describe('IPC 桥集成测试', () => {
  it('应该完整测试：创建标签 -> 保存 -> 重新获取', async () => {
    const page = await currentPageService.getCurrentPage();

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
    const page = await currentPageService.getCurrentPage();

    const updateResult = await currentPageService.updatePageTags(page.id, {
      tagsToAdd: ['Bulk Tag 1', 'Bulk Tag 2'],
      tagsToRemove: [],
    });

    expect(updateResult.newPage.tags).toHaveLength(2);

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

    expect(removeResult.newPage.tags).toHaveLength(1);
    expect(memoryStorage[STORAGE_KEYS.PAGES][page.id].tags).not.toContain(tagToRemove.id);
  });

  it('应该更新标签名称并同步存储', async () => {
    const page = await currentPageService.getCurrentPage();
    const originalTag = await currentPageService.createTagAndAddToPage('Old Name', page.id);
    const tagManagerInstance = TagManager.getInstance();
    const updateSpy = jest.spyOn(tagManagerInstance, 'updateTagName');

    await currentPageService.updateTag(originalTag.id, 'New Name');

    expect(updateSpy).toHaveBeenCalledWith(originalTag.id, 'New Name');
    const storedTag = memoryStorage[STORAGE_KEYS.TAGS][originalTag.id];
    expect(storedTag.name).toBe('New Name');

    updateSpy.mockRestore();
  });

  it('应该获取所有标签的使用计数', async () => {
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
    const tagManagerInstance = TagManager.getInstance();
    const updateSpy = jest.spyOn(tagManagerInstance, 'updateTagName').mockReturnValue({
      success: false,
      error: 'Name exists',
    });
    const syncSpy = jest.spyOn(tagManagerInstance, 'syncToStorage');

    await expect(currentPageService.updateTag('t1', 'Existing Name')).rejects.toThrow('Name exists');

    expect(updateSpy).toHaveBeenCalledWith('t1', 'Existing Name');
    expect(syncSpy).not.toHaveBeenCalled();

    updateSpy.mockRestore();
    syncSpy.mockRestore();
  });
});


