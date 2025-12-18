/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
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
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
      },
      zIndex: {
        'dropdown': 'var(--z-dropdown)',
        'dropdown-content': 'var(--z-dropdown-content)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal-content': 'var(--z-modal-content)',
        'tooltip': 'var(--z-tooltip)',
        'context-menu-backdrop': 'var(--z-context-menu-backdrop)',
        'context-menu-body': 'var(--z-context-menu-body)',
        'toast': 'var(--z-toast)',
      },
    },
  },
  plugins: [],
}

