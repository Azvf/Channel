/**
 * Theme System
 * 核心原则：语义化 (Semantic) 与 景深 (Depth)
 */

import { PALETTE } from './color';
import { SHADOWS } from './shadow';

type ThemeVariables = Record<string, string>;

/**
 * 辅助工具：构建主题合并逻辑
 */
function mergeTheme(
  defaultTheme: ThemeVariables,
  partialTheme: Partial<ThemeVariables>
): ThemeVariables {
  const filteredPartial: ThemeVariables = {};
  for (const [key, value] of Object.entries(partialTheme)) {
    if (value !== undefined) {
      filteredPartial[key] = value;
    }
  }
  return { ...defaultTheme, ...filteredPartial };
}

/**
 * [Layer 1] 默认主题 (Light Mode)
 * 以 "干净、透气" 为核心
 */
const DEFAULT_THEME: ThemeVariables = {
  // --- 1. 背景层级 (Backgrounds) ---
  '--bg-page': PALETTE.slate[50],      // 页面底色：极淡的灰
  '--bg-surface': PALETTE.base.white,  // 卡片/模块底色：纯白 (创造层级)
  '--bg-overlay': 'rgba(255, 255, 255, 0.8)', // 弹窗/遮罩

  // --- 2. 文本层级 (Typography Colors) ---
  // 使用 slate-900 而不是纯黑，减少视觉疲劳
  '--text-primary': PALETTE.slate[900],   // 标题、核心内容
  '--text-secondary': PALETTE.slate[600], // 说明、次要信息 (使用 Slate-600 确保 WCAG AA 对比度)
  '--text-tertiary': PALETTE.slate[400],  // 占位符、禁用态
  '--text-on-action': PALETTE.base.white, // 按钮上的文字

  // --- 3. 边框与分割 (Borders) ---
  '--border-subtle': PALETTE.slate[200], // 极淡的分割线
  '--border-focus': PALETTE.blue[600],   // 聚焦时的边框
  
  // --- 3.1 空状态 (Empty State) ---
  // 用于空状态插画的线条和填充，比 border-subtle 更淡，避免抢夺注意力
  '--empty-state-stroke': PALETTE.slate[300], // 空状态插画线条（比 border-subtle 稍深，但足够淡）
  '--empty-state-fill': PALETTE.slate[100],   // 空状态插画填充

  // --- 4. 交互色 (Action) ---
  '--color-action': PALETTE.blue[600],
  '--color-action-hover': PALETTE.blue[700],
  '--color-destructive': PALETTE.red[600],
  '--color-warning': PALETTE.amber[500],

  // --- 5. 玻璃拟态 (Glassmorphism) - 分级系统 ---
  // 亮色模式下的玻璃：像一块磨砂的白水晶
  '--glass-bg': 'rgba(255, 255, 255, 0.65)',
  '--glass-border': 'rgba(255, 255, 255, 0.4)',
  '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.04)',
  
  // 玻璃分级系统 (Level-based Glass Physics)
  '--glass-panel-blur': '12px',
  '--glass-panel-saturation': '180%',
  '--glass-panel-opacity': '0.7',
  
  '--glass-modal-blur': '24px',
  '--glass-modal-saturation': '200%',
  '--glass-modal-opacity': '0.8',
  
  '--glass-tooltip-blur': '40px',
  '--glass-tooltip-saturation': '150%',
  '--glass-tooltip-opacity': '0.9',
  

  // --- 6. 玻璃反射效果变量 (用于光照效果) ---
  '--c-light': PALETTE.base.white,  // 用于玻璃反射的高光
  '--c-dark': PALETTE.base.black,    // 用于玻璃反射的阴影
  '--glass-reflex-dark': '1',
  '--glass-reflex-light': '1',
  '--glass-reflex-strength': '1',
  '--saturation': '150%',
  
  // --- 7. 阴影系统 (Light Mode: 物理投影) ---
  // Light Mode 仅使用物理投影，模拟纸张和光照
  '--shadow-sm': SHADOWS.sm,
  '--shadow-md': SHADOWS.md,
  '--shadow-lg': SHADOWS.lg,
  '--shadow-float': SHADOWS.float,
  '--shadow-color': 'rgba(0, 0, 0, 0.1)',
  
  // --- 8. 其他系统变量 ---
  '--font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--radius-base': '16px', // 对应 rounded-md
  '--transition-fast': '200ms',
  '--transition-base': '300ms',
  '--transition-slow': '400ms',
  '--transition-hero': '700ms',
  '--focus-ring-width': '3px',
  '--focus-ring-color': 'var(--color-action)',
  '--focus-ring-opacity': '0.5',
  '--sb-thumb-opacity-idle': '0.12',
  '--sb-thumb-opacity-hover': '0.25',
  '--sb-thumb-opacity-active': '0.4',
  '--border-width-base': '1px',
  '--border-width-thick': '2px',
  '--font-size-base': '0.875rem',
  '--font-weight-base': '400',
  '--font-weight-bold': '600',
  // Typography 系统
  '--font-heading1-weight': '600',
  '--font-heading1-size': '1.5rem',
  '--font-heading1-line-height': '1.2',
  '--font-heading1-letter-spacing': '-0.02em',
  '--font-heading2-weight': '600',
  '--font-heading2-size': '1.125rem',
  '--font-heading2-line-height': '1.3',
  '--font-heading2-letter-spacing': '-0.01em',
  '--font-heading3-weight': '500',
  '--font-heading3-size': '1rem',
  '--font-heading3-line-height': '1.4',
  '--font-heading3-letter-spacing': '-0.005em',
  '--font-body-weight': '400',
  '--font-body-size': '0.875rem',
  '--font-body-line-height': '1.5',
  '--font-body-letter-spacing': '0',
  '--font-caption-weight': '400',
  '--font-caption-size': '0.75rem',
  '--font-caption-line-height': '1.4',
  '--font-caption-letter-spacing': '0.01em',
  '--font-label-weight': '500',
  '--font-label-size': '0.75rem',
  '--font-label-line-height': '1',
  '--font-label-letter-spacing': '0.02em',
  '--font-micro-weight': '500',
  '--font-micro-size': '0.625rem',
  '--font-micro-line-height': '1',
  '--font-micro-letter-spacing': '0.02em',
  '--ease-base': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--ease-glass': 'cubic-bezier(1, 0.0, 0.4, 1)',
  '--ease-spring': 'cubic-bezier(0.2, 0.8, 0.2, 1)', // iOS/Mac 风格的重量感物理曲线
  '--tooltip-shadow-intensity': '0.12',
  '--tooltip-border-opacity': '0.2',
} as const;

