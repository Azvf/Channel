import { describe, it, expect } from '@jest/globals';
import { mergeDataStrategy } from '../DataMergeStrategy';

describe('DataMergeStrategy Logic Coverage', () => {
  // ----------------------------------------------------------------
  // 针对 Tags 的覆盖
  // ----------------------------------------------------------------

  // 覆盖 Line 39-40: Tag 在待删除队列中，且云端没有数据 -> 应该跳过（而不是报错或做其他处理）
  it('Tags: 应该跳过待删除且云端不存在的标签 (Pending Delete Local & Cloud Missing)', () => {
    // 注意：local 中需要有这个 tag，它才会出现在 allTagIds 集合中
    const local = { 
      tags: { 
        'deleted-tag-id': { id: 'deleted-tag-id', name: 'Deleted', updatedAt: 100, createdAt: 100, bindings: [] }
      }, 
      pages: {} 
    };
    const cloud = { tags: {}, pages: {} };
    const pendingDeletes = ['tag:deleted-tag-id'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.tags['deleted-tag-id']).toBeUndefined();
  });

  // 覆盖 Line 45-47: Tag 在待删除队列中，云端却返回了数据（旧数据）-> 应该强制忽略
  it('Tags: 应该防御云端僵尸数据复活 (Pending Delete Local & Cloud Has Stale Data)', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { 
      tags: { 
        'zombie-tag': { id: 'zombie-tag', name: 'Zombie', updatedAt: 100, createdAt: 100, bindings: [] } 
      }, 
      pages: {} 
    };
    const pendingDeletes = ['tag:zombie-tag'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.tags['zombie-tag']).toBeUndefined();
  });

  // 覆盖 Line 50-53: 云端已删除标签，本地也应该删
  it('Tags: 应该同步删除云端已删除的标签', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { 
      tags: { 
        'deleted-tag': { id: 'deleted-tag', name: 'Deleted', updatedAt: 100, createdAt: 100, bindings: [], deleted: true } 
      }, 
      pages: {} 
    };
    const pendingDeletes: string[] = [];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.tags['deleted-tag']).toBeUndefined();
  });

  // ----------------------------------------------------------------
  // 针对 Pages 的覆盖 (逻辑与 Tags 类似，但代码位置不同)
  // ----------------------------------------------------------------

  // 覆盖 Page 循环中的 "跳过已删除页面" 分支
  it('Pages: 应该跳过待删除且云端不存在的页面', () => {
    // 注意：local 中需要有这个 page，它才会出现在 allPageIds 集合中
    const local = { 
      tags: {}, 
      pages: {
        'deleted-page-id': { 
          id: 'deleted-page-id', 
          url: 'http://deleted', 
          title: 'Deleted', 
          domain: 'deleted', 
          tags: [], 
          createdAt: 100, 
          updatedAt: 100 
        }
      } 
    };
    const cloud = { tags: {}, pages: {} };
    const pendingDeletes = ['page:deleted-page-id'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.pages['deleted-page-id']).toBeUndefined();
  });

  // 覆盖 Page 循环中的 "防御云端旧数据复活" 分支
  it('Pages: 应该防御云端僵尸页面复活', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { 
      tags: {}, 
      pages: {
        'zombie-page': { 
          id: 'zombie-page', 
          url: 'http://z', 
          title: 'Z', 
          domain: 'z', 
          tags: [], 
          createdAt: 100, 
          updatedAt: 100 
        }
      } 
    };
    const pendingDeletes = ['page:zombie-page'];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.pages['zombie-page']).toBeUndefined();
  });

  // 覆盖 Line 102-108: 云端已删除页面，本地也应该删
  it('Pages: 应该同步删除云端已删除的页面', () => {
    const local = { tags: {}, pages: {} };
    const cloud = { 
      tags: {}, 
      pages: {
        'deleted-page': { 
          id: 'deleted-page', 
          url: 'http://deleted', 
          title: 'Deleted', 
          domain: 'deleted', 
          tags: [], 
          createdAt: 100, 
          updatedAt: 100,
          deleted: true
        }
      } 
    };
    const pendingDeletes: string[] = [];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.pages['deleted-page']).toBeUndefined();
  });

  // 覆盖 Line 111: 只有本地有页面，保留
  it('Pages: 应该保留只有本地有的页面', () => {
    const local = { 
      tags: {}, 
      pages: {
        'local-only-page': { 
          id: 'local-only-page', 
          url: 'http://local', 
          title: 'Local Only', 
          domain: 'local', 
          tags: [], 
          createdAt: 100, 
          updatedAt: 100 
        }
      } 
    };
    const cloud = { tags: {}, pages: {} };
    const pendingDeletes: string[] = [];

    const result = mergeDataStrategy(local, cloud, pendingDeletes);

    expect(result.pages['local-only-page']).toBeDefined();
    expect(result.pages['local-only-page'].id).toBe('local-only-page');
  });
});

