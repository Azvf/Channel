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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
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

