/**
 * Input Intent Map
 * Intent-Action 键盘映射层
 * 
 * 目的：解耦"按键物理码"与"业务意图"，支持自定义快捷键和移动端适配
 */

import type React from 'react';

/**
 * 输入意图类型
 */
export type InputIntent =
  | 'CONFIRM_PRIMARY'      // 对应 Enter (选中 Top Hit 或 创建)
  | 'CONFIRM_SECONDARY'    // 对应 Shift + Enter (强制创建)
  | 'NAVIGATE_NEXT'        // 对应 ArrowDown
  | 'NAVIGATE_PREV'        // 对应 ArrowUp
  | 'CANCEL';              // 对应 Escape

/**
 * 键盘映射配置
 * 支持修饰键（如 Shift）和默认行为
 */
export interface KeyboardMap {
  [key: string]: {
    shift?: InputIntent;
    default: InputIntent;
  } | InputIntent;
}

/**
 * 默认键盘映射
 */
export const DEFAULT_KEYBOARD_MAP: KeyboardMap = {
  'Enter': {
    shift: 'CONFIRM_SECONDARY',
    default: 'CONFIRM_PRIMARY',
  },
  'ArrowDown': 'NAVIGATE_NEXT',
  'ArrowUp': 'NAVIGATE_PREV',
  'Tab': 'NAVIGATE_NEXT',  // A11y 增强：Tab 也可以导航
  'Escape': 'CANCEL',
};

/**
 * 输入意图解析器
 */
export class InputIntentResolver {
  /**
   * 解析键盘事件为业务意图
   * @param event - 键盘事件（支持原生 KeyboardEvent 或 React 的 SyntheticEvent）
   * @param map - 键盘映射配置（默认使用 DEFAULT_KEYBOARD_MAP）
   * @returns 解析后的意图，如果未匹配则返回 null
   */
  resolve(
    event: KeyboardEvent | React.KeyboardEvent,
    map: KeyboardMap = DEFAULT_KEYBOARD_MAP
  ): InputIntent | null {
    // 处理 React 的 SyntheticEvent
    const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event;
    const key = nativeEvent.key;
    const mapping = map[key];

    if (!mapping) {
      return null;
    }

    // 如果是简单映射（直接是 InputIntent）
    if (typeof mapping === 'string') {
      return mapping;
    }

    // 如果是对象映射（支持修饰键）
    if (nativeEvent.shiftKey && mapping.shift) {
      return mapping.shift;
    }

    return mapping.default;
  }
}

/**
 * 创建默认的输入意图解析器实例
 */
export function createInputIntentResolver(): InputIntentResolver {
  return new InputIntentResolver();
}

