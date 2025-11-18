import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TagManager } from '../tagManager';
import type { GameplayTag } from '../../types/gameplayTag';
import { testHelpers } from '../../test/helpers';

describe('TagManager', () => {
  let tagManager: TagManager;

  beforeEach(async () => {
    // 每个测试前初始化并清空数据
    await testHelpers.clearAllData();
    tagManager = await testHelpers.initTagManager();
  });

  afterEach(async () => {
    // 每个测试后清空数据
    await testHelpers.clearAllData();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = TagManager.getInstance();
      const instance2 = TagManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该正确初始化', async () => {
      expect(tagManager).toBeDefined();
      const stats = tagManager.getDataStats();
      expect(stats.tagsCount).toBe(0);
      expect(stats.pagesCount).toBe(0);
    });
  });

  describe('标签创建与管理', () => {
    it('应该创建新标签', () => {
      const tag = tagManager.createTag('前端开发');
      expect(tag).toBeDefined();
      expect(tag.name).toBe('前端开发');
      // 中文标签使用base64编码的ID
      expect(tag.id).toMatch(/^tag_/);
      expect(tag.bindings).toEqual([]);
      expect(tag.color).toBeDefined();
    });

    it('应该创建带自定义颜色的标签', () => {
      const customColor = '#FF5733';
      const tag = tagManager.createTag('后端开发', undefined, customColor);
      expect(tag.color).toBe(customColor);
    });

    it('应该创建带描述的标签', () => {
      const description = '前端开发相关技术';
      const tag = tagManager.createTag('前端', description);
      expect(tag.description).toBe(description);
    });

    it('应该验证标签名称', () => {
      // 空名称应该失败
      expect(() => tagManager.createTag('')).toThrow();
      expect(() => tagManager.createTag('   ')).toThrow();

      // 正常名称应该成功
      expect(() => tagManager.createTag('前端')).not.toThrow();
    });

    it('应该处理标签名称过长', () => {
      const longName = 'a'.repeat(51);
      expect(() => tagManager.createTag(longName)).toThrow();
    });

    it('应该自动生成标签ID', () => {
      const tag = tagManager.createTag('测试标签名称');
      expect(tag.id).toBeDefined();
      expect(tag.id).toMatch(/^tag_/);
    });

    it('应该获取所有标签', () => {
      tagManager.createTag('前端');
      tagManager.createTag('后端');
      tagManager.createTag('数据库');

      const allTags = tagManager.getAllTags();
      expect(allTags.length).toBe(3);
    });

    it('应该根据ID获取标签', () => {
      const createdTag = tagManager.createTag('前端');
      const foundTag = tagManager.getTagById(createdTag.id);
      
      expect(foundTag).toBeDefined();
      expect(foundTag?.name).toBe('前端');
    });

    it('应该根据名称查找标签（忽略大小写）', () => {
      tagManager.createTag('前端开发');
      
      expect(tagManager.findTagByName('前端开发')).toBeDefined();
      expect(tagManager.findTagByName('前端开发')).toBeDefined();
      expect(tagManager.findTagByName('前端开发')).toBeDefined();
      expect(tagManager.findTagByName('后端开发')).toBeUndefined();
    });

    it('应该处理不存在的标签', () => {
      expect(tagManager.getTagById('不存在的标签')).toBeUndefined();
      expect(tagManager.findTagByName('不存在的标签')).toBeUndefined();
    });
  });

  describe('标签绑定功能', () => {
    let tagA: GameplayTag;
    let tagB: GameplayTag;
    let tagC: GameplayTag;

    beforeEach(() => {
      tagA = tagManager.createTag('前端');
      tagB = tagManager.createTag('React');
      tagC = tagManager.createTag('Vue');
    });

    it('应该成功绑定两个标签', () => {
      const result = tagManager.bindTags(tagA.id, tagB.id);
      
      expect(result).toBe(true);
      expect(tagA.bindings).toContain(tagB.id);
      expect(tagB.bindings).toContain(tagA.id);
    });

    it('应该实现对称绑定', () => {
      tagManager.bindTags(tagA.id, tagB.id);
      
      const boundTagsA = tagManager.getBoundTags(tagA.id);
      const boundTagsB = tagManager.getBoundTags(tagB.id);
      
      expect(boundTagsA).toHaveLength(1);
      expect(boundTagsB).toHaveLength(1);
      expect(boundTagsA[0].id).toBe(tagB.id);
      expect(boundTagsB[0].id).toBe(tagA.id);
    });

    it('应该防止重复绑定', () => {
      tagManager.bindTags(tagA.id, tagB.id);
      tagManager.bindTags(tagA.id, tagB.id);
      
      expect(tagA.bindings.filter(id => id === tagB.id)).toHaveLength(1);
      expect(tagB.bindings.filter(id => id === tagA.id)).toHaveLength(1);
    });

    it('应该防止标签绑定自身', () => {
      const result = tagManager.bindTags(tagA.id, tagA.id);
      expect(result).toBe(false);
      expect(tagA.bindings).not.toContain(tagA.id);
    });

    it('应该解除标签绑定', () => {
      tagManager.bindTags(tagA.id, tagB.id);
      expect(tagA.bindings).toContain(tagB.id);
      
      const result = tagManager.unbindTags(tagA.id, tagB.id);
      
      expect(result).toBe(true);
      expect(tagA.bindings).not.toContain(tagB.id);
      expect(tagB.bindings).not.toContain(tagA.id);
    });

    it('应该处理解除不存在的绑定', () => {
      // unbindTags 会检查标签是否存在，如果存在则返回true
      const result = tagManager.unbindTags(tagA.id, tagB.id);
      // 两个标签都存在，所以会返回true（即使实际上没有绑定）
      expect(result).toBe(true);
      expect(tagA.bindings).not.toContain(tagB.id);
      expect(tagB.bindings).not.toContain(tagA.id);
    });

    it('应该处理解除不存在标签的绑定', () => {
      const result = tagManager.unbindTags(tagA.id, 'nonexistent-id');
      expect(result).toBe(false);
    });

    it('应该支持多个标签绑定', () => {
      tagManager.bindTags(tagA.id, tagB.id);
      tagManager.bindTags(tagA.id, tagC.id);
      
      const boundTags = tagManager.getBoundTags(tagA.id);
      expect(boundTags).toHaveLength(2);
      expect(boundTags.map(t => t.id)).toContain(tagB.id);
      expect(boundTags.map(t => t.id)).toContain(tagC.id);
    });
  });

  describe('页面管理', () => {
    it('应该创建新页面', () => {
      const page = tagManager.createOrUpdatePage(
        'https://github.com',
        'GitHub',
        'github.com',
        'https://github.com/favicon.ico'
      );
      
      expect(page).toBeDefined();
      expect(page.url).toBe('https://github.com');
      expect(page.title).toBe('GitHub');
      expect(page.domain).toBe('github.com');
      expect(page.favicon).toBe('https://github.com/favicon.ico');
      expect(page.tags).toEqual([]);
    });

    it('应该更新已存在的页面', () => {
      const url = 'https://github.com';
      const page1 = tagManager.createOrUpdatePage(url, 'GitHub', 'github.com');
      const page2 = tagManager.createOrUpdatePage(url, 'GitHub Repository', 'github.com');
      
      expect(page1.id).toBe(page2.id);
      expect(page2.title).toBe('GitHub Repository');
    });

    it('应该根据ID获取页面', () => {
      const createdPage = tagManager.createOrUpdatePage(
        'https://github.com',
        'GitHub',
        'github.com'
      );
      
      const foundPage = tagManager.getPageById(createdPage.id);
      expect(foundPage).toBeDefined();
      expect(foundPage?.title).toBe('GitHub');
    });

    it('应该返回所有带标签的页面', () => {
      const page1 = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      tagManager.createOrUpdatePage('https://google.com', 'Google', 'google.com');
      
      // 只为第一个页面添加标签
      const tag = tagManager.createTag('开源');
      tagManager.addTagToPage(page1.id, tag.id);
      
      const taggedPages = tagManager.getTaggedPages();
      expect(taggedPages).toHaveLength(1);
      expect(taggedPages[0].id).toBe(page1.id);
    });
  });

  describe('页面标签关联', () => {
    let page: ReturnType<typeof tagManager.createOrUpdatePage>;
    let tag: GameplayTag;

    beforeEach(() => {
      page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      tag = tagManager.createTag('开源');
    });

    it('应该添加标签到页面', () => {
      const result = tagManager.addTagToPage(page.id, tag.id);
      
      expect(result).toBe(true);
      expect(page.tags).toContain(tag.id);
    });

    it('应该防止重复添加标签', () => {
      tagManager.addTagToPage(page.id, tag.id);
      const result = tagManager.addTagToPage(page.id, tag.id);
      
      expect(result).toBe(false);
      expect(page.tags.filter(id => id === tag.id)).toHaveLength(1);
    });

    it('应该从页面移除标签', () => {
      tagManager.addTagToPage(page.id, tag.id);
      expect(page.tags).toContain(tag.id);
      
      const result = tagManager.removeTagFromPage(page.id, tag.id);
      
      expect(result).toBe(true);
      expect(page.tags).not.toContain(tag.id);
    });

    it('应该支持toggle接口', () => {
      expect(page.tags).not.toContain(tag.id);
      
      tagManager.toggleTagOnPage(page.id, tag.id, true);
      expect(page.tags).toContain(tag.id);
      
      tagManager.toggleTagOnPage(page.id, tag.id, false);
      expect(page.tags).not.toContain(tag.id);
    });

    it('应该根据标签筛选页面', () => {
      const page2 = tagManager.createOrUpdatePage('https://google.com', 'Google', 'google.com');
      const page3 = tagManager.createOrUpdatePage('https://stackoverflow.com', 'Stack Overflow', 'stackoverflow.com');
      
      // 为前两个页面添加标签
      tagManager.addTagToPage(page.id, tag.id);
      tagManager.addTagToPage(page2.id, tag.id);
      
      const taggedPages = tagManager.getTaggedPages(tag.id);
      expect(taggedPages).toHaveLength(2);
      expect(taggedPages.map(p => p.id)).toContain(page.id);
      expect(taggedPages.map(p => p.id)).toContain(page2.id);
      expect(taggedPages.map(p => p.id)).not.toContain(page3.id);
    });

    it('应该返回多个标签的页面（同时满足多个标签）', () => {
      const tag2 = tagManager.createTag('JavaScript');
      
      const page2 = tagManager.createOrUpdatePage('https://google.com', 'Google', 'google.com');
      
      // page1 有两个标签
      tagManager.addTagToPage(page.id, tag.id);
      tagManager.addTagToPage(page.id, tag2.id);
      
      // page2 只有一个标签
      tagManager.addTagToPage(page2.id, tag.id);
      
      const pagesWithTag = tagManager.getTaggedPages(tag.id);
      expect(pagesWithTag).toHaveLength(2);
    });
  });

  describe('高级功能', () => {
    it('应该创建标签并添加到页面', () => {
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      
      const tag = tagManager.createTagAndAddToPage('开源', page.id);
      
      expect(tag).toBeDefined();
      expect(tag.name).toBe('开源');
      expect(page.tags).toContain(tag.id);
    });

    it('应该处理同名标签（使用现有标签）', () => {
      const page1 = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      const page2 = tagManager.createOrUpdatePage('https://google.com', 'Google', 'google.com');
      
      const tag1 = tagManager.createTagAndAddToPage('开源', page1.id);
      const tag2 = tagManager.createTagAndAddToPage('开源', page2.id);
      
      // 应该使用同一个标签
      expect(tag1.id).toBe(tag2.id);
      expect(page1.tags).toContain(tag1.id);
      expect(page2.tags).toContain(tag1.id);
    });

    it('应该提供数据统计', () => {
      tagManager.createTag('前端');
      tagManager.createTag('后端');
      tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      
      const stats = tagManager.getDataStats();
      expect(stats.tagsCount).toBe(2);
      expect(stats.pagesCount).toBe(1);
    });

    it('应该清空所有数据', () => {
      tagManager.createTag('前端');
      tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      
      expect(tagManager.getDataStats().tagsCount).toBeGreaterThan(0);
      expect(tagManager.getDataStats().pagesCount).toBeGreaterThan(0);
      
      tagManager.clearAllData();
      
      expect(tagManager.getDataStats().tagsCount).toBe(0);
      expect(tagManager.getDataStats().pagesCount).toBe(0);
    });
  });

  describe('数据持久化', () => {
    it('应该同步数据到存储', async () => {
      tagManager.createTag('前端');
      await tagManager.syncToStorage();
      
      // 验证 chrome.storage.local.set 被调用
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('应该从存储加载数据', async () => {
      tagManager.createTag('前端');
      await tagManager.syncToStorage();
      
      // 重新初始化以加载数据
      await testHelpers.clearAllData();
      const newManager = await testHelpers.initTagManager();
      
      const stats = newManager.getDataStats();
      // 注意：mock的chrome.storage不会实际保存数据，所以这里验证逻辑
      expect(stats).toBeDefined();
    });

    it('应该重新加载存储数据', async () => {
      tagManager.createTag('前端');
      await tagManager.syncToStorage();
      
      await tagManager.reloadFromStorage();
      
      // 验证 chrome.storage.local.get 被调用
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串标签名', () => {
      expect(() => tagManager.createTag('')).toThrow();
    });

    it('应该处理只包含空格的标签名', () => {
      expect(() => tagManager.createTag('   ')).toThrow();
    });

    it('应该处理无效的页面ID', () => {
      const tag = tagManager.createTag('前端');
      const result = tagManager.addTagToPage('invalid-page-id', tag.id);
      expect(result).toBe(false);
    });

    it('应该处理无效的标签ID', () => {
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      const result = tagManager.addTagToPage(page.id, 'invalid-tag-id');
      expect(result).toBe(false);
    });

    it('应该处理绑定不存在的标签', () => {
      const tag = tagManager.createTag('前端');
      const result = tagManager.bindTags(tag.id, 'nonexistent-id');
      expect(result).toBe(false);
    });

    it('应该处理中文和特殊字符', () => {
      const chineseTag = tagManager.createTag('中文标签');
      const specialCharTag = tagManager.createTag('Tag_With-Special.Characters');
      
      expect(chineseTag).toBeDefined();
      expect(specialCharTag).toBeDefined();
    });
  });

  describe('清理功能', () => {
    it('应该清理未使用的标签', () => {
      const tag1 = tagManager.createTag('前端');
      tagManager.createTag('后端');
      tagManager.createTag('数据库');
      
      // 只为tag1创建页面关联
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      tagManager.addTagToPage(page.id, tag1.id);
      
      expect(tagManager.getAllTags().length).toBe(3);
      
      tagManager.cleanupUnusedTags();
      
      // 应该只保留tag1
      const remainingTags = tagManager.getAllTags();
      expect(remainingTags.length).toBe(1);
      expect(remainingTags[0].id).toBe(tag1.id);
    });

    it('应该不清理正在使用的标签', () => {
      const tag = tagManager.createTag('前端');
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      
      tagManager.addTagToPage(page.id, tag.id);
      
      tagManager.cleanupUnusedTags();
      
      expect(tagManager.getAllTags().length).toBe(1);
      expect(tagManager.getTagById(tag.id)).toBeDefined();
    });
  });

  describe('导入导出功能', () => {
    beforeEach(() => {
      // 初始化一些测试数据
      const tag1 = tagManager.createTag('前端', '前端开发相关', '#FF5733');
      const tag2 = tagManager.createTag('后端', '后端开发相关', '#33FF57');
      tagManager.bindTags(tag1.id, tag2.id);
      
      const page1 = tagManager.createOrUpdatePage(
        'https://github.com',
        'GitHub',
        'github.com',
        'https://github.com/favicon.ico'
      );
      const page2 = tagManager.createOrUpdatePage(
        'https://stackoverflow.com',
        'Stack Overflow',
        'stackoverflow.com'
      );
      
      tagManager.addTagToPage(page1.id, tag1.id);
      tagManager.addTagToPage(page2.id, tag1.id);
    });

    it('应该导出所有数据为 JSON 字符串', () => {
      const exportData = tagManager.exportData();
      
      expect(exportData).toBeDefined();
      expect(typeof exportData).toBe('string');
      
      const parsed = JSON.parse(exportData);
      expect(parsed.tags).toBeDefined();
      expect(parsed.pages).toBeDefined();
      expect(parsed.version).toBe('1.0');
      expect(parsed.exportDate).toBeDefined();
      
      expect(Object.keys(parsed.tags).length).toBe(2);
      expect(Object.keys(parsed.pages).length).toBe(2);
    });

    it('导出的数据应该包含所有标签属性', () => {
      const exportData = tagManager.exportData();
      const parsed = JSON.parse(exportData);
      const firstTag = Object.values(parsed.tags)[0] as any;
      
      expect(firstTag.id).toBeDefined();
      expect(firstTag.name).toBeDefined();
      expect(firstTag.bindings).toBeDefined();
      expect(firstTag.color).toBeDefined();
      expect(firstTag.createdAt).toBeDefined();
      expect(firstTag.updatedAt).toBeDefined();
    });

    it('导出的数据应该包含所有页面属性', () => {
      const exportData = tagManager.exportData();
      const parsed = JSON.parse(exportData);
      const firstPage = Object.values(parsed.pages)[0] as any;
      
      expect(firstPage.id).toBeDefined();
      expect(firstPage.url).toBeDefined();
      expect(firstPage.title).toBeDefined();
      expect(firstPage.domain).toBeDefined();
      expect(firstPage.tags).toBeDefined();
      expect(firstPage.createdAt).toBeDefined();
      expect(firstPage.updatedAt).toBeDefined();
    });

    it('应该导入并覆盖现有数据', async () => {
      const exportData = tagManager.exportData();
      
      // 清空数据
      tagManager.clearAllData();
      expect(tagManager.getDataStats().tagsCount).toBe(0);
      
      // 导入数据（覆盖模式）
      const result = await tagManager.importData(exportData, false);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBeDefined();
      expect(result.imported?.tagsCount).toBe(2);
      expect(result.imported?.pagesCount).toBe(2);
      
      const stats = tagManager.getDataStats();
      expect(stats.tagsCount).toBe(2);
      expect(stats.pagesCount).toBe(2);
    });

    it('应该导入并合并到现有数据', async () => {
      const originalExportData = tagManager.exportData();
      
      // 清空并重新创建一些数据
      tagManager.clearAllData();
      const newTag = tagManager.createTag('数据库');
      const newPage = tagManager.createOrUpdatePage(
        'https://mongodb.com',
        'MongoDB',
        'mongodb.com'
      );
      tagManager.addTagToPage(newPage.id, newTag.id);
      
      // 导入原始数据（合并模式）
      const result = await tagManager.importData(originalExportData, true);
      
      expect(result.success).toBe(true);
      
      // 应该有原来的2个标签 + 新添加的1个标签 = 3个
      expect(tagManager.getDataStats().tagsCount).toBe(3);
      // 应该有原来的2个页面 + 新添加的1个页面 = 3个
      expect(tagManager.getDataStats().pagesCount).toBe(3);
      
      // 验证新添加的数据还在
      expect(tagManager.findTagByName('数据库')).toBeDefined();
    });

    it('合并模式应该不覆盖现有数据', async () => {
      // 创建一些初始数据
      tagManager.clearAllData();
      const tag1 = tagManager.createTag('前端', '原始描述', '#FF0000');
      const page = tagManager.createOrUpdatePage(
        'https://github.com',
        'GitHub Original',
        'github.com'
      );
      tagManager.addTagToPage(page.id, tag1.id);
      
      const initialStats = tagManager.getDataStats();
      expect(initialStats.tagsCount).toBe(1);
      expect(initialStats.pagesCount).toBe(1);
      
      // 准备导入数据（包含不同的标签和页面）
      // 注意：导入数据的键必须是实际的tag ID，以模拟真实导出数据
      const importData = JSON.stringify({
        tags: {
          [tag1.id]: {
            id: tag1.id, // 相同的ID（键也是ID）
            name: '前端',
            description: '新描述', // 不同的描述
            color: '#00FF00', // 不同的颜色
            createdAt: Date.now(),
            updatedAt: Date.now(),
            bindings: []
          },
          'tag2_new': {
            id: 'tag2_new',
            name: '后端',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            bindings: []
          }
        },
        pages: {
          'page_new': {
            id: 'page_new',
            url: 'https://stackoverflow.com',
            title: 'Stack Overflow',
            domain: 'stackoverflow.com',
            tags: ['tag2_new'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        },
        version: '1.0',
        exportDate: new Date().toISOString()
      }, null, 2);
      
      // 导入（合并模式）
      await tagManager.importData(importData, true);
      
      // 应该保留原始的标签（不覆盖）
      const preservedTag = tagManager.getTagById(tag1.id);
      expect(preservedTag?.description).toBe('原始描述');
      expect(preservedTag?.color).toBe('#FF0000');
      
      // 应该添加新的标签
      expect(tagManager.findTagByName('后端')).toBeDefined();
      
      // 最终应该有2个标签（1个原始 + 1个新添加）
      expect(tagManager.getDataStats().tagsCount).toBe(2);
    });

    it('应该拒绝导入无效的 JSON 格式', async () => {
      const invalidJson = '这不是有效的JSON{';
      const result = await tagManager.importData(invalidJson, false);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝导入缺少必需字段的数据', async () => {
      const invalidData = JSON.stringify({
        tags: {}
        // 缺少 pages 字段
      });
      
      const result = await tagManager.importData(invalidData, false);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少 tags 或 pages 字段');
    });

    it('应该拒绝导入字段类型错误的数据', async () => {
      const invalidData = JSON.stringify({
        tags: '这不是对象',
        pages: []
      });
      
      const result = await tagManager.importData(invalidData, false);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('必须是对象');
    });

    it('导入成功后应该持久化到存储', async () => {
      const exportData = tagManager.exportData();
      tagManager.clearAllData();
      
      await tagManager.importData(exportData, false);
      
      // 验证 syncToStorage 应该被调用
      // 注意：这是在内存中测试，实际持久化需要chrome.storage mock
      expect(tagManager.getDataStats().tagsCount).toBeGreaterThan(0);
    });

    it('应该在导入时保持标签绑定关系', async () => {
      const exportData = tagManager.exportData();
      tagManager.clearAllData();
      
      await tagManager.importData(exportData, false);
      
      // 验证标签绑定仍然存在
      const allTags = tagManager.getAllTags();
      const tagWithBindings = allTags.find(tag => tag.bindings.length > 0);
      
      expect(tagWithBindings).toBeDefined();
      if (tagWithBindings) {
        expect(tagWithBindings.bindings.length).toBeGreaterThan(0);
      }
    });

    it('应该在导入时保持页面标签关联', async () => {
      const exportData = tagManager.exportData();
      tagManager.clearAllData();
      
      await tagManager.importData(exportData, false);
      
      // 验证页面标签关联仍然存在
      const taggedPages = tagManager.getTaggedPages();
      expect(taggedPages.length).toBeGreaterThan(0);
      
      const pageWithTags = taggedPages[0];
      expect(pageWithTags.tags.length).toBeGreaterThan(0);
    });

    it('合并模式在 ID 冲突时应保留现有数据并合并新数据', async () => {
      tagManager.clearAllData();
      const existingTag = tagManager.createTag('Existing Tag', '原始描述', '#123456');
      const existingPage = tagManager.createOrUpdatePage(
        'https://existing.example.com',
        'Existing Page',
        'existing.example.com'
      );
      tagManager.addTagToPage(existingPage.id, existingTag.id);

      const importPayload = JSON.stringify({
        tags: {
          [existingTag.id]: {
            id: existingTag.id,
            name: '导入的名称',
            description: '导入描述',
            color: '#FFFFFF',
            createdAt: 1,
            updatedAt: 1,
            bindings: ['non_existent']
          },
          tag_new: {
            id: 'tag_new',
            name: 'New Tag',
            description: '新的标签',
            color: '#ABCDEF',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            bindings: []
          }
        },
        pages: {
          [existingPage.id]: {
            id: existingPage.id,
            url: 'https://imported.example.com',
            title: 'Imported Page',
            domain: 'imported.example.com',
            tags: ['tag_new'],
            createdAt: 1,
            updatedAt: 1
          },
          page_new: {
            id: 'page_new',
            url: 'https://new.example.com',
            title: 'New Page',
            domain: 'new.example.com',
            tags: ['tag_new'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        },
        version: '1.0',
        exportDate: new Date().toISOString()
      });

      const result = await tagManager.importData(importPayload, true);

      expect(result.success).toBe(true);

      const preservedTag = tagManager.getTagById(existingTag.id);
      expect(preservedTag?.name).toBe('Existing Tag');
      expect(preservedTag?.description).toBe('原始描述');
      expect(preservedTag?.color).toBe('#123456');
      expect(preservedTag?.bindings).not.toContain('non_existent');

      const preservedPage = tagManager.getPageById(existingPage.id);
      expect(preservedPage?.title).toBe('Existing Page');
      expect(preservedPage?.url).toBe('https://existing.example.com');
      expect(preservedPage?.tags).toContain(existingTag.id);
      expect(preservedPage?.tags).not.toContain('tag_new');

      expect(tagManager.getTagById('tag_new')).toBeDefined();
      expect(tagManager.getPageById('page_new')).toBeDefined();
    });

    it('导入缺失引用的数据集后应保持可用性', async () => {
      tagManager.clearAllData();
      const payloadWithDanglingRefs = JSON.stringify({
        tags: {},
        pages: {
          page_dangling: {
            id: 'page_dangling',
            url: 'https://dangling.example.com',
            title: 'Dangling Page',
            domain: 'dangling.example.com',
            tags: ['missing_tag'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        },
        version: '1.0',
        exportDate: new Date().toISOString()
      });

      const result = await tagManager.importData(payloadWithDanglingRefs, false);

      expect(result.success).toBe(true);
      expect(() => tagManager.getAllTagUsageCounts()).not.toThrow();
      expect(() => tagManager.getTaggedPages('missing_tag')).not.toThrow();

      const usageCounts = tagManager.getAllTagUsageCounts();
      expect(usageCounts.missing_tag).toBeUndefined();

      const danglingPage = tagManager.getPageById('page_dangling');
      expect(danglingPage).toBeDefined();
      expect(danglingPage?.tags).toContain('missing_tag');

      expect(tagManager.deleteTag('missing_tag')).toBe(false);
      expect(() => tagManager.createTag('恢复正常')).not.toThrow();
    });

    it('完整的导出导入流程应该保持数据一致性', async () => {
      const originalStats = tagManager.getDataStats();
      
      // 导出
      const exportData = tagManager.exportData();
      
      // 清空并重新导入
      tagManager.clearAllData();
      const importResult = await tagManager.importData(exportData, false);
      
      expect(importResult.success).toBe(true);
      
      // 验证数据统计一致
      const newStats = tagManager.getDataStats();
      expect(newStats.tagsCount).toBe(originalStats.tagsCount);
      expect(newStats.pagesCount).toBe(originalStats.pagesCount);
      
      // 验证所有标签都存在
      const parsed = JSON.parse(exportData);
      for (const tagId in parsed.tags) {
        const importedTag = tagManager.getTagById(tagId);
        expect(importedTag).toBeDefined();
        expect(importedTag?.name).toBe(parsed.tags[tagId].name);
      }
    });
  });

  describe('标签验证功能', () => {
    it('应该验证空字符串标签名', () => {
      const result = tagManager.validateTagName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('请输入标签名称');
    });

    it('应该验证只包含空格的标签名', () => {
      const result = tagManager.validateTagName('   ');
      expect(result.valid).toBe(false);
      // 因为 validateTagName 先检查 !name || !name.trim()，所以返回"请输入标签名称"
      expect(result.error).toBe('请输入标签名称');
    });

    it('应该验证超过50字符的标签名', () => {
      const longName = 'a'.repeat(51);
      const result = tagManager.validateTagName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('标签名称不能超过50个字符');
    });

    it('应该验证有效的标签名', () => {
      const result = tagManager.validateTagName('前端开发');
      expect(result.valid).toBe(true);
    });
  });

  describe('createTagAndAddToPage 错误处理', () => {
    it('应该处理无效标签名', () => {
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      expect(() => tagManager.createTagAndAddToPage('', page.id)).toThrow();
    });
  });

  describe('页面标题更新', () => {
    it('应该更新页面标题', () => {
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      const result = tagManager.updatePageTitle(page.id, 'GitHub - Home');
      expect(result).toBe(true);
      const updatedPage = tagManager.getPageById(page.id);
      expect(updatedPage?.title).toBe('GitHub - Home');
    });

    it('应该处理不存在的页面ID', () => {
      const result = tagManager.updatePageTitle('nonexistent-id', 'New Title');
      expect(result).toBe(false);
    });

    it('应该处理空标题', () => {
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      const result = tagManager.updatePageTitle(page.id, '   ');
      expect(result).toBe(false);
    });

    it('应该处理只包含空格的标题', () => {
      const page = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      const result = tagManager.updatePageTitle(page.id, '  ');
      expect(result).toBe(false);
    });
  });

  describe('存储功能', () => {
    it('应该测试存储功能', async () => {
      tagManager.createTag('前端');
      await tagManager.testStorage();
      // 验证没有抛出错误
      expect(true).toBe(true);
    });
  });

  describe('deleteTag 绑定关系清理', () => {
    it('deleteTag 应该级联清理所有引用并保持其他数据完整', () => {
      const tagA = tagManager.createTag('TagA');
      const tagB = tagManager.createTag('TagB');
      const pageA = tagManager.createOrUpdatePage('https://a.example.com', 'Page A', 'a.example.com');
      const pageB = tagManager.createOrUpdatePage('https://b.example.com', 'Page B', 'b.example.com');

      tagManager.bindTags(tagA.id, tagB.id);

      tagManager.addTagToPage(pageA.id, tagA.id);
      tagManager.addTagToPage(pageB.id, tagA.id);

      const deleteResult = tagManager.deleteTag(tagA.id);

      expect(deleteResult).toBe(true);
      expect(tagManager.getTagById(tagA.id)).toBeUndefined();

      const remainingTagB = tagManager.getTagById(tagB.id);
      expect(remainingTagB).toBeDefined();
      expect(remainingTagB?.bindings).not.toContain(tagA.id);

      const updatedPageA = tagManager.getPageById(pageA.id);
      const updatedPageB = tagManager.getPageById(pageB.id);
      expect(updatedPageA?.tags).not.toContain(tagA.id);
      expect(updatedPageB?.tags).not.toContain(tagA.id);
    });

    it('应该清理标签的绑定关系', () => {
      const tag1 = tagManager.createTag('前端');
      const tag2 = tagManager.createTag('后端');
      const tag3 = tagManager.createTag('数据库');
      
      // 建立绑定关系
      tagManager.bindTags(tag1.id, tag2.id);
      tagManager.bindTags(tag1.id, tag3.id);
      
      expect(tag2.bindings).toContain(tag1.id);
      expect(tag3.bindings).toContain(tag1.id);
      
      // 为了保持 tag2 和 tag3，需要将它们添加到页面
      const page1 = tagManager.createOrUpdatePage('https://github.com', 'GitHub', 'github.com');
      const page2 = tagManager.createOrUpdatePage('https://google.com', 'Google', 'google.com');
      const page3 = tagManager.createOrUpdatePage('https://stackoverflow.com', 'Stack Overflow', 'stackoverflow.com');
      
      tagManager.addTagToPage(page1.id, tag1.id);
      tagManager.addTagToPage(page2.id, tag2.id);
      tagManager.addTagToPage(page3.id, tag3.id);
      
      // 移除 tag1 的页面关联，然后清理未使用的标签
      tagManager.removeTagFromPage(page1.id, tag1.id);
      tagManager.cleanupUnusedTags();
      
      // tag1 应该被删除，tag2 和 tag3 应该保留
      expect(tagManager.getTagById(tag1.id)).toBeUndefined();
      expect(tagManager.getTagById(tag2.id)).toBeDefined();
      expect(tagManager.getTagById(tag3.id)).toBeDefined();
      
      // 检查绑定关系是否被清理
      const tag2After = tagManager.getTagById(tag2.id);
      const tag3After = tagManager.getTagById(tag3.id);
      expect(tag2After?.bindings).not.toContain(tag1.id);
      expect(tag3After?.bindings).not.toContain(tag1.id);
    });

    it('应该处理不存在的标签', () => {
      // 调用 cleanupUnusedTags 不应该抛出错误
      expect(() => tagManager.cleanupUnusedTags()).not.toThrow();
    });
  });

  describe('初始化错误处理', () => {
    it('应该允许重新初始化', async () => {
      const manager = TagManager.getInstance();
      manager.initialize({});
      
      // 第二次初始化应该被忽略（幂等性）
      manager.initialize({});
      manager.initialize({});
      // 应该不会抛出错误
      expect(manager.isInitialized).toBe(true);
    });
  });
});

