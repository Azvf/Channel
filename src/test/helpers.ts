import type { GameplayTag } from '../types/gameplayTag';
import { TagManager } from '../services/tagManager';

/**
 * 测试辅助函数
 */
export const testHelpers = {
  /**
   * 创建测试标签
   */
  createTestTag(name: string, color?: string): GameplayTag {
    return {
      id: `tag_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      color: color || '#FF6B6B',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bindings: [],
    };
  },

  /**
   * 等待异步操作完成
   */
  async waitFor(milliseconds: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  },

  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    const tagManager = TagManager.getInstance();
    tagManager.clearAllData();
    await tagManager.syncToStorage();
  },

  /**
   * 初始化 TagManager
   */
  async initTagManager(): Promise<TagManager> {
    const tagManager = TagManager.getInstance();
    // (重构) 使用空数据同步调用 initialize
    tagManager.initialize({ tags: {}, pages: {} });
    return tagManager;
  },
};

/**
 * 用于创建可重复使用的测试数据
 */
export const testFixtures = {
  tags: {
    frontend: { name: '前端', color: '#4ECDC4' },
    backend: { name: '后端', color: '#45B7D1' },
    database: { name: '数据库', color: '#96CEB4' },
    testing: { name: '测试', color: '#FFEAA7' },
  },

  pages: {
    github: {
      url: 'https://github.com',
      title: 'GitHub',
      domain: 'github.com',
    },
    google: {
      url: 'https://google.com',
      title: 'Google',
      domain: 'google.com',
    },
    stackoverflow: {
      url: 'https://stackoverflow.com',
      title: 'Stack Overflow',
      domain: 'stackoverflow.com',
    },
  },
};

