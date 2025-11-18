// 日历网格生成器
import { CalendarLayoutInfo, CalendarCell, ActivityLevel } from '../types/statsWall';

export class CalendarGridBuilder {
  private lookbackDays: number = 365;

  constructor(lookbackDays: number = 365) {
    this.lookbackDays = lookbackDays;
  }

  /**
   * 生成完整的日历网格数据
   * @param activityMap 日期字符串到计数的映射
   * @param levelMap 日期字符串到等级的映射
   */
  public build(
    activityMap: Map<string, number>,
    levelMap: Map<string, ActivityLevel>
  ): CalendarLayoutInfo {
    const cells: CalendarCell[] = [];
    const months: { label: string; colStart: number }[] = [];

    const today = new Date();
    // 重置时间部分，避免时区/时间计算误差
    today.setHours(0, 0, 0, 0);

    // 计算结束日期（移动到本周六）
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    // 计算开始日期
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - this.lookbackDays);
    // 回溯到上一个周日，保证网格对齐
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // 预分配数组内存 (微优化：V8 喜欢固定大小或预分配的数组)
    // 估算大概天数 + 缓冲
    const estimatedSize = this.lookbackDays + 14; 
    
    let currentMonthLabel = '';
    let currentWeekIndex = 1;
    
    // 使用时间戳循环，通常比 Date 对象操作更快且更不易出错
    const oneDayMs = 24 * 60 * 60 * 1000;
    let currentTs = startDate.getTime();
    const endTs = endDate.getTime();

    // 使用 Intl.DateTimeFormat 提升格式化性能（复用实例）
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const dateStringFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    while (currentTs <= endTs) {
      const currentDate = new Date(currentTs);
      // key 格式: YYYY-MM-DD
      const key = currentDate.toISOString().split('T')[0];
      
      const count = activityMap.get(key) || 0;
      const level = levelMap.get(key) || 0;

      cells.push({
        id: key,
        date: currentDate, // 这里保存 Date 对象引用
        count,
        level,
        label: dateStringFormatter.format(currentDate)
      });

      // 处理月份标签逻辑
      const monthKey = monthFormatter.format(currentDate);
      if (monthKey !== currentMonthLabel) {
        currentMonthLabel = monthKey;
        // 如果是周日(0)，就是当前周；否则是下一周
        const colStart = currentDate.getDay() === 0 ? currentWeekIndex : currentWeekIndex + 1;
        
        // 简单去重，防止同一行出现重复月份
        const lastMonth = months[months.length - 1];
        if (!lastMonth || lastMonth.label !== monthKey) {
           months.push({ label: monthKey, colStart });
        }
      }

      if (currentDate.getDay() === 6) {
        currentWeekIndex++;
      }

      currentTs += oneDayMs;
    }

    return {
      cells,
      months,
      totalWeeks: Math.ceil(cells.length / 7)
    };
  }
}

