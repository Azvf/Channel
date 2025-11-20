import { describe, it, expect, jest } from '@jest/globals';
import type { TagsCollection, PageCollection, GameplayTag, TaggedPage } from '../../types/gameplayTag';

// Mock Supabase - 必须在其他导入之前
jest.mock('../../lib/supabase', () => {
  const { jest } = require('@jest/globals');
  const mockSelectInner = jest.fn(() => ({
    eq: jest.fn(() => ({
      gt: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  }));

  const mockFromInner = jest.fn(() => ({
    select: mockSelectInner,
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  }));

  return {
    supabase: {
      from: mockFromInner,
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: null }, unsubscribe: jest.fn() })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
      },
      channel: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn(),
        })),
      })),
      removeChannel: jest.fn(),
    },
    // 导出 mock 函数以便在测试中使用
    __mockFrom: mockFromInner,
    __mockSelect: mockSelectInner,
  };
});

// Mock AuthService - 必须在 SyncService 导入之前
jest.mock('../authService', () => ({
  authService: {
    getState: jest.fn(() => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    })),
    subscribe: jest.fn(() => jest.fn()),
    logout: jest.fn(() => Promise.resolve()),
  },
}));

import { mergeDataStrategy } from '../../logic/DataMergeStrategy';

describe('DataMergeStrategy (Pure Logic)', () => {
  describe('合并算法 - 时间戳优先级', () => {
    it('应该优先保留本地较新的更新 (Last-Write-Wins)', () => {
      const localTag: GameplayTag = {
        id: 'tag-1',
        name: '本地标签',
        updatedAt: 2000,
        createdAt: 1000,
        bindings: [],
      };

      const cloudTag: GameplayTag = {
        id: 'tag-1',
        name: '云端标签（旧）',
        updatedAt: 1000,
        createdAt: 1000,
        bindings: [],
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': localTag },
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': cloudTag },
        pages: {},
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      expect(result.tags['tag-1']).toBeDefined();
      expect(result.tags['tag-1'].name).toBe('本地标签');
      expect(result.tags['tag-1'].updatedAt).toBe(2000);
    });

    it('应该优先保留云端较新的更新 (Last-Write-Wins)', () => {
      const localTag: GameplayTag = {
        id: 'tag-1',
        name: '本地标签（旧）',
        updatedAt: 1000,
        createdAt: 1000,
        bindings: [],
      };

      const cloudTag: GameplayTag = {
        id: 'tag-1',
        name: '云端标签',
        updatedAt: 2000,
        createdAt: 1000,
        bindings: [],
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': localTag },
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': cloudTag },
        pages: {},
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      expect(result.tags['tag-1']).toBeDefined();
      expect(result.tags['tag-1'].name).toBe('云端标签');
      expect(result.tags['tag-1'].updatedAt).toBe(2000);
    });
  });

  describe('[核心防线] 防止僵尸数据复活', () => {
    it('[Anti-Zombie] 当本地在 pendingDeletes 列表中有该 ID，且云端返回了该 ID 的旧数据（非删除态），断言合并结果中该 ID 被移除/忽略', () => {
      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {}, // 本地内存已无 tag-1（刚删除）
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {
          'tag-1': {
            id: 'tag-1',
            name: '旧标签',
            deleted: false, // 云端返回旧数据（非删除态）
            updatedAt: 1000,
            createdAt: 1000,
            bindings: [],
          } as any,
        },
        pages: {},
      };

      const pendingDeletes = ['tag:tag-1']; // 待删除队列中有该 ID

      const result = mergeDataStrategy(localData, cloudData, pendingDeletes);

      // 断言：合并结果中不应包含 tag-1，防止复活
      expect(result.tags['tag-1']).toBeUndefined();
    });

    it('应该尊重云端删除标记：云端返回 deleted: true，本地即使有旧数据也应删除', () => {
      const localTag: GameplayTag = {
        id: 'tag-1',
        name: '本地标签',
        updatedAt: 1000,
        createdAt: 1000,
        bindings: [],
      };

      const cloudTag = {
        id: 'tag-1',
        name: '云端标签',
        deleted: true, // 云端标记为已删除
        updatedAt: 2000,
        createdAt: 1000,
        bindings: [],
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': localTag },
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': cloudTag as any },
        pages: {},
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      // 断言：即使本地有数据，也应该被删除（不包含在结果中）
      expect(result.tags['tag-1']).toBeUndefined();
    });

    it('应该忽略待删除队列中的项，如果云端也没有，应该跳过', () => {
      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {},
      };

      const pendingDeletes = ['tag:tag-1'];

      const result = mergeDataStrategy(localData, cloudData, pendingDeletes);

      // 断言：结果中不应包含 tag-1
      expect(result.tags['tag-1']).toBeUndefined();
    });

    it('即使云端返回了旧数据，如果该 ID 在待删除队列中，也应该忽略', () => {
      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {
          'tag-1': {
            id: 'tag-1',
            name: '云端旧数据',
            deleted: false,
            updatedAt: 500, // 很旧的数据
            createdAt: 500,
            bindings: [],
          } as any,
        },
        pages: {},
      };

      const pendingDeletes = ['tag:tag-1'];

      const result = mergeDataStrategy(localData, cloudData, pendingDeletes);

      // 断言：即使云端返回了数据，也应该被忽略
      expect(result.tags['tag-1']).toBeUndefined();
    });
  });

  describe('页面合并逻辑', () => {
    it('页面合并应该遵循与标签相同的规则', () => {
      const localPage: TaggedPage = {
        id: 'page-1',
        url: 'https://example.com',
        title: '本地页面',
        domain: 'example.com',
        tags: [],
        updatedAt: 2000,
        createdAt: 1000,
      };

      const cloudPage = {
        id: 'page-1',
        url: 'https://example.com',
        title: '云端页面（旧）',
        domain: 'example.com',
        tags: [],
        updatedAt: 1000,
        createdAt: 1000,
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: { 'page-1': localPage },
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: { 'page-1': cloudPage as any },
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      expect(result.pages['page-1']).toBeDefined();
      expect(result.pages['page-1'].title).toBe('本地页面');
    });

    it('云端标记为已删除的页面应该被移除', () => {
      const localPage: TaggedPage = {
        id: 'page-1',
        url: 'https://example.com',
        title: '本地页面',
        domain: 'example.com',
        tags: [],
        updatedAt: 1000,
        createdAt: 1000,
      };

      const cloudPage = {
        id: 'page-1',
        url: 'https://example.com',
        title: '云端页面',
        domain: 'example.com',
        tags: [],
        deleted: true,
        updatedAt: 2000,
        createdAt: 1000,
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: { 'page-1': localPage },
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: { 'page-1': cloudPage as any },
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      expect(result.pages['page-1']).toBeUndefined();
    });

    it('防止页面僵尸数据复活', () => {
      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {
          'page-1': {
            id: 'page-1',
            url: 'https://example.com',
            title: '旧页面',
            domain: 'example.com',
            tags: [],
            deleted: false,
            updatedAt: 1000,
            createdAt: 1000,
          } as any,
        },
      };

      const pendingDeletes = ['page:page-1'];

      const result = mergeDataStrategy(localData, cloudData, pendingDeletes);

      expect(result.pages['page-1']).toBeUndefined();
    });
  });

  // 注意：增量同步查询构建的测试已移除
  // 这些测试之前测试的是私有方法 fetchFromCloud
  // 根据重构原则，我们不再测试私有方法，而是通过公共 API (syncAll) 的副作用来验证

  describe('边界情况', () => {
    it('应该处理空的云端数据', () => {
      const localTag: GameplayTag = {
        id: 'tag-1',
        name: '本地标签',
        updatedAt: 1000,
        createdAt: 1000,
        bindings: [],
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': localTag },
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {},
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      // 本地数据应该被保留
      expect(result.tags['tag-1']).toBeDefined();
      expect(result.tags['tag-1'].name).toBe('本地标签');
    });

    it('应该处理空的本地数据', () => {
      const cloudTag: GameplayTag = {
        id: 'tag-1',
        name: '云端标签',
        updatedAt: 1000,
        createdAt: 1000,
        bindings: [],
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: {},
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': cloudTag },
        pages: {},
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      // 云端数据应该被添加
      expect(result.tags['tag-1']).toBeDefined();
      expect(result.tags['tag-1'].name).toBe('云端标签');
    });

    it('应该处理时间戳相同的情况', () => {
      const localTag: GameplayTag = {
        id: 'tag-1',
        name: '本地标签',
        updatedAt: 1000,
        createdAt: 1000,
        bindings: [],
      };

      const cloudTag: GameplayTag = {
        id: 'tag-1',
        name: '云端标签',
        updatedAt: 1000, // 相同时间戳
        createdAt: 1000,
        bindings: [],
      };

      const localData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': localTag },
        pages: {},
      };

      const cloudData: { tags: TagsCollection; pages: PageCollection } = {
        tags: { 'tag-1': cloudTag },
        pages: {},
      };

      const result = mergeDataStrategy(localData, cloudData, []);

      // 应该保留本地数据（>= 的情况下优先本地）
      expect(result.tags['tag-1']).toBeDefined();
      expect(result.tags['tag-1'].name).toBe('本地标签');
    });
  });
});

