import { describe, it, expect } from '@jest/globals';
import { mergeDataStrategy } from '../DataMergeStrategy';
import type { TagsCollection, PageCollection } from '../../types/gameplayTag';

describe('DataMergeStrategy Logic Coverage', () => {
  // ----------------------------------------------------------------
  // Tags 相关的防僵尸逻辑
  // ----------------------------------------------------------------

  it('Tags: 应该跳过待删除且云端不存在的标签', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { tags: {}, pages: {} };
    // 模拟本地有一个刚刚被删除的 tag，记录在 pendingDeletes 中
    const pendingDeletes = ['tag:deleted-tag-id'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.tags['deleted-tag-id']).toBeUndefined();
  });

  it('Tags: 应该强制忽略待删除的标签，即使云端返回了旧数据 (防复活)', () => {
    const local = { tags: {}, pages: {} };
    // 云端返回了"幽灵"数据（非删除态）
    const cloud = { 
      tags: { 
        'zombie-tag': { id: 'zombie-tag', name: 'Zombie', updatedAt: 100, createdAt: 100, bindings: [], deleted: false } 
      }, 
      pages: {} 
    };
    const pendingDeletes = ['tag:zombie-tag'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.tags['zombie-tag']).toBeUndefined();
  });

  // ----------------------------------------------------------------
  // Pages 相关的防僵尸逻辑
  // ----------------------------------------------------------------

  it('Pages: 应该跳过待删除且云端不存在的页面', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { tags: {}, pages: {} };
    const pendingDeletes = ['page:deleted-page-id'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.pages['deleted-page-id']).toBeUndefined();
  });

  it('Pages: 应该强制忽略待删除的页面，即使云端返回了旧数据 (防复活)', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { 
      tags: {}, 
      pages: {
        'zombie-page': { id: 'zombie-page', url: 'http://z', title: 'Z', domain: 'z', tags: [], createdAt: 100, updatedAt: 100, deleted: false }
      } 
    };
    const pendingDeletes = ['page:zombie-page'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.pages['zombie-page']).toBeUndefined();
  });
});

