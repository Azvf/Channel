/**
 * Chrome Storage Repository 实现
 * 提供带缓存优化的数据持久化层
 */

import { storageService } from '../../../../services/storageService';
import { IRepository, ITagRepository, IPageRepository } from './types';
import { GameplayTag, TaggedPage } from '../../../../shared/types/gameplayTag';

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number;
  misses: number;
  total: number;
  hitRate: number;
}

/**
 * Chrome Storage Repository 基础实现
 * 包含内存缓存以减少存储读取次数
 */
export class ChromeStorageRepository<T extends { id: string }> implements IRepository<T> {
  // 内存缓存
  private cache: Record<string, T> | null = null;
  private cachePromise: Promise<Record<string, T>> | null = null;
  
  // 缓存统计
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private storageKey: string) {}

  /**
   * 加载数据（带缓存）
   */
  private async loadData(): Promise<Record<string, T>> {
    // 如果缓存存在，直接返回
    if (this.cache !== null) {
      this.cacheHits++;
      return this.cache;
    }

    // 如果正在加载，等待加载完成
    if (this.cachePromise) {
      this.cacheMisses++;
      return this.cachePromise;
    }

    // 加载数据并缓存
    this.cacheMisses++;
    this.cachePromise = (async () => {
      const data = await storageService.get<Record<string, T>>(this.storageKey);
      this.cache = (data || {}) as Record<string, T>;
      this.cachePromise = null;
      return this.cache;
    })();

    return this.cachePromise;
  }
  
  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total : 0;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRate,
    };
  }
  
  /**
   * 重置缓存统计
   */
  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 获取所有实体
   */
  async getAll(): Promise<T[]> {
    const data = await this.loadData();
    return Object.values(data);
  }

  /**
   * 根据 ID 获取实体
   */
  async getById(id: string): Promise<T | null> {
    const data = await this.loadData();
    return data[id] || null;
  }

  /**
   * 保存实体（创建或更新）
   */
  async save(item: T): Promise<void> {
    const data = await this.loadData();
    data[item.id] = item;
    this.cache = data; // 更新缓存
    await storageService.set(this.storageKey, data);
  }

  /**
   * 删除实体
   */
  async delete(id: string): Promise<void> {
    const data = await this.loadData();
    if (data[id]) {
      delete data[id];
      this.cache = data; // 更新缓存
      await storageService.set(this.storageKey, data);
    }
  }

  /**
   * 批量保存实体
   */
  async saveBatch(items: T[]): Promise<void> {
    const data = await this.loadData();
    items.forEach(item => {
      data[item.id] = item;
    });
    this.cache = data; // 更新缓存
    await storageService.set(this.storageKey, data);
  }

  /**
   * 使缓存失效（用于外部强制刷新）
   */
  invalidateCache(): void {
    this.cache = null;
    this.cachePromise = null;
  }
}

/**
 * 标签 Repository 实现
 */
export class ChromeTagRepository extends ChromeStorageRepository<GameplayTag> implements ITagRepository {
  constructor() {
    super('gameplay_tags');
  }

  /**
   * 根据名称查找标签（忽略大小写）
   */
  async findByName(name: string): Promise<GameplayTag | null> {
    if (!name) return null;
    const trimmedName = name.trim().toLowerCase();
    const allTags = await this.getAll();
    return allTags.find(tag => tag.name.toLowerCase() === trimmedName) || null;
  }

  /**
   * 根据颜色查找标签
   */
  async findByColor(color: string): Promise<GameplayTag[]> {
    if (!color) return [];
    const allTags = await this.getAll();
    return allTags.filter(tag => tag.color === color);
  }
}

/**
 * 页面 Repository 实现
 */
export class ChromePageRepository extends ChromeStorageRepository<TaggedPage> implements IPageRepository {
  constructor() {
    super('tagged_pages');
  }

  /**
   * 根据 URL 查找页面
   */
  async findByUrl(url: string): Promise<TaggedPage | null> {
    if (!url) return null;
    // 生成页面 ID（与 TagManager 的逻辑一致）
    const pageId = btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    return this.getById(pageId);
  }
}

