/**
 * Spacing Scale - Strict 4px Grid
 * 核心原则：所有的空间都必须是 4 的倍数。
 * 
 * 记忆口诀：
 * - 4 (16px): 默认间距
 * - 8 (32px): 模块间距
 * - 16 (64px): 区块间距
 */

export const SPACING = {
  // 微观间距 (Micro)
  '0.5': { rem: 0.125, px: 2,  description: '微调/边框内偏移' },
  '1':   { rem: 0.25,  px: 4,  description: '紧凑间距 (Tag内边距)' },
  '1.5': { rem: 0.375, px: 6,  description: '图标与文本' },
  '2':   { rem: 0.5,   px: 8,  description: '小组件内边距 (Button sm)' },
  '2.5': { rem: 0.625, px: 10, description: '视觉校正间距' },
  '3':   { rem: 0.75,  px: 12, description: '列表项间距' },
  
  // 宏观间距 (Macro) - 严格遵循 4px 倍率
  '4':   { rem: 1,     px: 16, description: '[基准] 标准内边距 (Card/Input)' },
  '5':   { rem: 1.25,  px: 20, description: '舒适的段落间距' },
  '6':   { rem: 1.5,   px: 24, description: '模块分割 (Gap)' },
  '8':   { rem: 2,     px: 32, description: '大模块留白 (Section Padding)' },
  '10':  { rem: 2.5,   px: 40, description: '视觉分割' },
  '12':  { rem: 3,     px: 48, description: '极大留白' },
  '16':  { rem: 4,     px: 64, description: '版式留白 (Hero Section)' },
  '20':  { rem: 5,     px: 80, description: '页面底部留白' },
} as const;
