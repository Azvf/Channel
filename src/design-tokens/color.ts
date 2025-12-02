/**
 * Color System
 * 颜色系统 - 颜色原始值定义
 * 
 * 此模块专注于颜色原始值的定义。
 * 主题变量映射请参考 `theme.ts` 模块。
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
  
  // Rhine Lab Signature Colors (扩展配色)
  rhineLime: '#CCF728',   // [Core] 荧光绿：用于暗色模式高亮/核心数据
  rhineDark: '#88B00D',   // [Core] 苔原绿：用于亮色模式的主操作，确保可读性
  labBlue: '#28F0FF',     // [Sub] 全息蓝：用于次要数据/科技装饰
} as const;

