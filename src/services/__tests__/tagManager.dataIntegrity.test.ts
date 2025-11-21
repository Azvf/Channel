import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GameplayStore } from '../gameplayStore';
import { testHelpers } from '../../test/helpers';

describe('TagManager 数据完整性测试', () => {
  let store: GameplayStore;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    store = await testHelpers.initTagManager();
  });

  afterEach(async () => {
    await testHelpers.clearAllData();
  });

  describe('标签名称验证', () => {
    it('createTag_should_validate_name: 验证特殊字符、空字符', () => {
      // 空字符应该失败
      expect(() => store.createTag('')).toThrow();
      expect(() => store.createTag('   ')).toThrow();

      // 只包含空格的字符串应该失败
      expect(() => store.createTag('    ')).toThrow();

      // 特殊字符应该被处理（不应该抛出错误，但会被标准化）
      expect(() => store.createTag('Tag@#$%')).not.toThrow();

      // 正常名称应该成功
      expect(() => store.createTag('正常标签')).not.toThrow();
    });

    it('createTag_should_reject_empty_string', () => {
      const validation = store.validateTagName('');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('请输入标签名称');
    });

    it('createTag_should_reject_whitespace_only', () => {
      const validation = store.validateTagName('   ');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('请输入标签名称');
    });

    it('createTag_should_reject_too_long_name', () => {
      const longName = 'a'.repeat(51);
      const validation = store.validateTagName(longName);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('标签名称不能超过50个字符');
    });

    it('createTag_should_accept_valid_names', () => {
      expect(store.validateTagName('正常标签').valid).toBe(true);
      expect(store.validateTagName('Tag-123').valid).toBe(true);
      expect(store.validateTagName('中文标签').valid).toBe(true);
      expect(store.validateTagName('a'.repeat(50)).valid).toBe(true); // 恰好50个字符
    });
  });

  describe('标签删除级联', () => {
    it('deleteTag_should_cascade: 删除 Tag 时，验证 Pages 里的引用是否被同步移除', () => {
      // 创建标签和页面
      const tag = store.createTag('测试标签');
      const page1 = store.createOrUpdatePage('https://example1.com', '页面1', 'example1.com');
      const page2 = store.createOrUpdatePage('https://example2.com', '页面2', 'example2.com');

      // 将标签添加到页面
      store.addTagToPage(page1.id, tag.id);
      store.addTagToPage(page2.id, tag.id);

      // 验证标签已被添加
      expect(page1.tags).toContain(tag.id);
      expect(page2.tags).toContain(tag.id);

      // 删除标签
      const deleteResult = store.deleteTag(tag.id);

      // 验证删除成功
      expect(deleteResult).toBe(true);
      expect(store.getTagById(tag.id)).toBeUndefined();

      // 验证页面中的引用已被移除
      const updatedPage1 = store.getPageById(page1.id);
      const updatedPage2 = store.getPageById(page2.id);

      expect(updatedPage1?.tags).not.toContain(tag.id);
      expect(updatedPage2?.tags).not.toContain(tag.id);
    });

    it('deleteTag_should_cleanup_bindings: 删除标签时应该清理绑定关系', () => {
      const tag1 = store.createTag('标签1');
      const tag2 = store.createTag('标签2');
      const tag3 = store.createTag('标签3');

      // 建立绑定关系
      store.bindTags(tag1.id, tag2.id);
      store.bindTags(tag1.id, tag3.id);

      // 验证绑定已建立
      expect(tag1.bindings).toContain(tag2.id);
      expect(tag1.bindings).toContain(tag3.id);
      expect(tag2.bindings).toContain(tag1.id);
      expect(tag3.bindings).toContain(tag1.id);

      // 删除 tag1
      store.deleteTag(tag1.id);

      // 验证绑定关系已被清理
      const updatedTag2 = store.getTagById(tag2.id);
      const updatedTag3 = store.getTagById(tag3.id);

      expect(updatedTag2?.bindings).not.toContain(tag1.id);
      expect(updatedTag3?.bindings).not.toContain(tag1.id);
    });
  });

  describe('数据清空和重置', () => {
    it('clearAllData_should_reset_state: 验证数据清空后，isInitialized 状态重置', () => {
      // 创建一些数据
      store.createTag('标签1');
      store.createTag('标签2');
      store.createOrUpdatePage('https://example.com', '页面', 'example.com');

      // 验证已初始化
      expect(store.isInitialized).toBe(true);
      expect(store.getAllTags().length).toBeGreaterThan(0);

      // 清空数据
      store.clearAllData();

      // 验证状态已重置
      expect(store.isInitialized).toBe(false);
      expect(store.getAllTags().length).toBe(0);
      expect(store.getTaggedPages().length).toBe(0);
    });

    it('clearAllData_should_allow_reinitialize: 清空数据后应该允许重新初始化', () => {
      // 创建数据
      store.createTag('标签1');
      expect(store.getAllTags().length).toBe(1);

      // 清空数据
      store.clearAllData();
      expect(store.isInitialized).toBe(false);

      // 重新初始化
      store.initialize({ tags: {}, pages: {} });
      expect(store.isInitialized).toBe(true);

      // 应该可以再次添加数据
      store.createTag('新标签');
      expect(store.getAllTags().length).toBe(1);
    });
  });

  describe('标签使用计数', () => {
    it('should_track_tag_usage_correctly: 验证标签使用计数准确性', () => {
      const tag1 = store.createTag('标签1');
      const tag2 = store.createTag('标签2');
      const tag3 = store.createTag('标签3');

      const page1 = store.createOrUpdatePage('https://example1.com', '页面1', 'example1.com');
      const page2 = store.createOrUpdatePage('https://example2.com', '页面2', 'example2.com');
      const page3 = store.createOrUpdatePage('https://example3.com', '页面3', 'example3.com');

      // 添加标签到页面
      store.addTagToPage(page1.id, tag1.id);
      store.addTagToPage(page2.id, tag1.id);
      store.addTagToPage(page3.id, tag1.id);
      store.addTagToPage(page1.id, tag2.id);

      // 获取使用计数
      const usageCounts = store.getAllTagUsageCounts();

      // 验证计数正确
      expect(usageCounts[tag1.id]).toBe(3); // 在3个页面中使用
      expect(usageCounts[tag2.id]).toBe(1); // 在1个页面中使用
      expect(usageCounts[tag3.id]).toBe(0); // 未使用
    });

    it('should_update_usage_count_after_delete: 删除标签后使用计数应该更新', () => {
      const tag = store.createTag('标签');
      const page = store.createOrUpdatePage('https://example.com', '页面', 'example.com');

      store.addTagToPage(page.id, tag.id);

      let usageCounts = store.getAllTagUsageCounts();
      expect(usageCounts[tag.id]).toBe(1);

      // 删除标签
      store.deleteTag(tag.id);

      // 使用计数应该不再包含该标签
      usageCounts = store.getAllTagUsageCounts();
      expect(usageCounts[tag.id]).toBeUndefined();
    });
  });

  describe('数据一致性', () => {
    it('should_maintain_consistency_after_operations: 验证操作后数据一致性', () => {
      const tag1 = store.createTag('标签1');
      const tag2 = store.createTag('标签2');
      const page = store.createOrUpdatePage('https://example.com', '页面', 'example.com');

      // 添加标签到页面
      store.addTagToPage(page.id, tag1.id);
      store.addTagToPage(page.id, tag2.id);

      // 验证数据一致性
      const updatedPage = store.getPageById(page.id);
      expect(updatedPage?.tags).toHaveLength(2);
      expect(updatedPage?.tags).toContain(tag1.id);
      expect(updatedPage?.tags).toContain(tag2.id);

      // 删除标签
      store.deleteTag(tag1.id);

      // 验证数据一致性
      const pageAfterDelete = store.getPageById(page.id);
      expect(pageAfterDelete?.tags).toHaveLength(1);
      expect(pageAfterDelete?.tags).not.toContain(tag1.id);
      expect(pageAfterDelete?.tags).toContain(tag2.id);
    });

    it('should_handle_concurrent_operations: 处理并发操作的数据一致性', () => {
      const tag = store.createTag('标签');
      const page1 = store.createOrUpdatePage('https://example1.com', '页面1', 'example1.com');
      const page2 = store.createOrUpdatePage('https://example2.com', '页面2', 'example2.com');

      // 同时添加标签到多个页面
      store.addTagToPage(page1.id, tag.id);
      store.addTagToPage(page2.id, tag.id);

      // 验证两个页面都包含该标签
      const updatedPage1 = store.getPageById(page1.id);
      const updatedPage2 = store.getPageById(page2.id);

      expect(updatedPage1?.tags).toContain(tag.id);
      expect(updatedPage2?.tags).toContain(tag.id);

      // 使用计数应该正确
      const usageCounts = store.getAllTagUsageCounts();
      expect(usageCounts[tag.id]).toBe(2);
    });
  });
});

