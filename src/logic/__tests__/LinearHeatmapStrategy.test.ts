import { describe, it, expect } from '@jest/globals';
import { LinearHeatmapStrategy } from '../LinearHeatmapStrategy';

describe('LinearHeatmapStrategy', () => {
  const strategy = new LinearHeatmapStrategy();

  it('应该处理空数据', () => {
    const result = strategy.computeLevels(new Map());
    expect(result.size).toBe(0);
  });

  it('应该处理最大值为 0 的情况（所有活动计数均为 0）', () => {
    const data = new Map([
      ['2023-01-01', 0],
      ['2023-01-02', 0],
    ]);
    const result = strategy.computeLevels(data);
    expect(result.size).toBe(0);
  });

  it('应该正确计算四个等级 (0, 1, 2, 3)', () => {
    // 构造数据：最大值 100
    // Level 1: >= 25
    // Level 2: >= 50
    // Level 3: >= 75
    const data = new Map([
      ['day-0', 0],
      ['day-10', 10],  // Level 0 (< 25)
      ['day-25', 25],  // Level 1 (>= 25)
      ['day-50', 50],  // Level 2 (>= 50)
      ['day-75', 75],  // Level 3 (>= 75)
      ['day-100', 100], // Level 3 (Max)
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

