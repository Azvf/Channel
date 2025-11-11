import { TagManager } from '../tagManager';

describe('TagManager.validateTagName (unit)', () => {
  const manager = TagManager.getInstance();

  beforeEach(() => {
    manager.clearAllData();
  });

  it('通过有效名称验证', () => {
    expect(manager.validateTagName('React')).toEqual({ valid: true });
  });

  it('拒绝空名称', () => {
    const result = manager.validateTagName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('请输入标签名称');
  });

  it('拒绝过长名称', () => {
    const result = manager.validateTagName('a'.repeat(51));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('标签名称不能超过50个字符');
  });
});


