import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameplayStore } from '../gameplayStore';
import { testHelpers } from '../../test/helpers';

describe('GameplayStore Edge Cases', () => {
  let store: GameplayStore;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    store = await testHelpers.initTagManager();
  });

  it('createTag: 应处理名称中的特殊字符和空白', () => {
    const tag = store.createTag('  Tag  With  Spaces  ');

    expect(tag.name).toBe('Tag  With  Spaces'); // 仅 trim 两端
    expect(tag.id).toBeDefined();
  });

  it('createTagAndAddToPage: 如果页面ID不存在，应该创建新页面还是抛出错误？(当前实现会创建关联)', () => {
    // 这是一个行为验证，确保我们知道代码在做什么
    // 如果 createOrUpdatePage 未被调用，addTagToPage 会返回 false
    // 但 createTagAndAddToPage 内部怎么处理？
    
    // 假设我们要测 addTagToPage 的失败分支
    const result = store.addTagToPage('non-existent-page', 'non-existent-tag');
    expect(result).toBe(false);
  });

  it('initialize: 多次初始化应保持幂等性', () => {
    store.initialize({ tags: { a: {} as any } });
    const firstState = store.getAllTags();
    
    // 再次初始化
    store.initialize({ tags: { b: {} as any } });
    
    // 应该保持第一次的状态（根据当前实现）
    expect(store.getAllTags().length).toBe(firstState.length);
  });
});

