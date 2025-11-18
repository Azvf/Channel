// 日历网格生成器
import { CalendarLayoutInfo, CalendarCell, ActivityLevel } from '../types/statsWall';

export class CalendarGridBuilder {
  // lookbackDays 现在作为"如果没有数据时的默认回溯天数"或者"最大回溯限制"（如果需要）
  // 在当前需求下，主要依靠数据驱动
  private defaultLookbackDays: number = 30; 

  constructor(lookbackDays: number = 30) {
    this.defaultLookbackDays = lookbackDays;
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
    today.setHours(0, 0, 0, 0);

    // [修改 1] 计算 Start Date：基于数据动态决定
    let startDate: Date;
    
    // 找出最早的有活动的日期
    let minDateTs = Number.MAX_SAFE_INTEGER;
    for (const dateStr of activityMap.keys()) {
      // activityMap 的 key 格式假定为 YYYY-MM-DD
      // 我们手动解析以避免 UTC/本地时区转换带来的 "差一天" 问题
      const [y, m, d] = dateStr.split('-').map(Number);
      // 构造本地时间 (月份从0开始)
      const ts = new Date(y, m - 1, d).getTime();
      if (ts < minDateTs) {
        minDateTs = ts;
      }
    }

    if (minDateTs !== Number.MAX_SAFE_INTEGER) {
      // A. 如果有数据：从最早记录所在月份的 1 号开始
      const minDate = new Date(minDateTs);
      // 设置为当月 1 号
      startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    } else {
      // B. 如果完全没数据：默认只显示本月 (从本月 1 号开始)
      // 这样新用户看到的是一个空的当月视图，而不是空白的一整年
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    // 确保时间部分归零
    startDate.setHours(0, 0, 0, 0);

    // [关键] 网格对齐：必须从周日开始
    // 回溯到 startDate 所在周的周日
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // ---------------------------------------------------------

    // 计算结束日期（移动到本周六，保证填满最后一行）
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    endDate.setHours(0, 0, 0, 0);

    // 预分配数组内存 (微优化)
    // 计算大概的天数差
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    let currentMonthLabel = '';
    let currentWeekIndex = 1;
    
    // 使用时间戳循环
    const oneDayMs = 24 * 60 * 60 * 1000;
    let currentTs = startDate.getTime();
    const endTs = endDate.getTime();

    // 使用 Intl.DateTimeFormat 提升格式化性能
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const dateStringFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    while (currentTs <= endTs) {
      const currentDate = new Date(currentTs);
      // key 格式: YYYY-MM-DD (保持本地时间)
      // 注意：toISOString 会转 UTC，导致日期偏差。
      // 这里使用手动格式化保证本地时间准确性:
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      
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
        
        // 只有当这一天是该周的后面几天（比如周三后），或者是第一周，才显示月份标签
        // 防止月份标签出现在行末导致拥挤，或者根据需要调整策略
        // 这里简化策略：如果是新出现的月份，就标记
        
        const colStart = currentDate.getDay() === 0 ? currentWeekIndex : currentWeekIndex + 1;
        
        // 简单去重，防止同一行出现重复月份（如果一行跨两月）
        const lastMonth = months[months.length - 1];
        // 只有当该月的第一天出现在该周的"早期"（比如周日到周三），才在当前周标示
        // 否则如果在周六换月，标签可能标在下一周
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

