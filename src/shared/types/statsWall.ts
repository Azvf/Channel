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

