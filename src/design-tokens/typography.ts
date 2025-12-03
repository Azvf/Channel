/**
 * Typography System
 * 核心原则：清晰的层级、完美的阅读韵律、无障碍友好
 */

export const TYPOGRAPHY = {
  // 保持系统字体栈，这是性能最好且最"原生"的选择
  fontFamily: 
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',

  styles: {
    // [H1] 页面主标题 - 用于强引导
    // 特点：紧凑的字间距 (Tight tracking) 让大号字体更精致
    heading1: {
      weight: 600,
      size: { rem: 1.5, px: 24 }, // 从 17.6px 提升到 24px，确立绝对视觉中心
      lineHeight: 1.2,
      letterSpacing: { em: -0.02 },
      description: '页面主标题',
    },
    
    // [H2] 模块/卡片标题
    heading2: {
      weight: 600,
      size: { rem: 1.125, px: 18 }, // 18px，清晰的段落区分
      lineHeight: 1.3,
      letterSpacing: { em: -0.01 },
      description: '模块标题',
    },
    
    // [H3] 小标题 / 强调项
    heading3: {
      weight: 500,
      size: { rem: 1, px: 16 }, // 16px
      lineHeight: 1.4,
      letterSpacing: { em: -0.005 },
      description: '小标题',
    },
    // [Body] 正文 - 阅读的核心
    // 提升到 14px，行高增至 1.5，提供舒适的阅读流
    body: {
      weight: 400,
      size: { rem: 0.875, px: 14 }, // 从 13.6px 提升至 standard 14px
      lineHeight: 1.5, 
      letterSpacing: { em: 0 },
      description: '正文内容',
    },
    // [Caption] 辅助信息 / 列表次要信息
    caption: {
      weight: 400,
      size: { rem: 0.75, px: 12 }, // 12px 是可读性的底线
      lineHeight: 1.4,
      letterSpacing: { em: 0.01 }, // 小字号稍微增加字间距提高易读性
      description: '辅助说明',
    },
    // [Tag/Label] 紧凑的界面元素
    label: {
      weight: 500,
      size: { rem: 0.75, px: 12 },
      lineHeight: 1, // 标签通常不需要行间距
      letterSpacing: { em: 0.02 }, // 增加字间距增加精致感 (类似大写字母处理)
      description: '标签/按钮文字',
    },
    // [Micro] 极小文字 - ⚠️ 严格限制：仅用于装饰性元素
    // 
    // 🚫 严禁用于任何可读文字内容
    // ✅ 允许用途：图表刻度、图标标签、装饰性角标、非关键视觉元素
    // 
    // 设计原则：如果空间不足，不要缩小字号，而是使用：
    // - 图标替代文字
    // - 截断（Truncation）
    // - 交互式显示（长按/悬停显示完整信息）
    // 
    // 最小可读字号：12px (caption) - 这是所有文字类内容的最低标准
    micro: {
      weight: 500,
      size: { rem: 0.625, px: 10 },
      lineHeight: 1,
      letterSpacing: { em: 0.02 },
      description: '⚠️ 仅用于装饰性元素（图表刻度、图标标签），严禁用于可读文字',
    },
  },
} as const;
