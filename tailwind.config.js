/** @type {import('tailwindcss').Config} */
import { TYPOGRAPHY } from './src/design-tokens/typography';

// 辅助函数：将 Token 转换为 Tailwind 格式
function extractFontStyles(styles) {
  const result = {};
  Object.keys(styles).forEach(key => {
    const token = styles[key];
    // Tailwind fontSize 格式: [fontSize, { lineHeight, letterSpacing, fontWeight }]
    result[key] = [
      `${token.size.rem}rem`,
      {
        lineHeight: token.lineHeight.toString(),
        letterSpacing: `${token.letterSpacing.em}em`,
        fontWeight: token.weight.toString(),
      }
    ];
  });
  return result;
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: TYPOGRAPHY.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, '')),
      },
      // 🔥 核心重构：使用语义化命名替代 text-xs/sm/lg
      // Class 用法: text-heading1, text-body, text-caption
      fontSize: extractFontStyles(TYPOGRAPHY.styles),
      
      // 🔥 语义化颜色系统：新的深度感知颜色映射
      colors: {
        // 背景层级
        'bg-page': 'var(--bg-page)',
        'bg-surface': 'var(--bg-surface)',
        'bg-overlay': 'var(--bg-overlay)',
        
        // 文本层级
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-on-action': 'var(--text-on-action)',
        
        // 边框
        'border-subtle': 'var(--border-subtle)',
        'border-focus': 'var(--border-focus)',
        
        // 空状态
        'empty-state': {
          stroke: 'var(--empty-state-stroke)',
          fill: 'var(--empty-state-fill)',
        },
        
        // 交互色
        'action': {
          DEFAULT: 'var(--color-action)',
          hover: 'var(--color-action-hover)',
        },
        
        // 功能色
        'destructive': 'var(--color-destructive)',
        'warning': 'var(--color-warning)',
        
        // 玻璃专题
        'glass': {
          border: 'var(--glass-border)',
        },
        
        // 向后兼容：保留旧变量名映射
        'c-bg': 'var(--c-bg)',
        'c-content': 'var(--c-content)',
        'c-action': 'var(--c-action)',
        'c-glass': 'var(--c-glass)',
      },
      
      // 🔥 阴影系统：主题感知的语义化阴影
      // 注意：阴影类型由主题模式决定（Light = 物理投影，Dark = 光晕效果）
      // 使用统一的语义名称，在不同主题下自动映射到对应的物理效果
      boxShadow: {
        // 语义化阴影（主题感知）
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'float': 'var(--shadow-float)',
        // 内发光（通用，不依赖主题）
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'inner-glow': 'inset 0 0 20px -10px var(--color-action)',
      },
      
      // 🔥 核心修复：将 Tailwind 的类名映射到 CSS 变量
      borderRadius: {
        'none': '0',
        'xs': 'var(--radius-xs)',   // rounded-xs -> 8px
        'sm': 'var(--radius-sm)',   // rounded-sm -> 12px
        DEFAULT: 'var(--radius-md)', // rounded    -> 16px (默认)
        'md': 'var(--radius-md)',   // rounded-md -> 16px
        'lg': 'var(--radius-lg)',   // rounded-lg -> 24px
        'xl': 'var(--radius-xl)',   // rounded-xl -> 32px
        '2xl': 'var(--radius-2xl)', // rounded-2xl-> 40px
        '3xl': 'var(--radius-3xl)', // rounded-3xl-> 48px
        'full': 'var(--radius-full)', // rounded-full -> Pill
      },
    },
  },
  plugins: [],
}

