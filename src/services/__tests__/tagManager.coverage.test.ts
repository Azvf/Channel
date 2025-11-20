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
    // 拦截 console.error 以防止测试输出被污染
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

  it('syncToStorage: 当存储写入失败时，应捕获异常并记录日志', async () => {
    const error = new Error('Storage Quota Exceeded');
    // Mock storageService.setMultiple 抛出错误
    jest.spyOn(storageService, 'setMultiple').mockRejectedValueOnce(error);

    // 触发同步
    await tagManager.syncToStorage();

    expect(consoleErrorSpy).toHaveBeenCalledWith('保存存储数据失败:', error);
  });

  it('reloadFromStorage: 当存储读取失败时，应捕获异常并记录日志', async () => {
    const error = new Error('Read Failure');
    // Mock getMultiple 抛出错误
    jest.spyOn(storageService, 'getMultiple').mockRejectedValueOnce(error);

    await tagManager.reloadFromStorage();

    expect(consoleErrorSpy).toHaveBeenCalledWith('重新加载存储数据失败:', error);
  });

  it('importData: 当 JSON 格式无效时，应返回失败', async () => {
    const result = await tagManager.importData('{ invalid json string');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unexpected token|JSON/);
  });
  
  it('updateData: 传入 undefined 应该被安全处理', () => {
     // 模拟类型不安全的调用
     // @ts-ignore
     tagManager.updateData({});
     expect(tagManager.getAllTags()).toHaveLength(0);
  });

  it('generateTagId: 当环境不支持 Base64 时应优雅降级 (模拟环境缺失)', () => {
    // 这是一个极端的环境测试
    const originalBtoa = (global as any).btoa;
    const originalBuffer = (global as any).Buffer;
    const originalTextEncoder = (global as any).TextEncoder;

    try {
      // 破坏环境
      (global as any).btoa = undefined;
      (global as any).Buffer = undefined;
      (global as any).TextEncoder = undefined;

      // 尝试创建一个包含特殊字符的标签，触发 ID 生成逻辑
      // 这应该会进入 try-catch 块并打印错误
      tagManager.createTag('测试标签_NoEnv');
    } catch (e) {
      // 我们只关心是否记录了错误
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Base64 编码失败'), 
      expect.any(Error)
    );

    // 恢复环境
    (global as any).btoa = originalBtoa;
    (global as any).Buffer = originalBuffer;
    (global as any).TextEncoder = originalTextEncoder;
  });
});

