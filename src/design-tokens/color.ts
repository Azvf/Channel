/**
 * Color System
 * 颜色系统 - 包括原始颜色和主题变量定义
 */

/**
 * 颜色原始值（基础颜色）
 */
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

/**
 * 主题变量映射
 * 用于运行时主题切换
 */
export const THEME_VARS = {
  light: {
    '--c-glass': '#bbbbbc',
    '--c-light': '#fff',
    '--c-dark': '#000',
    '--c-content': '#224',
    '--c-action': '#0052f5',
    '--c-bg': '#E8E8E9',
    '--glass-reflex-dark': '1',
    '--glass-reflex-light': '1',
    '--saturation': '150%'
  },
  dark: {
    '--c-glass': '#bbbbbc',
    '--c-light': '#fff',
    '--c-dark': '#000',
    '--c-content': '#e1e1e1',
    '--c-action': '#03d5ff',
    '--c-bg': '#1b1b1d',
    '--glass-reflex-dark': '2',
    '--glass-reflex-light': '0.3',
    '--saturation': '150%'
  },
  dim: {
    '--c-light': '#99deff',
    '--c-dark': '#20001b',
    '--c-glass': 'hsl(335 250% 74% / 1)',
    '--c-content': '#d5dbe2',
    '--c-action': '#ff48a9',
    '--c-bg': '#152433',
    '--glass-reflex-dark': '2',
    '--glass-reflex-light': '0.7',
    '--saturation': '200%'
  }
} as const;

