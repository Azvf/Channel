/**
 * 应用初始化服务
 * 在 React 渲染前加载所有需要的数据，避免页面闪烁
 */

import { storageService, STORAGE_KEYS } from './storageService';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../types/pageSettings';

/**
 * 应用初始状态
 */
export interface AppInitialState {
  /**
   * 当前激活的标签页
   */
  activeTab: 'tagging' | 'tagged';
  
  /**
   * 主题设置
   */
  theme: string;
  
  /**
   * 页面设置
   */
  pageSettings: PageSettings;
}

/**
 * 默认应用初始状态
 */
export const DEFAULT_APP_STATE: AppInitialState = {
  activeTab: 'tagging',
  theme: 'light',
  pageSettings: DEFAULT_PAGE_SETTINGS,
};

/**
 * 加载应用初始状态
 * 在 React 渲染前调用，确保应用从一开始就使用正确的状态
 */
export async function loadAppInitialState(): Promise<AppInitialState> {
  try {
    // 并行加载所有数据以提高性能
    const [activeTab, theme, pageSettings] = await Promise.all([
      storageService.get<'tagging' | 'tagged'>(STORAGE_KEYS.ACTIVE_TAB),
      storageService.get<string>(STORAGE_KEYS.THEME),
      storageService.get<PageSettings>(STORAGE_KEYS.PAGE_SETTINGS),
    ]);

    return {
      activeTab: (activeTab === 'tagging' || activeTab === 'tagged') ? activeTab : DEFAULT_APP_STATE.activeTab,
      theme: theme || DEFAULT_APP_STATE.theme,
      pageSettings: {
        syncVideoTimestamp: typeof pageSettings?.syncVideoTimestamp === 'boolean' 
          ? pageSettings.syncVideoTimestamp 
          : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
      },
    };
  } catch (error) {
    console.error('加载应用初始状态失败:', error);
    // 返回默认状态
    return DEFAULT_APP_STATE;
  }
}

/**
 * 同步加载应用初始状态（使用 localStorage 作为后备）
 * 如果 chrome.storage 不可用，使用 localStorage 的同步 API
 */
export function loadAppInitialStateSync(): AppInitialState {
  try {
    const cacheFailFlag = localStorage.getItem('SYNC_CACHE_LAST_FAIL');

    if (cacheFailFlag) {
      console.warn(
        `[AppInitService] 同步缓存 (localStorage) 被标记为失败（最后一次写入失败）。`,
        `正在回退到默认状态，等待异步加载。`
      );

      return DEFAULT_APP_STATE;
    }

    // 尝试从 localStorage 同步读取（用于 popup 环境）
    const activeTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    const pageSettingsStr = localStorage.getItem(STORAGE_KEYS.PAGE_SETTINGS);

    let pageSettings: PageSettings = DEFAULT_PAGE_SETTINGS;
    if (pageSettingsStr) {
      try {
        const parsed = JSON.parse(pageSettingsStr);
        pageSettings = {
          syncVideoTimestamp: typeof parsed.syncVideoTimestamp === 'boolean' 
            ? parsed.syncVideoTimestamp 
            
            : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
        };
      } catch {
        // 解析失败，使用默认值
        pageSettings = DEFAULT_PAGE_SETTINGS;
      }
    }

    return {
      activeTab: (activeTab === 'tagging' || activeTab === 'tagged') ? activeTab : DEFAULT_APP_STATE.activeTab,
      theme: theme || DEFAULT_APP_STATE.theme,
      pageSettings,
    };
  } catch (error) {
    console.error('同步加载应用初始状态失败:', error);
    return DEFAULT_APP_STATE;
  }
}

