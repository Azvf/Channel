/**
 * Shadow & Glow System
 * 核心原则：
 * - Light Mode: 使用物理投影 (Drop Shadow) 表现高度。
 * - Dark Mode: 使用环境光晕 (Glow) 表现能量。
 */

export const SHADOWS = {
  // --- 物理投影 (用于 Light Mode) ---
  sm: '0 1px 2px 0 var(--shadow-color)',
  md: '0 4px 6px -1px var(--shadow-color)',
  lg: '0 10px 15px -3px var(--shadow-color)',
  
  // --- 悬浮状态 (Elevation) ---
  // 当卡片浮起时，阴影更扩散，且带有轻微的垂直位移
  float: '0 20px 25px -5px var(--shadow-color), 0 8px 10px -6px var(--shadow-color)',
  
  // --- 核心：光晕系统 (Glow System for Dark/Cyber Mode) ---
  // 使用 Brand Color 产生漫反射，制造"屏幕在发光"的错觉
  
  // [Glow Sm] 用于按钮或聚焦态
  // 效果：一圈紧致的光晕
  'glow-sm': '0 0 8px -2px var(--color-action), 0 0 4px -2px var(--color-action)',
  
  // [Glow Md] 用于选中状态的卡片
  // 效果：柔和的背光
  'glow-md': '0 0 16px -4px var(--color-action), 0 0 8px -4px var(--color-action)',
  
  // [Glow Lg] 用于强强调 (Hero Elements)
  // 效果：强烈的能量场
  'glow-lg': '0 0 32px -8px var(--color-action), 0 0 16px -8px var(--color-action)',
  
  // --- 内发光 (Inner Light) ---
  // 用于玻璃边缘的高光，增加厚度感
  'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
  'inner-glow': 'inset 0 0 20px -10px var(--color-action)',
} as const;
