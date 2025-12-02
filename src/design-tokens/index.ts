/**
 * Design Tokens - Unified Export
 * 设计 Tokens 统一导出入口
 * 
 * 这是整个设计系统的唯一真理源。所有设计值（间距、圆角、颜色、动画等）
 * 都在这里定义，然后通过构建脚本自动生成 CSS 变量和文档。
 * 
 * Strategy: TypeScript-First, CSS-Derived
 * - 将"真理"定义在 TypeScript 中（类型安全、可测试）
 * - 通过构建脚本生成 CSS 变量
 * - 运行时通过 theme-loader 注入到 DOM
 */

// 导出所有 tokens
export * from './spacing';
export * from './radius';
export * from './z-index';
export * from './layout';
export * from './animation';
export * from './glass';
export * from './typography';
export * from './icon';
export * from './color';
export * from './opacity';
export * from './shadow';
export * from './scrollbar';
export * from './focus';
export * from './theme';
export * from './utils';

// 为了向后兼容，导出完整的 tokens 对象（供生成脚本使用）
import { SPACING } from './spacing';
import { RADIUS } from './radius';
import { Z_INDEX } from './z-index';
import { LAYOUT } from './layout';
import { ANIMATION } from './animation';
import { GLASS } from './glass';
import { TYPOGRAPHY } from './typography';
import { ICON_SIZES } from './icon';
import { COLORS } from './color';
import { OPACITY } from './opacity';
import { SHADOWS } from './shadow';
import { SCROLLBAR } from './scrollbar';
import { FOCUS } from './focus';
import { THEME_VARS } from './theme';

/**
 * 完整的 tokens 对象（用于生成脚本）
 * 保持向后兼容
 */
export const TOKENS = {
  SPACING,
  RADIUS,
  Z_INDEX,
  LAYOUT,
  ANIMATION,
  GLASS,
  TYPOGRAPHY,
  ICON_SIZES,
  COLORS,
  OPACITY,
  SHADOWS,
  SCROLLBAR,
  FOCUS,
  THEME_VARS,
} as const;

