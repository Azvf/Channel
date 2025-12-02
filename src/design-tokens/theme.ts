/**
 * Theme System
 * 主题系统 - 主题变量映射与配置
 * 
 * 此模块负责组合所有设计 tokens，生成运行时主题变量映射。
 * 每个主题可以定义自己的视觉风格参数（颜色、Glass 效果、动画、圆角等）。
 * 
 * Strategy: Partial Override with Default Fallback
 * - 默认主题（light）包含所有变量的完整定义
 * - 其他主题只需定义需要覆盖的变量
 * - 使用 mergeTheme() 函数将部分主题与默认主题合并
 * - 通过 [theme-loader.ts](../popup/theme-loader.ts) 同步注入到 DOM，防止主题闪烁
 * 
 * 架构说明：
 * - Layer 1: DEFAULT_THEME - 完整定义所有变量（作为 fallback）
 * - Layer 2: 部分主题定义 - 只定义需要覆盖的变量
 * - Layer 3: 合并后的主题 - 运行时使用，包含所有变量
 */

/**
 * 主题变量类型定义
 */
type ThemeVariables = Record<string, string>;

/**
 * 合并主题函数
 * 将部分主题定义与默认主题合并，生成完整的主题变量映射
 * 
 * @param defaultTheme - 默认主题（包含所有变量的完整定义）
 * @param partialTheme - 部分主题（只包含需要覆盖的变量）
 * @returns 合并后的完整主题变量映射
 * 
 * @example
 * ```typescript
 * const customTheme = mergeTheme(DEFAULT_THEME, {
 *   '--c-action': '#FF0000',  // 只覆盖 action 颜色
 *   '--radius-base': '0.5rem' // 只覆盖圆角半径
 *   // 其他变量自动使用默认值
 * });
 * ```
 */
function mergeTheme(
  defaultTheme: ThemeVariables,
  partialTheme: Partial<ThemeVariables>
): ThemeVariables {
  // 过滤掉 undefined 值，确保所有值都是 string
  const filteredPartial: ThemeVariables = {};
  for (const [key, value] of Object.entries(partialTheme)) {
    if (value !== undefined) {
      filteredPartial[key] = value;
    }
  }
  return { ...defaultTheme, ...filteredPartial };
}

/**
 * 默认主题（light）
 * 包含所有主题变量的完整定义，作为其他主题的 fallback
 * 
 * 参考: [tokens.css](../../popup/styles/tokens.css) 中的 fallback 值应该与此保持一致
 */
const DEFAULT_THEME: ThemeVariables = {
    '--c-glass': '#bbbbbc',
    '--c-light': '#fff',
    '--c-dark': '#000',
    '--c-content': '#224',
    '--c-action': '#0052f5',
    '--c-bg': '#E8E8E9',
    '--glass-reflex-dark': '1',
    '--glass-reflex-light': '1',
    '--saturation': '150%',
    '--font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    // 阴影系统
    '--shadow-color': 'rgba(0, 0, 0, 0.1)',
    // Glass 物理参数
    '--glass-blur-base': '12px',
    '--glass-blur-decay': '2px',
    '--glass-opacity-base': '0.15',
    '--glass-opacity-increment': '0.05',
    '--glass-reflex-strength': '1',
    // 圆角半径
    '--radius-base': '1.0rem',
    // 动画时长
    '--transition-fast': '200ms',
    '--transition-base': '300ms',
    '--transition-slow': '400ms',
    '--transition-hero': '700ms',
    // 焦点环样式
    '--focus-ring-width': '3px',
    '--focus-ring-color': 'var(--c-action)',
    '--focus-ring-opacity': '0.5',
    // 滚动条样式
    '--sb-thumb-opacity-idle': '0.12',
    '--sb-thumb-opacity-hover': '0.25',
    '--sb-thumb-opacity-active': '0.4',
    // 边框样式
    '--border-width-base': '1px',
    '--border-width-thick': '2px',
    // Typography 系统
    '--font-size-base': '0.85rem',
    '--font-weight-base': '400',
    '--font-weight-bold': '600',
    // Typography 文本样式
    '--font-page-title-weight': '600',
    '--font-page-title-size': '1.1rem',
    '--font-page-title-line-height': '1.35',
    '--font-page-title-letter-spacing': '-0.015em',
    '--font-header-title-weight': '700',
    '--font-header-title-size': '1rem',
    '--font-header-title-line-height': '1.35',
    '--font-header-title-letter-spacing': '-0.02em',
    '--font-section-title-weight': '600',
    '--font-section-title-size': '0.75rem',
    '--font-section-title-line-height': '1.4',
    '--font-section-title-letter-spacing': '0.05em',
    '--font-body-weight': '400',
    '--font-body-size': '0.85rem',
    '--font-body-line-height': '1.4',
    '--font-body-letter-spacing': '0.01em',
    '--font-list-item-weight': '500',
    '--font-list-item-size': '0.9rem',
    '--font-list-item-line-height': '1.4',
    '--font-list-item-letter-spacing': 'normal',
    '--font-caption-weight': '400',
    '--font-caption-size': '0.8rem',
    '--font-caption-line-height': '1.4',
    '--font-caption-letter-spacing': '0.005em',
    '--font-footnote-weight': '400',
    '--font-footnote-size': '0.75rem',
    '--font-footnote-line-height': '1.4',
    '--font-footnote-letter-spacing': '0.01em',
    '--font-label-weight': '600',
    '--font-label-size': '0.7rem',
    '--font-label-line-height': '1.4',
    '--font-label-letter-spacing': '0.02em',
    '--font-tag-weight': '500',
    '--font-tag-size': '0.75rem',
    '--font-tag-line-height': '1.4',
    '--font-tag-letter-spacing': '0.01em',
    '--font-module-title-weight': '500',
    '--font-module-title-size': '0.7rem',
    '--font-module-title-line-height': '1.4',
    '--font-module-title-letter-spacing': '0.05em',
    '--font-micro-weight': '500',
    '--font-micro-size': '0.6rem',
    '--font-micro-line-height': '1',
    '--font-micro-letter-spacing': '0',
    '--font-small-weight': '400',
    '--font-small-size': '0.7rem',
    '--font-small-line-height': '1.4',
    '--font-small-letter-spacing': '0',
    // 过渡曲线
    '--ease-base': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '--ease-glass': 'cubic-bezier(1, 0.0, 0.4, 1)',
    // Tooltip 样式
    '--tooltip-shadow-intensity': '0.12',
    '--tooltip-border-opacity': '0.2',
    // Intent 颜色
    '--color-destructive': '#D0021B',
    '--color-warning': '#F5A623'
} as const;

