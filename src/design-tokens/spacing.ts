/**
 * Spacing Scale - Hybrid 8pt/4px Grid
 * 核心原则：主要间距使用 8pt Grid（8px 的倍数），小部件微调使用 4px Grid
 * 
 * 设计哲学：
 * - 8pt Grid 产生潜意识的秩序感（Visual Harmony），适合"极简"风格
 * - 4px Grid 用于小部件的精细调整（如 Tag 内边距、图标与文本间距）
 * 
 * 记忆口诀：
 * - 1 (4px): 小部件微调
 * - 2 (8px): 最小主间距
 * - 4 (16px): 标准内边距
 * - 6 (24px): 模块分割
 * - 8 (32px): 大模块留白
 * - 16 (64px): 版式留白
 */

export const SPACING = {
  // 微观间距 (Micro) - 4px Grid，用于小部件微调
  '0.5': { rem: 0.125, px: 2,  description: '微调/边框内偏移' },
  '1':   { rem: 0.25,  px: 4,  description: '小部件微调 (Tag内边距、图标与文本)' },
  
  // 宏观间距 (Macro) - 严格遵循 8pt Grid (8px 的倍数)
  '2':   { rem: 0.5,   px: 8,  description: '[8pt基准] 最小主间距 (Button sm内边距)' },
  '4':   { rem: 1,     px: 16, description: '[8pt×2] 标准内边距 (Card/Input)' },
  '6':   { rem: 1.5,   px: 24, description: '[8pt×3] 模块分割 (Gap)' },
  '8':   { rem: 2,     px: 32, description: '[8pt×4] 大模块留白 (Section Padding)' },
  '10':  { rem: 2.5,   px: 40, description: '[8pt×5] 视觉分割' },
  '12':  { rem: 3,     px: 48, description: '[8pt×6] 极大留白' },
  '16':  { rem: 4,     px: 64, description: '[8pt×8] 版式留白 (Hero Section)' },
  '20':  { rem: 5,     px: 80, description: '[8pt×10] 页面底部留白' },
} as const;
