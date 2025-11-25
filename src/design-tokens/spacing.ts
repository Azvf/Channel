/**
 * Spacing Scale - 4px Grid System
 * 间距系统，基于 4px 网格
 */

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

