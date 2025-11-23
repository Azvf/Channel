/**
 * Design Tokens - Single Source of Truth
 * 
 * 这是整个设计系统的唯一真理源。所有设计值（间距、圆角、颜色、动画等）
 * 都在这里定义，然后通过构建脚本自动生成 CSS 变量和文档。
 * 
 * Strategy: TypeScript-First, CSS-Derived
 * - 将"真理"定义在 TypeScript 中（类型安全、可测试）
 * - 通过构建脚本生成 CSS 变量
 * - 运行时通过 theme-loader 注入到 DOM
 */

// ========================================
// 1. SPACING SCALE (4px Grid System)
// ========================================
export const SPACING = {
  '0.5': { rem: 0.125, px: 2, description: '微调、边框内间距' },
  '1': { rem: 0.25, px: 4, description: '极紧凑元素间距 (Tag内部)' },
  '1.5': { rem: 0.375, px: 6, description: '图标与文本间距' },
  '2': { rem: 0.5, px: 8, description: '标准组件内边距 (Input, Button)' },
  '2.5': { rem: 0.625, px: 10, description: '小间距' },
  '3': { rem: 0.875, px: 14, description: '列表项间距' },
  '3.5': { rem: 0.875, px: 14, description: '中等间距' },
  '4': { rem: 1.125, px: 18, description: '标准容器内边距 (Card Padding)' },
  '5': { rem: 1.5, px: 24, description: '模块间距' },
  '6': { rem: 1.5, px: 24, description: '宽松的模块分割' },
  '8': { rem: 2, px: 32, description: '大留白' },
  '10': { rem: 2.5, px: 40, description: '超大留白' },
  '12': { rem: 3, px: 48, description: '极大留白' },
  '16': { rem: 4, px: 64, description: '最大留白' },
} as const;

// ========================================
// 2. RADIUS SCALE (Liquid Conformality)
// ========================================
export const RADIUS = {
  xs: { px: 8, description: '鹅卵石 (Tag, Checkbox)' },
  sm: { px: 12, description: '内部元素 (List Items)' },
  md: { px: 16, description: '标准容器 (Cards, Inputs)' },
  lg: { px: 24, description: '强调容器 (Dropdowns)' },
  xl: { px: 32, description: '独立面板 (Floating Panels)' },
  '2xl': { px: 40, description: '模态框 (Modals)' },
  '3xl': { px: 48, description: '极致圆角' },
  full: { px: 9999, description: '胶囊 (Buttons, Pills)' },
} as const;

// ========================================
// 3. Z-INDEX SCALE (Semantic Elevation)
// ========================================
export const Z_INDEX = {
  hidden: -1,
  base: 1,
  content: 2,
  sticky: 10,
  appHeader: 20,
  dropdown: 30,
  dropdownContent: 31,
  modalBackdrop: 40,
  modalContent: 41,
  tooltip: 50,
  contextMenuBackdrop: 60,
  contextMenuBody: 61,
  toast: 100,
  cursorDrag: 1000,
} as const;

// ========================================
// 4. LAYOUT CONSTANTS
// ========================================
export const LAYOUT = {
  headerHeight: { px: 60 },
  rowMinHeight: { px: 44, description: 'Touch-friendly target (Apple标准)' },
  controlHeightSm: { px: 32, description: '次要按钮' },
  controlHeightMd: { px: 44, description: '标准输入框/按钮' },
  controlHeightLg: { px: 56, description: '主要CTA、底部栏' },
  modalMaxWidth: { px: 360, description: '保持单手可控' },
  modalMaxHeight: { vh: 90 },
  statsWallMaxWidth: { px: 560 },
  dropdownMaxHeight: { px: 240 },
  menuMinWidth: { px: 150 },
  textareaMinHeight: { px: 80 },
  calendarCellSize: { px: 24 },
  calendarDayLabelWidth: { px: 30 },
  calendarLegendSquareSize: { px: 10 },
} as const;

// ========================================
// 5. ANIMATION TOKENS
// ========================================
export const ANIMATION = {
  duration: {
    fast: { ms: 200, description: '微交互 (Hover, Click, Focus)' },
    base: { ms: 300, description: '布局变化 (列表展开, 卡片翻转)' },
    slow: { ms: 400, description: '场景切换 (Modal 进出)' },
    hero: { ms: 700, description: '品牌/Logo 出现的优雅动画' },
  },
  delay: {
    none: { ms: 0 },
    instant: { ms: 100, description: '即时反馈' },
    short: { ms: 200, description: '短延迟' },
  },
  ease: {
    smooth: { bezier: [0.4, 0, 0.2, 1], description: '通用平滑运动 (Google Material/iOS Standard)' },
    glass: { bezier: [1, 0.0, 0.4, 1], description: '玻璃材质的阻尼感' },
    outCubic: { bezier: [0.16, 1, 0.3, 1], description: '更有重量感的滑入 (Apple Style)' },
    spring: { bezier: [0.5, 1.5, 0.5, 1], description: '机械/回弹感 (Toggle, Switch)' },
  },
  renderTick: { ms: 100, description: '一个渲染周期' },
} as const;

