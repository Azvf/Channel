/**
 * Color System
 * 颜色系统 - 颜色原始值定义
 * 
 * 此模块专注于颜色原始值的定义。
 * 主题变量映射请参考 `theme.ts` 模块。
 * 
 * 注意：所有颜色已转换为 OKLCH 格式，与 theme.ts 保持一致。
 */
export const COLORS = {
  glass: 'oklch(0.77 0.005 264)',      // OKLCH: 中性灰（略带蓝调）
  light: 'oklch(1 0 0)',                // OKLCH: 纯白
  dark: 'oklch(0 0 0)',                 // OKLCH: 纯黑
  content: 'oklch(0.15 0.05 264)',     // OKLCH: 深色文本（对应 #002244）
  action: 'oklch(0.55 0.22 264)',       // OKLCH: 蓝色动作色
  bg: 'oklch(0.93 0.003 264)',          // OKLCH: 浅灰背景
  destructive: 'oklch(0.45 0.25 12)',   // OKLCH: 红色警告
  warning: 'oklch(0.70 0.15 70)',       // OKLCH: 橙色警告
  
  // Rhine Lab Signature Colors (扩展配色)
  rhineLime: 'oklch(0.90 0.20 120)',    // OKLCH: 荧光绿：用于暗色模式高亮/核心数据
  rhineDark: 'oklch(0.65 0.15 100)',    // OKLCH: 苔原绿：用于亮色模式的主操作，确保可读性
  labBlue: 'oklch(0.85 0.15 200)',      // OKLCH: 全息蓝：用于次要数据/科技装饰
} as const;

