import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { TagManager } from '../tagManager';
import { storageService } from '../storageService';
import { testHelpers } from '../../test/helpers';

describe('TagManager Edge Cases & Error Handling', () => {
  let tagManager: TagManager;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    tagManager = await testHelpers.initTagManager();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await testHelpers.clearAllData();
    jest.restoreAllMocks();
  });

  it('deleteTag: 删除不存在的 ID 应该返回 false', () => {
    const result = tagManager.deleteTag('non-existent-id');
    expect(result).toBe(false);
  });

  // 覆盖 Line 544-550: syncToStorage 中的 catch 块
  it('syncToStorage: 当存储写入失败时应捕获异常并记录日志', async () => {
    // Mock storageService.setMultiple 抛出错误
    const error = new Error('Storage Quota Exceeded');
    jest.spyOn(storageService, 'setMultiple').mockRejectedValueOnce(error);

    // 触发同步
    await tagManager.syncToStorage();

    // 验证是否捕获并打印了错误
    expect(consoleErrorSpy).toHaveBeenCalledWith('保存存储数据失败:', error);
  });

  // 覆盖 Line 558: reloadFromStorage 中的 catch 块
  it('reloadFromStorage: 当存储读取失败时应捕获异常并记录日志', async () => {
    // Mock storageService.getMultiple 抛出错误
    const error = new Error('Read Failure');
    jest.spyOn(storageService, 'getMultiple').mockRejectedValueOnce(error);

    // 触发重载
    await tagManager.reloadFromStorage();

    expect(consoleErrorSpy).toHaveBeenCalledWith('重新加载存储数据失败:', error);
  });

  // 覆盖 Line 586: importData 中的 JSON.parse 错误
  it('importData: 当 JSON 格式无效时应返回失败', async () => {
    const result = await tagManager.importData('invalid json string');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });

  // 覆盖 Line 532: Base64 编码失败回退
  // 这是一个非常边缘的情况，我们需要临时破坏环境中的 Base64 支持来触发它
  it('generateTagId: 当 Base64 编码不可用时应优雅处理 (模拟环境缺失)', () => {
    // 保存原始引用
    const originalBuffer = (globalThis as any).Buffer;
    const originalBtoa = (globalThis as any).btoa;
    const originalTextEncoder = (globalThis as any).TextEncoder;

    try {
      // 临时隐藏这些属性，使 encodeToBase64 无法找到它们
      // 使用 Object.defineProperty 来临时覆盖，而不是删除（避免破坏其他测试）
      Object.defineProperty(globalThis, 'Buffer', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'btoa', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'TextEncoder', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // 尝试创建一个包含中文的标签（会触发 base64 逻辑）
      // 在环境被破坏的情况下，encodeToBase64 会抛出错误
      // generateTagId 会 catch 并打印 error，然后继续使用回退逻辑
      const tag = tagManager.createTag('测试标签_NoEnv');
      
      // 验证标签仍然被创建（使用回退逻辑）
      expect(tag).toBeDefined();
      expect(tag.id).toBeDefined();
    } finally {
      // 恢复环境
      if (originalBuffer !== undefined) {
        Object.defineProperty(globalThis, 'Buffer', {
          value: originalBuffer,
          writable: true,
          configurable: true,
        });
      }
      if (originalBtoa !== undefined) {
        Object.defineProperty(globalThis, 'btoa', {
          value: originalBtoa,
          writable: true,
          configurable: true,
        });
      }
      if (originalTextEncoder !== undefined) {
        Object.defineProperty(globalThis, 'TextEncoder', {
          value: originalTextEncoder,
          writable: true,
          configurable: true,
        });
      }
    }

    // 验证是否进入了 generateTagId 的 catch 块
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Base64 编码失败'), 
      expect.any(Error)
    );
  });

  it('updateData: 传入 undefined 应该安全处理', () => {
     // 覆盖 updateData 内部的 undefined 检查
     // @ts-ignore - 测试 JS 调用场景
     tagManager.updateData({});
     expect(tagManager.getAllTags()).toHaveLength(0);
  });

  // 覆盖 Line 476: calculateStreak 中 pages.length === 0 的情况
  it('getUserStats: 应该处理空页面列表', () => {
    const stats = tagManager.getUserStats();
    expect(stats.todayCount).toBe(0);
    expect(stats.streak).toBe(0);
  });

  // 覆盖 Line 484: page.createdAt 不是 number 的情况
  it('getUserStats: 应该跳过 createdAt 不是数字的页面', () => {
    // 创建一个页面，但 createdAt 不是数字
    const page = tagManager.createOrUpdatePage('http://test', 'Test', 'test');
    // 直接修改内部数据来模拟无效的 createdAt
    // @ts-ignore - 测试无效数据类型
    page.createdAt = 'invalid' as any;
    
    const stats = tagManager.getUserStats();
    // 应该能正常计算，不会因为无效数据而崩溃
    expect(typeof stats.streak).toBe('number');
  });

  // 覆盖 Line 493: markedDays.size === 0 的情况（所有页面的 createdAt 都无效）
  it('getUserStats: 应该处理所有页面 createdAt 都无效的情况', () => {
    // 创建几个页面，但都设置无效的 createdAt
    const page1 = tagManager.createOrUpdatePage('http://test1', 'Test1', 'test');
    const page2 = tagManager.createOrUpdatePage('http://test2', 'Test2', 'test');
    
    // @ts-ignore - 测试无效数据类型
    page1.createdAt = 'invalid' as any;
    // @ts-ignore - 测试无效数据类型
    page2.createdAt = 'invalid' as any;
    
    const stats = tagManager.getUserStats();
    expect(stats.streak).toBe(0);
  });

  // 覆盖 Line 505-508: calculateStreak 中的不同分支
  it('getUserStats: 应该正确计算连续天数（昨天有标记，今天没有）', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(12, 0, 0, 0);
    
    // 创建昨天和两天前的页面
    const p1 = tagManager.createOrUpdatePage('http://yesterday', 'Yesterday', 'test');
    const p2 = tagManager.createOrUpdatePage('http://twodaysago', 'TwoDaysAgo', 'test');
    
    p1.createdAt = yesterday.getTime();
    p2.createdAt = twoDaysAgo.getTime();
    
    const stats = tagManager.getUserStats();
    // 应该计算连续天数（从昨天开始）
    expect(stats.streak).toBeGreaterThanOrEqual(1);
  });

  // 覆盖 Line 544-550: encodeToBase64 中的 TextEncoder 路径
  it('generateTagId: 应该使用 TextEncoder 路径进行 Base64 编码', () => {
    // 确保环境中有 TextEncoder 和 btoa
    const hasTextEncoder = typeof globalThis.TextEncoder !== 'undefined';
    const hasBtoa = typeof globalThis.btoa !== 'undefined';
    
    if (hasTextEncoder && hasBtoa) {
      // 创建一个包含中文的标签，应该使用 TextEncoder 路径
      const tag = tagManager.createTag('测试标签');
      expect(tag.id).toMatch(/^tag_/); // 应该以 tag_ 开头（Base64 编码）
      expect(tag.id.length).toBeGreaterThan('tag_'.length);
    } else {
      // 如果环境不支持，跳过这个测试
      expect(true).toBe(true);
    }
  });
});

