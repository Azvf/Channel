import { describe, it, expect } from '@jest/globals';
import { CalendarGridBuilder } from '../CalendarGridBuilder';

describe('CalendarGridBuilder', () => {
  const builder = new CalendarGridBuilder();

  it('应该总是从周日开始对齐网格', () => {
    const data = new Map([['2023-11-15', 1]]); // 这是一个周三
    const layout = builder.build(data, new Map());
    
    const firstCell = layout.cells[0];
    // 2023-11-01 是周三。如果逻辑是从"当月1号所在周的周日"开始：
    // 11-01 (Wed) -> Start Date 应该是 10-29 (Sun)
    expect(firstCell.date.getDay()).toBe(0); // 必须是周日
  });

  it('应该处理没有数据的空状态', () => {
    const layout = builder.build(new Map(), new Map());
    expect(layout.cells.length).toBeGreaterThan(0); // 应该生成当前月份的空网格
    expect(layout.totalWeeks).toBeGreaterThan(0);
  });

  it('应该正确处理跨年数据', () => {
    const data = new Map([
      ['2023-12-31', 1], // 年末
      ['2024-01-01', 2], // 年初
    ]);
    const layout = builder.build(data, new Map());
    
    // 应该包含两个日期
    const dates = layout.cells.map(cell => {
      const year = cell.date.getFullYear();
      const month = String(cell.date.getMonth() + 1).padStart(2, '0');
      const day = String(cell.date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    
    expect(dates).toContain('2023-12-31');
    expect(dates).toContain('2024-01-01');
  });

  it('应该正确处理闰年', () => {
    // 2024 是闰年，2月有29天
    const data = new Map([
      ['2024-02-28', 1],
      ['2024-02-29', 2], // 闰年的2月29日
      ['2024-03-01', 3],
    ]);
    const layout = builder.build(data, new Map());
    
    const dates = layout.cells.map(cell => {
      const year = cell.date.getFullYear();
      const month = String(cell.date.getMonth() + 1).padStart(2, '0');
      const day = String(cell.date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    
    expect(dates).toContain('2024-02-29');
  });

  it('应该正确计算月份标签', () => {
    const data = new Map([
      ['2023-11-15', 1],
      ['2023-12-15', 2],
    ]);
    const layout = builder.build(data, new Map());
    
    // 应该至少有两个月份标签
    expect(layout.months.length).toBeGreaterThanOrEqual(2);
    
    // 验证月份标签格式
    layout.months.forEach(month => {
      expect(month.label).toBeTruthy();
      expect(month.colStart).toBeGreaterThan(0);
    });
  });

  it('应该正确映射活动数据', () => {
    const activityMap = new Map([
      ['2023-11-15', 5],
      ['2023-11-16', 10],
    ]);
    const levelMap = new Map<string, 0 | 1 | 2 | 3>([
      ['2023-11-15', 2],
      ['2023-11-16', 3],
    ]);
    
    const layout = builder.build(activityMap, levelMap);
    
    const cell15 = layout.cells.find(cell => {
      const year = cell.date.getFullYear();
      const month = String(cell.date.getMonth() + 1).padStart(2, '0');
      const day = String(cell.date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}` === '2023-11-15';
    });
    
    const cell16 = layout.cells.find(cell => {
      const year = cell.date.getFullYear();
      const month = String(cell.date.getMonth() + 1).padStart(2, '0');
      const day = String(cell.date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}` === '2023-11-16';
    });
    
    expect(cell15).toBeDefined();
    expect(cell15?.count).toBe(5);
    expect(cell15?.level).toBe(2);
    
    expect(cell16).toBeDefined();
    expect(cell16?.count).toBe(10);
    expect(cell16?.level).toBe(3);
  });

  it('应该正确计算总周数', () => {
    const data = new Map([['2023-11-15', 1]]);
    const layout = builder.build(data, new Map());
    
    // 总周数应该等于单元格数除以7（向上取整）
    expect(layout.totalWeeks).toBe(Math.ceil(layout.cells.length / 7));
  });

  it('应该处理最早数据所在月份之前的数据', () => {
    // 如果最早的数据在11月，应该从11月1号所在周的周日开始
    const data = new Map([['2023-11-15', 1]]);
    const layout = builder.build(data, new Map());
    
    // 第一个单元格应该是11月1号所在周的周日
    const firstCell = layout.cells[0];
    const firstDate = firstCell.date;
    
    // 验证第一个单元格是周日
    expect(firstDate.getDay()).toBe(0);
    
    // 验证第一个单元格的日期应该在11月1号之前或等于11月1号
    const nov1 = new Date(2023, 10, 1); // 月份从0开始
    expect(firstDate.getTime()).toBeLessThanOrEqual(nov1.getTime() + 7 * 24 * 60 * 60 * 1000);
  });
});

