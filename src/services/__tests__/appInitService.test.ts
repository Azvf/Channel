import { loadAppInitialState, loadAppInitialStateSync, DEFAULT_APP_STATE } from '../appInitService';
import { storageService, STORAGE_KEYS } from '../storageService';
import { DEFAULT_PAGE_SETTINGS } from '../../types/pageSettings';

jest.mock('../storageService', () => {
  const actual = jest.requireActual('../storageService');
  return {
    ...actual,
    storageService: {
      get: jest.fn(),
    },
  };
});

const mockedStorage = storageService as unknown as {
  get: jest.Mock;
};

describe('appInitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.get.mockImplementation(async (key: string) => {
      switch (key) {
        case STORAGE_KEYS.ACTIVE_TAB:
          return DEFAULT_APP_STATE.activeTab;
        case STORAGE_KEYS.THEME:
          return DEFAULT_APP_STATE.theme;
        case STORAGE_KEYS.PAGE_SETTINGS:
          return DEFAULT_PAGE_SETTINGS;
        default:
          return null;
      }
    });
    localStorage.clear();
  });

  describe('loadAppInitialState', () => {
    it('返回存储中的完整数据', async () => {
      mockedStorage.get.mockImplementation(async (key: string) => {
        const data: Record<string, unknown> = {
          [STORAGE_KEYS.ACTIVE_TAB]: 'tagged',
          [STORAGE_KEYS.THEME]: 'dark',
          [STORAGE_KEYS.PAGE_SETTINGS]: { syncVideoTimestamp: false },
        };
        return data[key] ?? null;
      });

      const state = await loadAppInitialState();

      expect(state).toEqual({
        activeTab: 'tagged',
        theme: 'dark',
        pageSettings: { syncVideoTimestamp: false },
      });
    });

    it('当存储返回 null 或空对象时回退到默认值', async () => {
      mockedStorage.get.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.PAGE_SETTINGS) {
          return {};
        }
        return null;
      });

      const state = await loadAppInitialState();

      expect(state).toEqual(DEFAULT_APP_STATE);
    });

    it('当只存在部分数据时合并默认值', async () => {
      mockedStorage.get.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.THEME) {
          return 'dim';
        }
        return null;
      });

      const state = await loadAppInitialState();

      expect(state).toEqual({
        activeTab: DEFAULT_APP_STATE.activeTab,
        theme: 'dim',
        pageSettings: DEFAULT_PAGE_SETTINGS,
      });
    });
  });

  describe('loadAppInitialStateSync', () => {
    it('读取 localStorage 中的完整数据', () => {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'tagged');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
      localStorage.setItem(
        STORAGE_KEYS.PAGE_SETTINGS,
        JSON.stringify({ syncVideoTimestamp: false }),
      );

      const state = loadAppInitialStateSync();

      expect(state).toEqual({
        activeTab: 'tagged',
        theme: 'dark',
        pageSettings: { syncVideoTimestamp: false },
      });
    });

    it('当 localStorage 缺少数据时返回默认状态', () => {
      const state = loadAppInitialStateSync();

      expect(state).toEqual(DEFAULT_APP_STATE);
    });

    it('当页面设置 JSON 损坏时回退到默认页面设置', () => {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'tagged');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
      localStorage.setItem(STORAGE_KEYS.PAGE_SETTINGS, '{invalid json');

      const state = loadAppInitialStateSync();

      expect(state.pageSettings).toEqual(DEFAULT_PAGE_SETTINGS);
      expect(state.activeTab).toBe('tagged');
      expect(state.theme).toBe('dark');
    });
  });
});


