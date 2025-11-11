import { messageHandler, resetInitializationForTests } from '../../background/messageHandler';
import { currentPageService } from '../../services/popup/currentPageService';
import { TagManager } from '../../services/tagManager';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

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
    const storedTags = Object.values(memoryStorage[STORAGE_KEYS.TAGS]);
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
    const storedTags = Object.values(memoryStorage[STORAGE_KEYS.TAGS]);
    const tagA = storedTags.find((tag: any) => tag.name === 'Tag A');
    expect(tagA).toBeDefined();
    expect(storedPage.tags).toContain(tagA.id);
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
});


