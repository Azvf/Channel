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
  
  // Rhine Lab Signature Colors (扩展配色)
  rhineLime: '#CCF728',   // [Core] 荧光绿：用于暗色模式高亮/核心数据
  rhineDark: '#88B00D',   // [Core] 苔原绿：用于亮色模式的主操作，确保可读性
  labBlue: '#28F0FF',     // [Sub] 全息蓝：用于次要数据/科技装饰
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
  dim: { // 莱茵生命暗色主题（黑客/隐身模式）
    '--c-light': '#80FFEA',        // 青色文字
    '--c-dark': '#001A15',
    '--c-glass': 'hsl(170 30% 10% / 0.8)',
    '--c-content': '#A6E22E',      // 全屏终端绿
    '--c-action': '#CCF728',      // 荧光莱茵绿
    '--c-bg': '#05080A',           // 接近纯黑
    '--glass-reflex-dark': '2',
    '--glass-reflex-light': '0.8',
    '--saturation': '150%'
  },
  // Rhine Lab Themes - 莱茵生命风格主题
  'rhine-light': {
    '--c-glass': '#DEE4EA',        // 较深一点的冷灰，增加玻璃厚度感
    '--c-light': '#FFFFFF',
    '--c-dark': '#0B0C0E',
    '--c-content': '#1D2129',      // 极其理性的深灰文字
    '--c-action': '#88B00D',       // Light模式：使用较深的苔原绿，确保白色背景上的对比度
    '--c-bg': '#F2F4F8',           // 模拟无菌室墙面
    '--glass-reflex-dark': '0.8',  // 增强暗部边缘刻画
    '--glass-reflex-light': '1.2', // 强反光，模拟硬质玻璃/亚克力
    '--saturation': '110%'         // 稍微降低饱和度，除了核心绿色
  },
  'rhine-dark': {
    '--c-glass': '#242830',        // 深空载体
    '--c-light': '#FFFFFF',
    '--c-dark': '#000000',
    '--c-content': '#E6E8EB',      // 冷白文字
    '--c-action': '#CCF728',       // Dark模式：火力全开的荧光莱茵绿
    '--c-bg': '#14161A',           // 深蓝灰背景 (Tactical Grey)
    '--glass-reflex-dark': '1.5',  // 强烈的暗部对比
    '--glass-reflex-light': '0.5', // 锐利的高光
    '--saturation': '130%'         // 荧光色需要高饱和
  }
} as const;

