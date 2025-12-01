// 事件通知类型定义
// 用于 Background Service Worker 向 Popup 发送单向事件通知

import type { CalendarLayoutInfo } from '../types/statsWall';

/**
 * Stats Wall 事件类型
 */
export type StatsWallEventType = 'statsWall:updated' | 'statsWall:computing';

/**
 * Stats Wall 更新事件
 * 当后台计算完成时发送
 * 注意：现在只包含版本号，不包含完整数据（减少消息大小）
 * Popup 需要通过 RPC 方法 getStatsWallData() 获取完整数据
 */
export interface StatsWallUpdateEvent {
  type: 'statsWall:updated';
  data?: CalendarLayoutInfo; // 可选，为了向后兼容，但通常不包含
  version: number; // 版本号，用于判断是否需要更新
  computedAt: number; // 计算时间戳
}

/**
 * Stats Wall 计算中事件
 * 可选：用于显示计算进度
 */
export interface StatsWallComputingEvent {
  type: 'statsWall:computing';
  progress?: number; // 可选：计算进度 0-1
}

/**
 * Stats Wall 事件联合类型
 */
export type StatsWallEvent = StatsWallUpdateEvent | StatsWallComputingEvent;

/**
 * Chrome Runtime Message 事件包装
 * 用于通过 chrome.runtime.sendMessage 发送事件
 */
export interface RuntimeEventMessage {
  event: 'statsWall';
  payload: StatsWallEvent;
}

