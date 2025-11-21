/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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

