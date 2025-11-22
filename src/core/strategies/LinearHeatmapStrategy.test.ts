import { describe, it, expect } from '@jest/globals';
import { LinearHeatmapStrategy } from './LinearHeatmapStrategy';

describe('LinearHeatmapStrategy', () => {
  const strategy = new LinearHeatmapStrategy();

  it('应该优雅处理空数据', () => {
    const result = strategy.computeLevels(new Map());
    expect(result.size).toBe(0);
  });

  it('应该处理最大值为 0 的情况 (全 0 数据)', () => {
    const data = new Map([
      ['2023-01-01', 0],
      ['2023-01-02', 0],
    ]);
    const result = strategy.computeLevels(data);
    // 根据代码逻辑：当 max === 0 时，直接返回空 Map（Line 14）
    // 这是合理的，因为所有值都是 0，没有活动等级需要计算
    expect(result.size).toBe(0);
  });

  it('应该根据最大值线性划分 4 个热度等级', () => {
    // 构造测试数据：最大值 100
    // 算法逻辑：
    // L1 = max * 0.25 = 25
    // L2 = max * 0.50 = 50
    // L3 = max * 0.75 = 75
    const data = new Map([
      ['day-0', 0],     // 0
      ['day-10', 10],   // < 25 -> Level 0
      ['day-25', 25],   // >= 25 -> Level 1
      ['day-50', 50],   // >= 50 -> Level 2
      ['day-75', 75],   // >= 75 -> Level 3
      ['day-100', 100], // Max -> Level 3
    ]);

    const result = strategy.computeLevels(data);

    expect(result.get('day-0')).toBe(0);
    expect(result.get('day-10')).toBe(0);
    expect(result.get('day-25')).toBe(1);
    expect(result.get('day-50')).toBe(2);
    expect(result.get('day-75')).toBe(3);
    expect(result.get('day-100')).toBe(3);
  });
});

