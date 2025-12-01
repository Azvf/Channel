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
  
  // 认证相关
  AUTH_SESSION: 'auth_session',
  
  // 同步相关
  SYNC_PENDING_CHANGES: 'sync_pending_changes',
  SYNC_LAST_TIMESTAMP: 'sync_last_timestamp', // [新增] 同步游标
  SYNC_SHADOW_MAP: 'sync_shadow_map', // [新增] Shadow Map (三路合并基准)
  SYNC_LAST_FULL_SYNC: 'sync_last_full_sync', // [新增] 上次全量同步时间戳
  SYNC_LOCK: 'sync_lock', // [新增] 同步锁 (防止并发)
  
  // Stats Wall 缓存相关
  STATS_WALL_CACHE: 'stats_wall_cache_metadata', // Stats Wall 缓存元数据
  STATS_WALL_VERSION: 'stats_wall_version', // Stats Wall 版本号元数据（轻量级）
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
 * Chrome Storage 包装器 (使用原生 Promise)
 */
class ChromeStorageWrapper implements IStorageService {
  constructor(
    private storage: chrome.storage.StorageArea,
    private storageType: 'local' | 'sync'
  ) {}

  // --- 重构为原生 Promise ---
  async get<T = unknown>(key: StorageKey): Promise<T | null> {
    try {
      // 不再使用 new Promise，直接 await
      const items = await this.storage.get([key]);
      // MV3/Promise API 会在出错时 throw
      return (items?.[key] as T | undefined) ?? null;
    } catch (error) {
      console.warn(`[StorageService] Failed to read "${key}" from ${this.storageType}:`, (error as Error).message);
      return null;
    }
  }

  // --- 重构为原生 Promise ---
  async getMultiple<T = unknown>(keys: StorageKey[]): Promise<Record<string, T | null>> {
    try {
      // 直接 await
      const items = await this.storage.get(keys);
      const result: Record<string, T | null> = {};
      for (const key of keys) {
        result[key] = (items?.[key] as T | undefined) ?? null;
      }
      return result;
    } catch (error) {
      console.warn(`[StorageService] Failed to read multiple keys from ${this.storageType}:`, (error as Error).message);
      return {};
    }
  }

  // --- 重构为原生 Promise ---
  async set<T = unknown>(key: StorageKey, value: T): Promise<void> {
    // ✅ 修复：移除同步阻塞操作，直接使用异步的 Chrome Storage
    try {
      await this.storage.set({ [key]: value });
    } catch (error) {
      console.warn(`[StorageService] Failed to write "${key}" to ${this.storageType}:`, (error as Error).message);
      throw error;
    }
  }

  // --- 重构为原生 Promise ---
  async setMultiple(data: Record<string, unknown>): Promise<void> {
    // ✅ 修复：移除同步阻塞循环，直接使用异步的 Chrome Storage
    try {
      await this.storage.set(data);
    } catch (error) {
      console.warn(`[StorageService] Failed to write multiple keys to ${this.storageType}:`, (error as Error).message);
      throw error;
    }
  }

  // --- 重构为原生 Promise ---
  async remove(key: StorageKey): Promise<void> {
    try {
      // 直接 await
      await this.storage.remove(key);
    } catch (error) {
      console.warn(`[StorageService] Failed to remove "${key}" from ${this.storageType}:`, (error as Error).message);
      throw error;
    }
  }

  // --- 重构为原生 Promise ---
  async removeMultiple(keys: StorageKey[]): Promise<void> {
    try {
      // 直接 await
      await this.storage.remove(keys);
    } catch (error) {
      console.warn(`[StorageService] Failed to remove multiple keys from ${this.storageType}:`, (error as Error).message);
      throw error;
    }
  }

  // --- 重构为原生 Promise ---
  async clear(): Promise<void> {
    try {
      // 直接 await
      await this.storage.clear();
    } catch (error) {
      console.warn(`[StorageService] Failed to clear ${this.storageType}:`, (error as Error).message);
      throw error;
    }
  }

  // --- 重构为原生 Promise ---
  async getAllKeys(): Promise<string[]> {
    try {
      // .get(null) 获取所有
      const items = await this.storage.get(null);
      return items ? Object.keys(items) : [];
    } catch (error) {
       console.warn(`[StorageService] Failed to get all keys from ${this.storageType}:`, (error as Error).message);
       return [];
    }
  }
}

/**
 * LocalStorage 包装器 (保持不变)
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
 * 统一存储服务 (保持不变)
 */
class StorageService implements IStorageService {
  private wrapper: IStorageService;

  constructor(storageType: StorageType = 'auto', private forceWarn: boolean = false) {
    this.wrapper = this.createWrapper(storageType);
  }

  private createWrapper(storageType: StorageType): IStorageService {
    // 检测是否在测试环境中
    const isTestEnv = this.forceWarn ? false : (
      (typeof window !== 'undefined' && (window as any).__IS_TEST_ENV__) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).__IS_TEST_ENV__) ||
      (typeof process !== 'undefined' && 
        (process.env.NODE_ENV === 'test' || 
         process.env.JEST_WORKER_ID !== undefined)) ||
      typeof jest !== 'undefined'
    );

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
        // 在测试环境中不显示警告，因为回退到 localStorage 是预期行为
        if (!isTestEnv) {
          console.warn(`[StorageService] chrome.storage.${storageType} not available, falling back to localStorage`);
        }
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
  static create(storageType: StorageType = 'auto', forceWarn: boolean = false): StorageService {
    return new StorageService(storageType, forceWarn);
  }
}

// 导出默认实例（自动检测环境）
export const storageService = StorageService.create();

// 导出特定类型的实例
export const localStorageService = StorageService.create('local');
export const syncStorageService = StorageService.create('sync');

// 导出类以便测试或特殊用途
export { StorageService };