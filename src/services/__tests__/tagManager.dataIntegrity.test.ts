import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TagManager } from '../tagManager';
import { testHelpers } from '../../test/helpers';

describe('TagManager 数据完整性测试', () => {
  let tagManager: TagManager;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    tagManager = await testHelpers.initTagManager();
  });

  afterEach(async () => {
    await testHelpers.clearAllData();
  });

  describe('标签名称验证', () => {
    it('createTag_should_validate_name: 验证特殊字符、空字符', () => {
      // 空字符应该失败
      expect(() => tagManager.createTag('')).toThrow();
      expect(() => tagManager.createTag('   ')).toThrow();

      // 只包含空格的字符串应该失败
      expect(() => tagManager.createTag('    ')).toThrow();

      // 特殊字符应该被处理（不应该抛出错误，但会被标准化）
      expect(() => tagManager.createTag('Tag@#$%')).not.toThrow();

      // 正常名称应该成功
      expect(() => tagManager.createTag('正常标签')).not.toThrow();
    });

    it('createTag_should_reject_empty_string', () => {
      const validation = tagManager.validateTagName('');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('请输入标签名称');
    });

    it('createTag_should_reject_whitespace_only', () => {
      const validation = tagManager.validateTagName('   ');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('请输入标签名称');
    });

    it('createTag_should_reject_too_long_name', () => {
      const longName = 'a'.repeat(51);
      const validation = tagManager.validateTagName(longName);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('标签名称不能超过50个字符');
    });

    it('createTag_should_accept_valid_names', () => {
      expect(tagManager.validateTagName('正常标签').valid).toBe(true);
      expect(tagManager.validateTagName('Tag-123').valid).toBe(true);
      expect(tagManager.validateTagName('中文标签').valid).toBe(true);
      expect(tagManager.validateTagName('a'.repeat(50)).valid).toBe(true); // 恰好50个字符
    });
  });

  describe('标签删除级联', () => {
    it('deleteTag_should_cascade: 删除 Tag 时，验证 Pages 里的引用是否被同步移除', () => {
      // 创建标签和页面
      const tag = tagManager.createTag('测试标签');
      const page1 = tagManager.createOrUpdatePage('https://example1.com', '页面1', 'example1.com');
      const page2 = tagManager.createOrUpdatePage('https://example2.com', '页面2', 'example2.com');

      // 将标签添加到页面
      tagManager.addTagToPage(page1.id, tag.id);
      tagManager.addTagToPage(page2.id, tag.id);

      // 验证标签已被添加
      expect(page1.tags).toContain(tag.id);
      expect(page2.tags).toContain(tag.id);

      // 删除标签
      const deleteResult = tagManager.deleteTag(tag.id);

      // 验证删除成功
      expect(deleteResult).toBe(true);
      expect(tagManager.getTagById(tag.id)).toBeUndefined();

      // 验证页面中的引用已被移除
      const updatedPage1 = tagManager.getPageById(page1.id);
      const updatedPage2 = tagManager.getPageById(page2.id);

      expect(updatedPage1?.tags).not.toContain(tag.id);
      expect(updatedPage2?.tags).not.toContain(tag.id);
    });

    it('deleteTag_should_cleanup_bindings: 删除标签时应该清理绑定关系', () => {
      const tag1 = tagManager.createTag('标签1');
      const tag2 = tagManager.createTag('标签2');
      const tag3 = tagManager.createTag('标签3');

      // 建立绑定关系
      tagManager.bindTags(tag1.id, tag2.id);
      tagManager.bindTags(tag1.id, tag3.id);

      // 验证绑定已建立
      expect(tag1.bindings).toContain(tag2.id);
      expect(tag1.bindings).toContain(tag3.id);
      expect(tag2.bindings).toContain(tag1.id);
      expect(tag3.bindings).toContain(tag1.id);

      // 删除 tag1
      tagManager.deleteTag(tag1.id);

      // 验证绑定关系已被清理
      const updatedTag2 = tagManager.getTagById(tag2.id);
      const updatedTag3 = tagManager.getTagById(tag3.id);

      expect(updatedTag2?.bindings).not.toContain(tag1.id);
      expect(updatedTag3?.bindings).not.toContain(tag1.id);
    });
  });

  describe('数据清空和重置', () => {
    it('clearAllData_should_reset_state: 验证数据清空后，isInitialized 状态重置', () => {
      // 创建一些数据
      tagManager.createTag('标签1');
      tagManager.createTag('标签2');
      tagManager.createOrUpdatePage('https://example.com', '页面', 'example.com');

      // 验证已初始化
      expect(tagManager.isInitialized).toBe(true);
      expect(tagManager.getAllTags().length).toBeGreaterThan(0);

      // 清空数据
      tagManager.clearAllData();

      // 验证状态已重置
      expect(tagManager.isInitialized).toBe(false);
      expect(tagManager.getAllTags().length).toBe(0);
      expect(tagManager.getTaggedPages().length).toBe(0);
    });

    it('clearAllData_should_allow_reinitialize: 清空数据后应该允许重新初始化', () => {
      // 创建数据
      tagManager.createTag('标签1');
      expect(tagManager.getAllTags().length).toBe(1);

      // 清空数据
      tagManager.clearAllData();
      expect(tagManager.isInitialized).toBe(false);

      // 重新初始化
      tagManager.initialize({ tags: {}, pages: {} });
      expect(tagManager.isInitialized).toBe(true);

      // 应该可以再次添加数据
      tagManager.createTag('新标签');
      expect(tagManager.getAllTags().length).toBe(1);
    });
  });

  describe('标签使用计数', () => {
    it('should_track_tag_usage_correctly: 验证标签使用计数准确性', () => {
      const tag1 = tagManager.createTag('标签1');
      const tag2 = tagManager.createTag('标签2');
      const tag3 = tagManager.createTag('标签3');

      const page1 = tagManager.createOrUpdatePage('https://example1.com', '页面1', 'example1.com');
      const page2 = tagManager.createOrUpdatePage('https://example2.com', '页面2', 'example2.com');
      const page3 = tagManager.createOrUpdatePage('https://example3.com', '页面3', 'example3.com');

      // 添加标签到页面
      tagManager.addTagToPage(page1.id, tag1.id);
      tagManager.addTagToPage(page2.id, tag1.id);
      tagManager.addTagToPage(page3.id, tag1.id);
      tagManager.addTagToPage(page1.id, tag2.id);

      // 获取使用计数
      const usageCounts = tagManager.getAllTagUsageCounts();

      // 验证计数正确
      expect(usageCounts[tag1.id]).toBe(3); // 在3个页面中使用
      expect(usageCounts[tag2.id]).toBe(1); // 在1个页面中使用
      expect(usageCounts[tag3.id]).toBe(0); // 未使用
    });

    it('should_update_usage_count_after_delete: 删除标签后使用计数应该更新', () => {
      const tag = tagManager.createTag('标签');
      const page = tagManager.createOrUpdatePage('https://example.com', '页面', 'example.com');

      tagManager.addTagToPage(page.id, tag.id);

      let usageCounts = tagManager.getAllTagUsageCounts();
      expect(usageCounts[tag.id]).toBe(1);

      // 删除标签
      tagManager.deleteTag(tag.id);

      // 使用计数应该不再包含该标签
      usageCounts = tagManager.getAllTagUsageCounts();
      expect(usageCounts[tag.id]).toBeUndefined();
    });
  });

  describe('数据一致性', () => {
    it('should_maintain_consistency_after_operations: 验证操作后数据一致性', () => {
      const tag1 = tagManager.createTag('标签1');
      const tag2 = tagManager.createTag('标签2');
      const page = tagManager.createOrUpdatePage('https://example.com', '页面', 'example.com');

      // 添加标签到页面
      tagManager.addTagToPage(page.id, tag1.id);
      tagManager.addTagToPage(page.id, tag2.id);

      // 验证数据一致性
      const updatedPage = tagManager.getPageById(page.id);
      expect(updatedPage?.tags).toHaveLength(2);
      expect(updatedPage?.tags).toContain(tag1.id);
      expect(updatedPage?.tags).toContain(tag2.id);

      // 删除标签
      tagManager.deleteTag(tag1.id);

      // 验证数据一致性
      const pageAfterDelete = tagManager.getPageById(page.id);
      expect(pageAfterDelete?.tags).toHaveLength(1);
      expect(pageAfterDelete?.tags).not.toContain(tag1.id);
      expect(pageAfterDelete?.tags).toContain(tag2.id);
    });

    it('should_handle_concurrent_operations: 处理并发操作的数据一致性', () => {
      const tag = tagManager.createTag('标签');
      const page1 = tagManager.createOrUpdatePage('https://example1.com', '页面1', 'example1.com');
      const page2 = tagManager.createOrUpdatePage('https://example2.com', '页面2', 'example2.com');

      // 同时添加标签到多个页面
      tagManager.addTagToPage(page1.id, tag.id);
      tagManager.addTagToPage(page2.id, tag.id);

      // 验证两个页面都包含该标签
      const updatedPage1 = tagManager.getPageById(page1.id);
      const updatedPage2 = tagManager.getPageById(page2.id);

      expect(updatedPage1?.tags).toContain(tag.id);
      expect(updatedPage2?.tags).toContain(tag.id);

      // 使用计数应该正确
      const usageCounts = tagManager.getAllTagUsageCounts();
      expect(usageCounts[tag.id]).toBe(2);
    });
  });
});

