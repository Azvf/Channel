import { storageService } from '../../services/storageService';

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

type MessageHandlerModule = typeof import('../messageHandler');

const createMockTagManager = () => ({
  initialize: jest.fn(),
  createOrUpdatePage: jest.fn(),
  createTag: jest.fn(),
  addTagToPage: jest.fn(),
  createTagAndAddToPage: jest.fn(),
  removeTagFromPage: jest.fn(),
  updatePageTitle: jest.fn(),
  getPageById: jest.fn(),
  getTagById: jest.fn(),
  findTagByName: jest.fn(),
  getAllTags: jest.fn(),
  getTaggedPages: jest.fn(),
  getUserStats: jest.fn(),
  updateTagName: jest.fn(),
  deleteTag: jest.fn(),
  getAllTagUsageCounts: jest.fn(),
  exportData: jest.fn(),
  importData: jest.fn(),
  commit: jest.fn(() => Promise.resolve()), // 新的事务提交方法
  syncToStorage: jest.fn(() => Promise.resolve()), // 保留用于向后兼容
});

let mockTagManagerInstance = createMockTagManager();

jest.mock('../../services/tagManager', () => ({
  TagManager: {
    getInstance: jest.fn(() => mockTagManagerInstance),
  },
}));

jest.mock('../../services/storageService', () => {
  const actual = jest.requireActual('../../services/storageService');
  return {
    ...actual,
    storageService: {
      getMultiple: jest.fn(() =>
        Promise.resolve({
          [actual.STORAGE_KEYS.TAGS]: {},
          [actual.STORAGE_KEYS.PAGES]: {},
          [actual.STORAGE_KEYS.PAGE_SETTINGS]: { syncVideoTimestamp: true },
        }),
      ),
    },
    syncStorageService: {
      setMultiple: jest.fn(() => Promise.resolve()),
    },
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

const mockedStorage = storageService as unknown as {
  getMultiple: jest.Mock;
};

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

let messageHandler: MessageHandlerModule['messageHandler'];
let resetInitializationForTests: MessageHandlerModule['resetInitializationForTests'];

describe('messageHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTagManagerInstance = createMockTagManager();

    const { TagManager } = jest.requireMock('../../services/tagManager');
    (TagManager.getInstance as jest.Mock).mockReturnValue(mockTagManagerInstance);

    jest.isolateModules(() => {
      const module = require('../messageHandler') as MessageHandlerModule;
      messageHandler = module.messageHandler;
      resetInitializationForTests = module.resetInitializationForTests;
    });

    resetInitializationForTests();
  });

  it('handles createTagAndAddToPage successfully', async () => {
    const sendResponse = jest.fn();
    const tag = { id: 'tag-1', name: 'New Tag' };
    mockTagManagerInstance.createTagAndAddToPage.mockReturnValue(tag);

    messageHandler(
      { action: 'createTagAndAddToPage', data: { tagName: 'New Tag', pageId: 'page-1' } },
      {},
      sendResponse,
    );

    await flushPromises();

    expect(mockTagManagerInstance.createTagAndAddToPage).toHaveBeenCalledWith('New Tag', 'page-1');
    expect(mockTagManagerInstance.commit).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: tag });
  });

  it('returns error response when action is unknown', async () => {
    const sendResponse = jest.fn();

    messageHandler({ action: 'unknown-action' }, {}, sendResponse);

    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: '未知操作' });
  });

  it('handles initialization failures by returning error', async () => {
    const sendResponse = jest.fn();
    mockedStorage.getMultiple.mockRejectedValueOnce(new Error('storage failed'));

    messageHandler({ action: 'getAllTags' }, {}, sendResponse);

    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: expect.stringContaining('storage failed') });
  });

  it('should handle updatePageDetails transactionally', async () => {
    const sendResponse = jest.fn();
    const data = { pageId: 'p1', title: 'New Title', tagsToAdd: ['T1'], tagsToRemove: ['T2'] };

    mockTagManagerInstance.getPageById.mockReturnValue({ id: 'p1', title: 'Old Title', tags: [] });
    mockTagManagerInstance.updatePageTitle.mockReturnValue(true);

    messageHandler({ action: 'updatePageDetails', data }, {}, sendResponse);

    await flushPromises();

    expect(mockTagManagerInstance.updatePageTitle).toHaveBeenCalledWith('p1', 'New Title');
    expect(mockTagManagerInstance.createTagAndAddToPage).toHaveBeenCalledWith('T1', 'p1');
    expect(mockTagManagerInstance.findTagByName).toHaveBeenCalledWith('T2');
    expect(mockTagManagerInstance.commit).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: { success: true } });
  });

  it('should handle updateTag', async () => {
    const sendResponse = jest.fn();
    mockTagManagerInstance.updateTagName.mockReturnValue({ success: true });

    messageHandler({ action: 'updateTag', data: { tagId: 't1', newName: 'New' } }, {}, sendResponse);

    await flushPromises();

    expect(mockTagManagerInstance.updateTagName).toHaveBeenCalledWith('t1', 'New');
    expect(mockTagManagerInstance.commit).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: { success: true } });
  });

  it('should not sync on updateTag failure', async () => {
    const sendResponse = jest.fn();
    mockTagManagerInstance.updateTagName.mockReturnValue({ success: false, error: 'Exists' });

    messageHandler({ action: 'updateTag', data: { tagId: 't1', newName: 'New' } }, {}, sendResponse);

    await flushPromises();

    expect(mockTagManagerInstance.updateTagName).toHaveBeenCalled();
    expect(mockTagManagerInstance.commit).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Exists' });
  });

  it('should handle deleteTag', async () => {
    const sendResponse = jest.fn();
    mockTagManagerInstance.deleteTag.mockReturnValue(true);

    messageHandler({ action: 'deleteTag', data: { tagId: 't1' } }, {}, sendResponse);

    await flushPromises();

    expect(mockTagManagerInstance.deleteTag).toHaveBeenCalledWith('t1');
    expect(mockTagManagerInstance.commit).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: { success: true } });
  });

  it('should handle getAllTagUsageCounts', async () => {
    const sendResponse = jest.fn();
    const counts = { t1: 5, t2: 0 };
    mockTagManagerInstance.getAllTagUsageCounts.mockReturnValue(counts);

    messageHandler({ action: 'getAllTagUsageCounts' }, {}, sendResponse);

    await flushPromises();

    expect(mockTagManagerInstance.getAllTagUsageCounts).toHaveBeenCalled();
    expect(mockTagManagerInstance.commit).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: counts });
  });

  it('handleExportData: 应该调用 tagManager.exportData 并返回', async () => {
    const sendResponse = jest.fn();
    const mockJson = '{"data":"test"}';
    mockTagManagerInstance.exportData.mockReturnValue(mockJson);

    messageHandler({ action: 'exportData' }, {}, sendResponse);
    await flushPromises();

    expect(mockTagManagerInstance.exportData).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: mockJson });
  });

  it('handleImportData: 应该调用 tagManager.importData', async () => {
    const sendResponse = jest.fn();
    const importData = { jsonData: '{}', mergeMode: true };
    mockTagManagerInstance.importData.mockResolvedValue({ success: true, imported: { tagsCount: 1, pagesCount: 0 } });
    mockTagManagerInstance.commit.mockResolvedValue(undefined);

    messageHandler({ action: 'importData', data: importData }, {}, sendResponse);
    await flushPromises();

    expect(mockTagManagerInstance.importData).toHaveBeenCalledWith('{}', true);
    expect(mockTagManagerInstance.commit).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ 
      success: true, 
      data: { tagsCount: 1, pagesCount: 0 } 
    });
  });

  it('handleRemoveTagFromPage: 成功时应触发同步', async () => {
    const sendResponse = jest.fn();
    mockTagManagerInstance.removeTagFromPage.mockReturnValue(true);
    mockTagManagerInstance.getPageById.mockReturnValue({ id: 'p1', title: 'T', url: 'u', domain: 'd', tags: [], createdAt: 1, updatedAt: 1 }); // 确保能获取到页面以触发同步

    messageHandler({ action: 'removeTagFromPage', data: { pageId: 'p1', tagId: 't1' } }, {}, sendResponse);
    await flushPromises();

    expect(mockTagManagerInstance.removeTagFromPage).toHaveBeenCalledWith('p1', 't1');
    expect(mockTagManagerInstance.commit).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: { success: true } });
  });

  it('handleGetUserStats: 应该返回统计数据', async () => {
    const sendResponse = jest.fn();
    const stats = { todayCount: 5, streak: 2 };
    mockTagManagerInstance.getUserStats.mockReturnValue(stats);

    messageHandler({ action: 'getUserStats' }, {}, sendResponse);
    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: stats });
  });

  it('handleUpdatePageTitle: 成功时应触发同步', async () => {
    const sendResponse = jest.fn();
    mockTagManagerInstance.updatePageTitle.mockReturnValue(true);
    mockTagManagerInstance.getPageById.mockReturnValue({ id: 'p1', title: 'T', url: 'u', domain: 'd', tags: [], createdAt: 1, updatedAt: 1 });

    messageHandler({ action: 'updatePageTitle', data: { pageId: 'p1', title: 'New' } }, {}, sendResponse);
    await flushPromises();

    expect(mockTagManagerInstance.updatePageTitle).toHaveBeenCalledWith('p1', 'New');
    expect(mockTagManagerInstance.commit).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: { success: true } });
  });
});

