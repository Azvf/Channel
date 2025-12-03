/**
 * Color Primitives
 * 原始色板定义
 * 
 * 这里的颜色不直接用于 UI，而是作为变量引用的源头。
 * 我们使用 "Slate" 色系作为中性色，它带有一点点蓝色的冷调，比纯灰更高级，
 * 非常适合数字原生代的"科技感"审美。
 */

export const PALETTE = {
  // 核心中性色 (Slate Scale)
  slate: {
    0:    '#FFFFFF',
    50:   '#F8FAFC',
    100:  '#F1F5F9',
    200:  '#E2E8F0',
    300:  '#CBD5E1',
    400:  '#94A3B8',
    500:  '#64748B',
    600:  '#475569',
    700:  '#334155',
    800:  '#1E293B',
    900:  '#0F172A',
    950:  '#020617',
  },

  // 品牌色 (Brand)
  blue: {
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#0052F5',
    700: '#1D4ED8',
  },

  // 功能色 (Functional)
  red: {
    500: '#EF4444',
    600: '#D0021B',
  },

  amber: {
    500: '#F59E0B',
  },

  // 特殊系列：莱茵生命 (Rhine Lab)
  rhine: {
    lime: '#CCF728',
    tundra: '#88B00D',
    holo: '#28F0FF',
  },
  
  // 纯黑白 (用于遮罩或极端对比)
  base: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  }
} as const;

// 保持原有导出结构的兼容性，但建议逐步迁移到语义化变量
export const COLORS = PALETTE;
