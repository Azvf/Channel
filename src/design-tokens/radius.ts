/**
 * Radius Scale - Liquid Conformality
 * 圆角系统，流动一致性设计
 */

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

