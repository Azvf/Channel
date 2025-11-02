/**
 * 统一存储服务
 * 封装 chrome.storage 和 localStorage，提供统一的存储接口
 */

/**
 * 存储键常量 - 统一管理所有存储键名
 */
export const STORAGE_KEYS = {
  // TagManager 相关
  TAGS: 'gameplay_tags',
  PAGES: 'tagged_pages',
  
  // 主题相关
  THEME: 'theme',
  
  // 配置相关
  APP_CONFIG: 'developer_config',
  
  // 扩展配置相关
  EXTENSION_ENABLED: 'extensionEnabled',
  LAST_USED: 'lastUsed',
  
  // 页面设置相关
  PAGE_SETTINGS: 'page_settings',
  
  // UI 状态相关
  ACTIVE_TAB: 'active_tab',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string;

/**
 * 存储类型：local 使用 chrome.storage.local，sync 使用 chrome.storage.sync，auto 自动检测
 */
export type StorageType = 'local' | 'sync' | 'auto';

/**
 * 存储服务接口
 */
export interface IStorageService {
  /**
   * 获取存储值
   */
  get<T = unknown>(key: StorageKey): Promise<T | null>;
  
  /**
   * 获取多个存储值
   */
  getMultiple<T = unknown>(keys: StorageKey[]): Promise<Record<string, T | null>>;
  
  /**
   * 设置存储值
   */
  set<T = unknown>(key: StorageKey, value: T): Promise<void>;
  
  /**
   * 批量设置存储值
   */
  setMultiple(data: Record<string, unknown>): Promise<void>;
  
  /**
   * 删除存储值
   */
  remove(key: StorageKey): Promise<void>;
  
  /**
   * 删除多个存储值
   */
  removeMultiple(keys: StorageKey[]): Promise<void>;
  
  /**
   * 清空所有存储
   */
  clear(): Promise<void>;
  
  /**
   * 获取所有存储的键
   */
  getAllKeys(): Promise<string[]>;
}

/**
 * Chrome Storage 包装器
 */
class ChromeStorageWrapper implements IStorageService {
  constructor(
    private storage: chrome.storage.StorageArea,
    private storageType: 'local' | 'sync'
  ) {}

  /**
   * 同步写入 localStorage 作为缓存（用于快速读取）
   */
  private syncToLocalStorage(key: StorageKey, value: unknown): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      // 忽略 localStorage 写入错误，不影响主流程
    }
  }

  async get<T = unknown>(key: StorageKey): Promise<T | null> {
    return new Promise((resolve) => {
      this.storage.get([key], (items) => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to read "${key}" from ${this.storageType}:`, error.message);
          resolve(null);
          return;
        }
        resolve((items?.[key] as T | undefined) ?? null);
      });
    });
  }

  async getMultiple<T = unknown>(keys: StorageKey[]): Promise<Record<string, T | null>> {
    return new Promise((resolve) => {
      this.storage.get(keys, (items) => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to read multiple keys from ${this.storageType}:`, error.message);
          resolve({});
          return;
        }
        const result: Record<string, T | null> = {};
        for (const key of keys) {
          result[key] = (items?.[key] as T | undefined) ?? null;
        }
        resolve(result);
      });
    });
  }

  async set<T = unknown>(key: StorageKey, value: T): Promise<void> {
    // 先同步写入 localStorage 作为缓存
    this.syncToLocalStorage(key, value);
    
    return new Promise((resolve, reject) => {
      this.storage.set({ [key]: value }, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to write "${key}" to ${this.storageType}:`, error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async setMultiple(data: Record<string, unknown>): Promise<void> {
    // 先同步写入 localStorage 作为缓存
    try {
      if (typeof localStorage !== 'undefined') {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
    } catch (error) {
      // 忽略 localStorage 写入错误，不影响主流程
    }
    
    return new Promise((resolve, reject) => {
      this.storage.set(data, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to write multiple keys to ${this.storageType}:`, error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async remove(key: StorageKey): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.remove(key, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to remove "${key}" from ${this.storageType}:`, error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async removeMultiple(keys: StorageKey[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.remove(keys, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to remove multiple keys from ${this.storageType}:`, error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.clear(() => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to clear ${this.storageType}:`, error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async getAllKeys(): Promise<string[]> {
    return new Promise((resolve) => {
      this.storage.get(null, (items) => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn(`[StorageService] Failed to get all keys from ${this.storageType}:`, error.message);
          resolve([]);
          return;
        }
        resolve(items ? Object.keys(items) : []);
      });
    });
  }
}

/**
 * LocalStorage 包装器
 */
class LocalStorageWrapper implements IStorageService {
  async get<T = unknown>(key: StorageKey): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`[StorageService] Failed to read "${key}" from localStorage:`, error);
      return null;
    }
  }

  async getMultiple<T = unknown>(keys: StorageKey[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    return result;
  }

  async set<T = unknown>(key: StorageKey, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[StorageService] Failed to write "${key}" to localStorage:`, error);
      throw error;
    }
  }

  async setMultiple(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value);
    }
  }

  async remove(key: StorageKey): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[StorageService] Failed to remove "${key}" from localStorage:`, error);
      throw error;
    }
  }

  async removeMultiple(keys: StorageKey[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn(`[StorageService] Failed to clear localStorage:`, error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }
}

/**
 * 统一存储服务
 * 根据运行环境自动选择合适的存储后端
 */
class StorageService implements IStorageService {
  private wrapper: IStorageService;

  constructor(storageType: StorageType = 'auto') {
    this.wrapper = this.createWrapper(storageType);
  }

  private createWrapper(storageType: StorageType): IStorageService {
    // 自动检测环境
    if (storageType === 'auto') {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        return new ChromeStorageWrapper(chrome.storage.local, 'local');
      }
      return new LocalStorageWrapper();
    }

    // 手动指定存储类型
    if (storageType === 'local' || storageType === 'sync') {
      if (typeof chrome === 'undefined' || !chrome.storage?.[storageType]) {
        console.warn(`[StorageService] chrome.storage.${storageType} not available, falling back to localStorage`);
        return new LocalStorageWrapper();
      }
      return new ChromeStorageWrapper(chrome.storage[storageType], storageType);
    }

    return new LocalStorageWrapper();
  }

  async get<T = unknown>(key: StorageKey): Promise<T | null> {
    return this.wrapper.get<T>(key);
  }

  async getMultiple<T = unknown>(keys: StorageKey[]): Promise<Record<string, T | null>> {
    return this.wrapper.getMultiple<T>(keys);
  }

  async set<T = unknown>(key: StorageKey, value: T): Promise<void> {
    return this.wrapper.set<T>(key, value);
  }

  async setMultiple(data: Record<string, unknown>): Promise<void> {
    return this.wrapper.setMultiple(data);
  }

  async remove(key: StorageKey): Promise<void> {
    return this.wrapper.remove(key);
  }

  async removeMultiple(keys: StorageKey[]): Promise<void> {
    return this.wrapper.removeMultiple(keys);
  }

  async clear(): Promise<void> {
    return this.wrapper.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return this.wrapper.getAllKeys();
  }

  /**
   * 创建指定存储类型的服务实例
   */
  static create(storageType: StorageType = 'auto'): StorageService {
    return new StorageService(storageType);
  }
}

// 导出默认实例（自动检测环境）
export const storageService = StorageService.create();

// 导出特定类型的实例
export const localStorageService = StorageService.create('local');
export const syncStorageService = StorageService.create('sync');

// 导出类以便测试或特殊用途
export { StorageService };

