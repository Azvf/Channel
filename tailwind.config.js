/** @type {import('tailwindcss').Config} */
import { TYPOGRAPHY } from './src/design-tokens/typography';
import { SHADOWS } from './src/design-tokens/shadow';

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
      
      // 🔥 阴影系统：环境光与物理投影
      boxShadow: {
        // 物理投影 (Light Mode)
        'sm': SHADOWS.sm,
        'md': SHADOWS.md,
        'lg': SHADOWS.lg,
        // 悬浮状态
        'float': SHADOWS.float,
        // 光晕系统 (Dark/Cyber Mode)
        'glow-sm': SHADOWS['glow-sm'],
        'glow-md': SHADOWS['glow-md'],
        'glow-lg': SHADOWS['glow-lg'],
        // 内发光
        'inner-light': SHADOWS['inner-light'],
        'inner-glow': SHADOWS['inner-glow'],
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