/**
 * [Layer 2] 主题变体
 */
const PARTIAL_THEMES = {
  light: {}, // 默认

  /**
   * [Dark Mode] 深色模式
   * 策略：提升法 (Elevation Strategy)
   * 背景最深 (slate-950)，卡片稍亮 (slate-900)，悬浮更亮 (slate-800)
   * 避免使用纯黑 (#000)，除非是为了 OLED 省电模式
   */
  dark: {
    // 背景：使用带蓝调的深灰，比纯黑更有质感
    '--bg-page': PALETTE.slate[950],
    '--bg-surface': PALETTE.slate[900],
    '--bg-overlay': 'rgba(15, 23, 42, 0.8)', // slate-900 with opacity

    // 文本：反转逻辑
    '--text-primary': PALETTE.slate[50],
    '--text-secondary': PALETTE.slate[400],
    '--text-tertiary': PALETTE.slate[600],

    // 边框：深色模式下，边框是定义层级的关键（因为阴影不可见）
    '--border-subtle': PALETTE.slate[800],
    
    // 空状态：深色模式下使用更亮的线条和填充
    '--empty-state-stroke': PALETTE.slate[700],
    '--empty-state-fill': PALETTE.slate[900],
    
    // 交互：在深色背景上，通常需要稍微提亮主色以保证对比度
    '--color-action': PALETTE.blue[500], 

    // 玻璃：深色玻璃，像黑曜石
    '--glass-bg': 'rgba(15, 23, 42, 0.6)',
    // 关键：深色模式下的玻璃需要一个发光的白边来勾勒轮廓
    '--glass-border': 'rgba(255, 255, 255, 0.08)', 
    '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
    
    // 玻璃分级系统 - 深色模式调整
    '--glass-panel-blur': '14px',
    '--glass-panel-opacity': '0.75',
    '--glass-modal-blur': '28px',
    '--glass-modal-opacity': '0.85',
    '--glass-tooltip-blur': '45px',
    '--glass-tooltip-opacity': '0.95',

    // 阴影系统 (Dark Mode: 光晕效果)
    // Dark Mode 仅使用光晕效果，模拟屏幕自发光
    '--shadow-sm': SHADOWS['glow-sm'],
    '--shadow-md': SHADOWS['glow-md'],
    '--shadow-lg': SHADOWS['glow-lg'],
    '--shadow-float': SHADOWS['glow-md'], // 悬浮状态使用中等光晕
    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
    '--focus-ring-opacity': '0.6',
    '--tooltip-shadow-intensity': '0.15',
    '--tooltip-border-opacity': '0.25',
  },

  /**
   * [Dim Mode] 莱茵生命 / 黑客模式
   * 策略：高对比度、霓虹点缀、极致的黑
   */
  dim: {
    '--bg-page': '#050505', // 近乎纯黑
    '--bg-surface': '#0A0A0A',
    
    '--text-primary': PALETTE.rhine.lime, // 核心文字直接用品牌色
    '--text-secondary': PALETTE.rhine.tundra,
    
    '--border-subtle': '#1A1A1A',
    '--empty-state-stroke': '#2A2A2A', // 比 border-subtle 稍亮
    '--empty-state-fill': '#0F0F0F',   // 极暗的填充
    '--color-action': PALETTE.rhine.holo,
    
    // 极具攻击性的玻璃效果
    '--glass-bg': 'rgba(5, 5, 5, 0.8)',
    '--glass-border': 'rgba(204, 247, 40, 0.2)', // 绿色边框光晕
    '--glass-shadow': '0 0 20px rgba(204, 247, 40, 0.1)', // 绿色辉光

    '--glass-reflex-dark': '2',
    '--glass-reflex-light': '0.8',
    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
    '--radius-base': '1.25rem',
    '--transition-fast': '250ms',
    '--transition-base': '400ms',
    '--transition-slow': '500ms',
    '--transition-hero': '800ms',
    '--focus-ring-opacity': '0.6',
    '--sb-thumb-opacity-idle': '0.15',
    '--sb-thumb-opacity-hover': '0.3',
    '--sb-thumb-opacity-active': '0.45',
    '--ease-base': 'cubic-bezier(0.3, 0, 0.2, 1)',
    '--ease-glass': 'cubic-bezier(0.8, 0.0, 0.3, 1)',
    '--tooltip-shadow-intensity': '0.2',
    '--tooltip-border-opacity': '0.3',
  },
  
  // Rhine Light / Dark 可以基于上述逻辑微调，这里暂略，确保核心逻辑跑通
  'rhine-light': {
    '--glass-reflex-dark': '0.8',
    '--glass-reflex-light': '1.2',
    '--saturation': '110%',
    '--shadow-color': 'rgba(11, 12, 14, 0.08)',
    '--glass-reflex-strength': '1.2',
    '--radius-base': '0.75rem',
    '--transition-fast': '150ms',
    '--transition-base': '250ms',
    '--transition-slow': '350ms',
    '--transition-hero': '600ms',
    '--focus-ring-width': '2px',
    '--focus-ring-opacity': '0.6',
    '--sb-thumb-opacity-idle': '0.1',
    '--sb-thumb-opacity-hover': '0.2',
    '--sb-thumb-opacity-active': '0.35',
    '--ease-base': 'cubic-bezier(0.5, 0, 0.1, 1)',
    '--ease-glass': 'cubic-bezier(1, 0.0, 0.3, 1)',
    '--tooltip-shadow-intensity': '0.1',
    '--tooltip-border-opacity': '0.15'
  },

  'rhine-dark': {
    '--glass-reflex-dark': '1.5',
    '--glass-reflex-light': '0.5',
    '--saturation': '130%',
    '--shadow-color': 'rgba(0, 0, 0, 0.4)',
    '--glass-reflex-strength': '1.5',
    '--radius-base': '0.875rem',
    '--transition-fast': '180ms',
    '--transition-base': '280ms',
    '--transition-slow': '380ms',
    '--transition-hero': '650ms',
    '--focus-ring-width': '2px',
    '--focus-ring-opacity': '0.7',
    '--ease-base': 'cubic-bezier(0.5, 0, 0.1, 1)',
    '--ease-glass': 'cubic-bezier(1, 0.0, 0.3, 1)',
    '--tooltip-shadow-intensity': '0.25',
    '--tooltip-border-opacity': '0.3',
  }
} as const;

/**
 * 主题变量映射
 * 通过合并部分主题定义与默认主题生成完整的主题变量映射
 */
export const THEME_VARS: Record<string, ThemeVariables> = {
  light: DEFAULT_THEME,
  dark: mergeTheme(DEFAULT_THEME, PARTIAL_THEMES.dark),
  dim: mergeTheme(DEFAULT_THEME, PARTIAL_THEMES.dim),
  'rhine-light': mergeTheme(DEFAULT_THEME, PARTIAL_THEMES['rhine-light']),
  'rhine-dark': mergeTheme(DEFAULT_THEME, PARTIAL_THEMES['rhine-dark']),
} as const;

export type ThemeName = keyof typeof THEME_VARS;
