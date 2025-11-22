/**
 * Mock Repository 实现
 * 基于内存的 Repository，用于单元测试，提供毫秒级速度的持久化模拟
 */

import { IRepository, ITagRepository, IPageRepository } from './types';
import { GameplayTag, TaggedPage } from '../../../../shared/types/gameplayTag';

/**
 * 通用内存仓库实现
 * 使用 Map 模拟数据库表，行为上模拟数据库但速度极快
 */
export class MockRepository<T extends { id: string }> implements IRepository<T> {
  // 使用 Map 模拟数据库表
  private store = new Map<string, T>();

  async getAll(): Promise<T[]> {
    return Array.from(this.store.values());
  }

  async getById(id: string): Promise<T | null> {
    return this.store.get(id) || null;
  }

  async save(item: T): Promise<void> {
    // 模拟深拷贝，防止引用污染
    this.store.set(item.id, JSON.parse(JSON.stringify(item)));
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async saveBatch(items: T[]): Promise<void> {
    // 获取要保存的 ID 集合
    const itemIds = new Set(items.map(item => item.id));
    
    // 删除不在新列表中的项目（模拟数据库的更新行为）
    const keysToDelete: string[] = [];
    this.store.forEach((_value, key) => {
      if (!itemIds.has(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));
    
    // 保存新项目
    items.forEach(item => {
      // 使用深拷贝
      this.store.set(item.id, JSON.parse(JSON.stringify(item)));
    });
  }

  /**
   * 测试专用辅助方法：清空数据
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 测试专用辅助方法：获取存储大小
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Mock 标签 Repository
 */
export class MockTagRepository extends MockRepository<GameplayTag> implements ITagRepository {
  async findByName(name: string): Promise<GameplayTag | null> {
    if (!name) return null;
    const trimmedName = name.trim().toLowerCase();
    const allTags = await this.getAll();
    return allTags.find(tag => tag.name.toLowerCase() === trimmedName) || null;
  }

  async findByColor(color: string): Promise<GameplayTag[]> {
    if (!color) return [];
    const allTags = await this.getAll();
    return allTags.filter(tag => tag.color === color);
  }
}

/**
 * Mock 页面 Repository
 */
export class MockPageRepository extends MockRepository<TaggedPage> implements IPageRepository {
  async findByUrl(url: string): Promise<TaggedPage | null> {
    if (!url) return null;
    // 生成页面 ID（与 TagManager 的逻辑一致）
    const pageId = btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    return this.getById(pageId);
  }
}