/**
 * 部分主题定义
 * 只定义需要覆盖的变量，未定义的变量将自动使用 DEFAULT_THEME 的值
 */
const PARTIAL_THEMES = {
  /**
   * light 主题使用默认值，无需覆盖
   */
  light: {},

  /**
   * dark 主题 - 暗色模式
   * 只覆盖与 light 主题不同的变量
   */
  dark: {
    // 颜色变量 - 只覆盖不同的颜色
    '--c-content': '#e1e1e1',
    '--c-action': '#03d5ff',
    '--c-bg': '#1b1b1d',
    // Glass 反射参数
    '--glass-reflex-dark': '2',
    '--glass-reflex-light': '0.3',
    // 阴影系统 - 暗色主题需要更深的阴影
    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
    // Glass 物理参数 - 暗色主题需要更强的模糊和更高的不透明度
    '--glass-blur-base': '14px',
    '--glass-opacity-base': '0.2',
    // 焦点环样式
    '--focus-ring-opacity': '0.6',
    // Typography 系统
    '--font-size-base': '0.875rem',
    // Typography 文本样式 - 只覆盖不同的值
    '--font-body-size': '0.875rem',
    // Tooltip 样式
    '--tooltip-shadow-intensity': '0.15',
    '--tooltip-border-opacity': '0.25',
    // Intent 颜色
    '--color-destructive': '#FF4444',
    '--color-warning': '#FFB84D'
  },
  /**
   * dim 主题 - 莱茵生命暗色主题（黑客/隐身模式）
   * 只覆盖与默认主题不同的变量
   */
  dim: {
    // 颜色变量
    '--c-light': '#80FFEA',
    '--c-dark': '#001A15',
    '--c-glass': 'hsl(170 30% 10% / 0.8)',
    '--c-content': '#A6E22E',
    '--c-action': '#CCF728',
    '--c-bg': '#05080A',
    // Glass 反射参数
    '--glass-reflex-dark': '2',
    '--glass-reflex-light': '0.8',
    // 阴影系统
    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
    // Glass 物理参数
    '--glass-blur-base': '16px',
    '--glass-opacity-base': '0.25',
    // 圆角半径 - 保持圆润
    '--radius-base': '1.25rem',
    // 动画时长 - 更慢更柔和
    '--transition-fast': '250ms',
    '--transition-base': '400ms',
    '--transition-slow': '500ms',
    '--transition-hero': '800ms',
    // 焦点环样式
    '--focus-ring-opacity': '0.6',
    // 滚动条样式
    '--sb-thumb-opacity-idle': '0.15',
    '--sb-thumb-opacity-hover': '0.3',
    '--sb-thumb-opacity-active': '0.45',
    // Typography 系统
    '--font-size-base': '0.875rem',
    '--font-body-size': '0.875rem',
    // 过渡曲线 - 更柔和
    '--ease-base': 'cubic-bezier(0.3, 0, 0.2, 1)',
    '--ease-glass': 'cubic-bezier(0.8, 0.0, 0.3, 1)',
    // Tooltip 样式
    '--tooltip-shadow-intensity': '0.2',
    '--tooltip-border-opacity': '0.3',
    // Intent 颜色
    '--color-destructive': '#FF4444',
    '--color-warning': '#FFB84D'
  },
  /**
   * rhine-light 主题 - 莱茵生命风格亮色主题
   * 只覆盖与默认主题不同的变量
   */
  'rhine-light': {
    // 颜色变量
    '--c-glass': '#DEE4EA',
    '--c-light': '#FFFFFF',
    '--c-dark': '#0B0C0E',
    '--c-content': '#1D2129',
    '--c-action': '#88B00D',
    '--c-bg': '#F2F4F8',
    // Glass 反射参数
    '--glass-reflex-dark': '0.8',
    '--glass-reflex-light': '1.2',
    '--saturation': '110%',
    // 阴影系统
    '--shadow-color': 'rgba(11, 12, 14, 0.08)',
    // Glass 物理参数
    '--glass-blur-base': '10px',
    '--glass-opacity-base': '0.12',
    '--glass-reflex-strength': '1.2',
    // 圆角半径
    '--radius-base': '0.75rem',
    // 动画时长
    '--transition-fast': '150ms',
    '--transition-base': '250ms',
    '--transition-slow': '350ms',
    '--transition-hero': '600ms',
    // 焦点环样式
    '--focus-ring-width': '2px',
    '--focus-ring-opacity': '0.6',
    // 滚动条样式
    '--sb-thumb-opacity-idle': '0.1',
    '--sb-thumb-opacity-hover': '0.2',
    '--sb-thumb-opacity-active': '0.35',
    // 过渡曲线
    '--ease-base': 'cubic-bezier(0.5, 0, 0.1, 1)',
    '--ease-glass': 'cubic-bezier(1, 0.0, 0.3, 1)',
    // Tooltip 样式
    '--tooltip-shadow-intensity': '0.1',
    '--tooltip-border-opacity': '0.15'
  },
  /**
   * rhine-dark 主题 - 莱茵生命风格暗色主题
   * 只覆盖与默认主题不同的变量
   */
  'rhine-dark': {
    // 颜色变量
    '--c-glass': '#242830',
    '--c-light': '#FFFFFF',
    '--c-dark': '#000000',
    '--c-content': '#E6E8EB',
    '--c-action': '#CCF728',
    '--c-bg': '#14161A',
    // Glass 反射参数
    '--glass-reflex-dark': '1.5',
    '--glass-reflex-light': '0.5',
    '--saturation': '130%',
    // 阴影系统
    '--shadow-color': 'rgba(0, 0, 0, 0.4)',
    // Glass 物理参数
    '--glass-blur-base': '14px',
    '--glass-opacity-base': '0.2',
    '--glass-reflex-strength': '1.5',
    // 圆角半径
    '--radius-base': '0.875rem',
    // 动画时长
    '--transition-fast': '180ms',
    '--transition-base': '280ms',
    '--transition-slow': '380ms',
    '--transition-hero': '650ms',
    // 焦点环样式
    '--focus-ring-width': '2px',
    '--focus-ring-opacity': '0.7',
    // Typography 系统
    '--font-size-base': '0.875rem',
    '--font-body-size': '0.875rem',
    // 过渡曲线
    '--ease-base': 'cubic-bezier(0.5, 0, 0.1, 1)',
    '--ease-glass': 'cubic-bezier(1, 0.0, 0.3, 1)',
    // Tooltip 样式
    '--tooltip-shadow-intensity': '0.25',
    '--tooltip-border-opacity': '0.3',
    // Intent 颜色
    '--color-destructive': '#FF5555',
    '--color-warning': '#FFCC00'
  }
} as const;

/**
 * 主题变量映射
 * 通过合并部分主题定义与默认主题生成完整的主题变量映射
 * 
 * 使用方式：
 * - 定义新主题时，只需在 PARTIAL_THEMES 中添加需要覆盖的变量
 * - 未定义的变量会自动使用 DEFAULT_THEME 的值
 * - 运行时通过 [theme.ts](../popup/utils/theme.ts) 应用到 DOM
 */
export const THEME_VARS: Record<string, ThemeVariables> = {
  light: DEFAULT_THEME,
  dark: mergeTheme(DEFAULT_THEME, PARTIAL_THEMES.dark),
  dim: mergeTheme(DEFAULT_THEME, PARTIAL_THEMES.dim),
  'rhine-light': mergeTheme(DEFAULT_THEME, PARTIAL_THEMES['rhine-light']),
  'rhine-dark': mergeTheme(DEFAULT_THEME, PARTIAL_THEMES['rhine-dark']),
} as const;

/**
 * 主题类型定义
 */
export type ThemeName = keyof typeof THEME_VARS;

