// Stats Wall 系统类型定义

export type ActivityLevel = 0 | 1 | 2 | 3;

// 原始数据点 (Data Object)
export interface RawActivityPoint {
  timestamp: number; // Unix Timestamp
  count: number;     // 甚至可以扩展为权重
}

// 渲染友好的视图模型 (View Model)
// 这是直接喂给 React 或 WebGL 渲染的数据结构
export interface CalendarCell {
  id: string;        // YYYY-MM-DD
  date: Date;
  count: number;
  level: ActivityLevel;
  label: string;     // 用于 Tooltip
}

// 布局信息
export interface CalendarLayoutInfo {
  cells: CalendarCell[];
  months: { label: string; colStart: number }[];
  totalWeeks: number;
}

// 策略接口：用于计算热图强度
export interface IHeatmapStrategy {
  computeLevels(dataMap: Map<string, number>): Map<string, ActivityLevel>;
}

// 策略接口：用于日期范围过滤
export interface IDateRangeStrategy {
  /**
   * 判断是否应该包含该日期
   * @param date 要判断的日期
   * @param today 今天的日期（用于比较）
   * @returns 是否应该包含该日期
   */
  shouldIncludeDate(date: Date, today: Date): boolean;
  
  /**
   * 计算用于网格对齐的结束日期（用于计算 totalWeeks）
   * @param today 今天的日期
   * @returns 结束日期
   */
  getEndDate(today: Date): Date;
}

// 增量缓存元数据
export interface StatsWallCacheMetadata {
  version: number; // 缓存版本号
  lastComputedAt: number; // 最后计算时间戳
  lastPageVersion: number; // 最后处理的页面版本号（使用最大 updatedAt 作为版本标识）
  activityMap: Record<string, number>; // 日期 -> 计数映射（序列化为对象）
  pageIds: string[]; // 已处理的页面 ID 集合（序列化为数组）
}

// 增量更新结果
export interface IncrementalUpdateResult {
  updatedDates: string[]; // 更新的日期列表
  newDates: string[]; // 新增的日期列表
  removedDates: string[]; // 移除的日期列表（如果页面被删除）
}