// ========================================
// 6. GLASS PHYSICS SYSTEM
// ========================================
export const GLASS = {
  blurBase: { px: 12, description: '基础模糊度' },
  blurDecay: { px: 2, description: '随深度衰减量' },
  opacityBase: { value: 0.15, description: '基础不透明度' },
  opacityIncrement: { value: 0.05, description: '随深度增加量' },
  saturation: { percent: 150, description: '饱和度提升 (Vibrant Effect)' },
  reflexStrength: { value: 1 },
} as const;

// ========================================
// 7. ICON SIZES
// ========================================
export const ICON_SIZES = {
  xs: { px: 12, description: 'Micro (Status indicators)' },
  sm: { px: 14, description: 'Small (Metadata icons, Tab switcher)' },
  base: { px: 16, description: 'Base (Standard menu icons, Button icons)' },
  md: { px: 20, description: 'Medium (List avatars, Favicons)' },
  lg: { px: 24, description: 'Large (Section headers)' },
  xl: { px: 32, description: 'Display (Empty states, Hero icons)' },
} as const;

// ========================================
// 8. TYPOGRAPHY
// ========================================
export const TYPOGRAPHY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  styles: {
    headerTitle: {
      weight: 700,
      size: { rem: 1, px: 16 },
      lineHeight: 1.35,
      letterSpacing: { em: -0.02 },
      description: '应用标题',
    },
    pageTitle: {
      weight: 600,
      size: { rem: 1.1, px: 17.6 },
      lineHeight: 1.35,
      letterSpacing: { em: -0.015 },
      description: '页面/卡片标题',
    },
    body: {
      weight: 400,
      size: { rem: 0.85, px: 13.6 },
      lineHeight: 1.4,
      letterSpacing: { em: 0.01 },
      description: '正文内容',
    },
    listItem: {
      weight: 500,
      size: { rem: 0.9, px: 14.4 },
      lineHeight: 1.4,
      letterSpacing: { em: 0 },
      description: '列表项文本',
    },
    caption: {
      weight: 400,
      size: { rem: 0.8, px: 12.8 },
      lineHeight: 1.4,
      letterSpacing: { em: 0.005 },
      description: '辅助说明',
    },
    tag: {
      weight: 500,
      size: { rem: 0.75, px: 12 },
      lineHeight: 1.4,
      letterSpacing: { em: 0.01 },
      description: '标签文字',
    },
    micro: {
      weight: 500,
      size: { rem: 0.6, px: 9.6 },
      lineHeight: 1,
      letterSpacing: { em: 0 },
      description: '热力图标签',
    },
  },
} as const;

// ========================================
// 9. COLOR PRIMITIVES
// ========================================
export const COLORS = {
  glass: '#bbbbbc',
  light: '#fff',
  dark: '#000',
  content: '#224',
  action: '#0052f5',
  bg: '#E8E8E9',
  destructive: '#D0021B',
  warning: '#F5A623',
} as const;

// ========================================
// 10. OPACITY SYSTEM
// ========================================
export const OPACITY = {
  disabled: 0.6,
  loading: 0.7,
  hover: 0.8,
} as const;

// ========================================
// 11. SHADOW SYSTEM
// ========================================
export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  elevationLow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  elevationMedium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  elevationHigh: '0 16px 40px -12px rgba(0, 0, 0, 0.2), 0 4px 12px -4px rgba(0, 0, 0, 0.1)',
} as const;

// ========================================
// 12. SCROLLBAR SYSTEM
// ========================================
export const SCROLLBAR = {
  width: { px: 10 },
  thumbWidthVisual: { px: 4 },
  thumbIdleOpacity: 0.12,
  thumbHoverOpacity: 0.25,
  thumbActiveOpacity: 0.4,
} as const;

// ========================================
// 13. FOCUS SYSTEM
// ========================================
export const FOCUS = {
  ringWidth: { px: 3, description: '焦点光晕宽度' },
} as const;

// ========================================
// Helper: 生成 CSS 变量名
// ========================================
export function getCssVarName(category: string, key: string): string {
  return `--${category}-${key}`;
}

// ========================================
// Helper: 生成 CSS 变量值
// ========================================
export function getCssVarValue(token: any): string {
  if (typeof token === 'object' && token !== null) {
    if ('rem' in token) return `${token.rem}rem`;
    if ('px' in token) return `${token.px}px`;
    if ('vh' in token) return `${token.vh}vh`;
    if ('em' in token) return `${token.em}em`;
    if ('percent' in token) return `${token.percent}%`;
    if ('value' in token) return String(token.value);
    if ('ms' in token) return `${token.ms}ms`;
    if ('bezier' in token) return `cubic-bezier(${token.bezier.join(', ')})`;
  }
  return String(token);
}

