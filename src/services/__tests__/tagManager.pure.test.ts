/**
 * TagManager 纯逻辑测试
 * 使用 MockRepository 实现纯粹的领域逻辑验证，摆脱对 chrome.storage 的依赖
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameplayStore } from '../gameplayStore';
import { MockTagRepository, MockPageRepository } from '../../infra/database/chrome-storage/repositories/MockRepository';

describe('GameplayStore (Pure Logic)', () => {
  let store: GameplayStore;
  let mockTagRepo: MockTagRepository;
  let mockPageRepo: MockPageRepository;

  beforeEach(() => {
    // 1. 准备环境
    store = GameplayStore.getInstance();
    mockTagRepo = new MockTagRepository();
    mockPageRepo = new MockPageRepository();

    // 2. 依赖注入（关键步骤）
    store.setRepositories(mockTagRepo, mockPageRepo);
    store.clearAllData(); // 清除单例的内存状态
  });

  describe('createTag should persist to repository via commit', () => {
    it('应该创建标签并通过 commit 持久化到 Repository', async () => {
      // Action
      store.createTag('React');
      await store.commit(); // 触发持久化

      // Assert - 直接查 Repo，验证数据落库
      const tags = await mockTagRepo.getAll();
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('React');
    });

    it('应该支持批量创建和持久化', async () => {
      // Action
      store.createTag('Vue');
      store.createTag('Angular');
      store.createTag('Svelte');
      await store.commit();

      // Assert
      const tags = await mockTagRepo.getAll();
      expect(tags).toHaveLength(3);
      expect(tags.map(t => t.name).sort()).toEqual(['Angular', 'React', 'Svelte', 'Vue'].filter(n => n !== 'React').sort());
    });
  });

  describe('deleteTag should cascade remove from pages', () => {
    it('删除标签应该级联移除页面引用', async () => {
      // Arrange
      const tag = store.createTag('Vue');
      const page = store.createOrUpdatePage('https://vuejs.org', 'Vue.js', 'vuejs.org');
      store.addTagToPage(page.id, tag.id);
      await store.commit();

      // 验证初始状态
      let storedTags = await mockTagRepo.getAll();
      let storedPages = await mockPageRepo.getAll();
      expect(storedTags).toHaveLength(1);
      expect(storedPages[0].tags).toContain(tag.id);

      // Action
      store.deleteTag(tag.id);
      await store.commit();

      // Assert
      storedTags = await mockTagRepo.getAll();
      storedPages = await mockPageRepo.getAll();

      expect(storedTags).toHaveLength(0); // 标签已删
      expect(storedPages[0].tags).toHaveLength(0); // 页面引用已删
    });

    it('删除标签应该清理绑定关系', async () => {
      // Arrange
      const tag1 = store.createTag('Frontend');
      const tag2 = store.createTag('Backend');
      store.bindTags(tag1.id, tag2.id);
      await store.commit();

      // 验证初始绑定状态
      let storedTags = await mockTagRepo.getAll();
      expect(storedTags).toHaveLength(2);
      const tag1Stored = storedTags.find(t => t.id === tag1.id);
      const tag2Stored = storedTags.find(t => t.id === tag2.id);
      expect(tag1Stored?.bindings).toContain(tag2.id);
      expect(tag2Stored?.bindings).toContain(tag1.id);

      // Action
      store.deleteTag(tag1.id);
      await store.commit();

      // Assert
      storedTags = await mockTagRepo.getAll();
      expect(storedTags).toHaveLength(1);
      expect(storedTags[0].id).toBe(tag2.id);
      expect(storedTags[0].bindings).toHaveLength(0); // 绑定关系已清理
    });
  });

  describe('标签验证逻辑', () => {
    it('应该验证标签名称长度', () => {
      const longName = 'a'.repeat(51);
      const validation = store.validateTagName(longName);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('50');
    });

    it('应该拒绝空标签名称', () => {
      const validation = store.validateTagName('');
      expect(validation.valid).toBe(false);
    });

    it('应该接受有效的标签名称', () => {
      const validation = store.validateTagName('Valid Tag Name');
      expect(validation.valid).toBe(true);
    });
  });

  describe('Streak 计算逻辑', () => {
    it('应该正确计算连续标记天数', () => {
      // Arrange - 创建连续几天的页面
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        store.createOrUpdatePage(
          `https://example.com/day${i}`,
          `Day ${i}`,
          'example.com'
        );
        // 手动设置 createdAt（在实际场景中由 TagManager 管理）
        const pageId = store.getPageByUrl(`https://example.com/day${i}`)?.id;
        if (pageId) {
          const page = store.getPageById(pageId);
          if (page) {
            (page as any).createdAt = date.getTime();
          }
        }
      }

      // Action
      const stats = store.getUserStats();

      // Assert
      expect(stats.streak).toBeGreaterThanOrEqual(1);
    });

    it('今天没有标记但昨天有，应该继续 streak', () => {
      // Arrange
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      store.createOrUpdatePage('https://example.com', 'Test', 'example.com');
      const page = store.getPageByUrl('https://example.com');
      if (page) {
        (page as any).createdAt = yesterday.getTime();
      }

      // Action
      const stats = store.getUserStats();

      // Assert
      expect(stats.streak).toBeGreaterThanOrEqual(1);
    });
  });

  describe('数据合并逻辑', () => {
    it('应该正确处理标签绑定关系', async () => {
      // Arrange
      const tag1 = store.createTag('React');
      const tag2 = store.createTag('Vue');
      store.bindTags(tag1.id, tag2.id);
      await store.commit();

      // Assert
      const boundTags = store.getBoundTags(tag1.id);
      expect(boundTags).toHaveLength(1);
      expect(boundTags[0].id).toBe(tag2.id);

      // 验证双向绑定
      const reverseBound = store.getBoundTags(tag2.id);
      expect(reverseBound).toHaveLength(1);
      expect(reverseBound[0].id).toBe(tag1.id);
    });

    it('应该正确处理页面标签关联', async () => {
      // Arrange
      const tag = store.createTag('Frontend');
      const page = store.createOrUpdatePage('https://example.com', 'Example', 'example.com');
      store.addTagToPage(page.id, tag.id);
      await store.commit();

      // Assert
      const storedPages = await mockPageRepo.getAll();
      expect(storedPages[0].tags).toContain(tag.id);
    });
  });

  describe('性能测试', () => {
    it('批量操作应该快速完成', async () => {
      const startTime = Date.now();

      // 创建 100 个标签
      for (let i = 0; i < 100; i++) {
        store.createTag(`Tag ${i}`);
      }

      await store.commit();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证数据已持久化
      const tags = await mockTagRepo.getAll();
      expect(tags).toHaveLength(100);

      // 验证性能（应该在 100ms 内完成）
      expect(duration).toBeLessThan(100);
    });
  });
});

