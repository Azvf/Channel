import { describe, it, expect } from '@jest/globals';
import { mergeDataStrategy } from '../DataMergeStrategy';
import type { TagsCollection, PageCollection, GameplayTag } from '../../types/gameplayTag';

// 辅助函数：快速生成测试数据
const createTag = (id: string, name: string, updatedAt: number, deleted: boolean = false): GameplayTag => ({
  id, name, updatedAt, createdAt: 1000, bindings: [], deleted
});

describe('DataMergeStrategy (100% Coverage)', () => {
  describe('Tags Merge Logic', () => {
    it('Branch 1: 待删除且云端不存在 -> 跳过 (本地清理)', () => {
      const result = mergeDataStrategy(
        { tags: {}, pages: {} },
        { tags: {}, pages: {} },
        ['tag:t1']
      );
      expect(result.tags['t1']).toBeUndefined();
    });

    it('Branch 2: 仅云端有 (正常同步)', () => {
      const cloudTag = createTag('t1', 'Cloud', 2000);
      const result = mergeDataStrategy(
        { tags: {}, pages: {} },
        { tags: { t1: cloudTag }, pages: {} }
      );
      expect(result.tags['t1']).toEqual(cloudTag);
    });

    it('Branch 3: 仅云端有，但本地待删除 -> 强制忽略 (防僵尸复活)', () => {
      const cloudTag = createTag('t1', 'Zombie', 2000); // 或者是旧数据
      const result = mergeDataStrategy(
        { tags: {}, pages: {} },
        { tags: { t1: cloudTag }, pages: {} },
        ['tag:t1']
      );
      expect(result.tags['t1']).toBeUndefined();
    });

    it('Branch 4: 仅云端有，但标记为已删除 -> 本地同步删除', () => {
      const cloudTag = createTag('t1', 'Deleted', 2000, true);
      const result = mergeDataStrategy(
        { tags: {}, pages: {} },
        { tags: { t1: cloudTag }, pages: {} }
      );
      expect(result.tags['t1']).toBeUndefined(); // 不应该包含在合并结果中
    });

    it('Branch 5: 仅本地有 (本地新建)', () => {
      const localTag = createTag('t1', 'Local', 2000);
      const result = mergeDataStrategy(
        { tags: { t1: localTag }, pages: {} },
        { tags: {}, pages: {} }
      );
      expect(result.tags['t1']).toEqual(localTag);
    });

    it('Branch 6: 双方都有，云端已删除 -> 本地跟随删除', () => {
      const localTag = createTag('t1', 'Local', 1000);
      const cloudTag = createTag('t1', 'Cloud', 2000, true);
      const result = mergeDataStrategy(
        { tags: { t1: localTag }, pages: {} },
        { tags: { t1: cloudTag }, pages: {} }
      );
      expect(result.tags['t1']).toBeUndefined();
    });

    it('Branch 7: 双方都有，本地更新 (updatedAt Local > Cloud)', () => {
      const localTag = createTag('t1', 'New Local', 3000);
      const cloudTag = createTag('t1', 'Old Cloud', 2000);
      const result = mergeDataStrategy(
        { tags: { t1: localTag }, pages: {} },
        { tags: { t1: cloudTag }, pages: {} }
      );
      expect(result.tags['t1'].name).toBe('New Local');
    });

    it('Branch 8: 双方都有，云端更新 (updatedAt Cloud > Local)', () => {
      const localTag = createTag('t1', 'Old Local', 1000);
      const cloudTag = createTag('t1', 'New Cloud', 4000);
      const result = mergeDataStrategy(
        { tags: { t1: localTag }, pages: {} },
        { tags: { t1: cloudTag }, pages: {} }
      );
      expect(result.tags['t1'].name).toBe('New Cloud');
    });
    
    it('Branch 9: 双方都有，时间戳相同 -> 优先本地 (Tie-breaker)', () => {
      const localTag = createTag('t1', 'Tie Local', 2000);
      const cloudTag = createTag('t1', 'Tie Cloud', 2000);
      const result = mergeDataStrategy(
        { tags: { t1: localTag }, pages: {} },
        { tags: { t1: cloudTag }, pages: {} }
      );
      expect(result.tags['t1'].name).toBe('Tie Local');
    });
  });

  // 对 Pages 复用相同的逻辑测试（简略验证关键路径）
  describe('Pages Merge Logic', () => {
    it('应该处理 Page 的僵尸数据复活场景', () => {
      const cloudPage = { id: 'p1', url: 'u', title: 't', domain: 'd', tags: [], createdAt: 1, updatedAt: 1, deleted: false };
      const result = mergeDataStrategy(
        { tags: {}, pages: {} },
        { tags: {}, pages: { p1: cloudPage } },
        ['page:p1']
      );
      expect(result.pages['p1']).toBeUndefined();
    });
  });
});
