// 日期范围策略实现
import { IDateRangeStrategy } from '../../shared/types/statsWall';

/**
 * 默认日期范围策略：显示到本周六（保持现有行为）
 */
export class DefaultDateRangeStrategy implements IDateRangeStrategy {
  /**
   * 包含所有日期
   */
  shouldIncludeDate(_date: Date, _today: Date): boolean {
    return true;
  }

  /**
   * 返回本周六，保证填满最后一行
   */
  getEndDate(today: Date): Date {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    endDate.setHours(0, 0, 0, 0);
    return endDate;
  }
}

/**
 * 只显示到今天策略：只显示今天及之前的日期
 */
export class TodayOnlyDateRangeStrategy implements IDateRangeStrategy {
  /**
   * 只包含今天及之前的日期
   */
  shouldIncludeDate(date: Date, today: Date): boolean {
    // 比较日期部分，忽略时间
    const dateTime = date.getTime();
    const todayTime = today.getTime();
    return dateTime <= todayTime;
  }

  /**
   * 仍然返回本周六，保持网格对齐
   */
  getEndDate(today: Date): Date {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    endDate.setHours(0, 0, 0, 0);
    return endDate;
  }
}

