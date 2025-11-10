import { storageService } from '../../services/storageService';

type MessageHandlerModule = typeof import('../messageHandler');

const createMockTagManager = () => ({
  initialize: jest.fn(),
  createOrUpdatePage: jest.fn(),
  createTag: jest.fn(),
  addTagToPage: jest.fn(),
  createTagAndAddToPage: jest.fn(),
  removeTagFromPage: jest.fn(),
  updatePageTitle: jest.fn(),
  getAllTags: jest.fn(),
  getTaggedPages: jest.fn(),
  getUserStats: jest.fn(),
  syncToStorage: jest.fn(() => Promise.resolve()),
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
    expect(mockTagManagerInstance.syncToStorage).toHaveBeenCalled();
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
});

