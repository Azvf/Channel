// src/popup/theme-loader.ts
//
// 这是一个在 React 加载前同步执行的脚本，用于防止主题闪烁。
// 它必须非常快，并且只依赖 localStorage。
//
// 架构说明：
// - 此文件与 [theme.ts](../design-tokens/theme.ts) 保持同步
// - 由于不能导入 TypeScript 模块，需要独立实现合并逻辑
// - 使用部分覆盖机制：只需定义需要覆盖的变量，未定义的变量自动使用默认值
//
// 参考: [theme.ts](../design-tokens/theme.ts)

(function() {
  /**
   * 合并主题函数
   * 将部分主题定义与默认主题合并，生成完整的主题变量映射
   */
  function mergeTheme(
    defaultTheme: Record<string, string>,
    partialTheme: Record<string, string>
  ): Record<string, string> {
    return { ...defaultTheme, ...partialTheme };
  }
  
  try {
    // 1. 立即读取同步的 localStorage
    const theme = localStorage.getItem('theme') || 'light';
    
    /**
     * 默认主题（light）
     * 包含所有主题变量的完整定义，作为其他主题的 fallback
     * 
     * 注意：此定义必须与 [theme.ts](../design-tokens/theme.ts) 中的 DEFAULT_THEME 保持一致
     */
    const defaultTheme: Record<string, string> = {
        '--c-glass': '#bbbbbc',
        '--c-light': '#fff',
        '--c-dark': '#000',
        '--c-content': '#224',
        '--c-action': '#0052f5',
        '--c-bg': '#E8E8E9',
        '--glass-reflex-dark': '1',
        '--glass-reflex-light': '1',
        '--saturation': '150%',
        '--font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        '--shadow-color': 'rgba(0, 0, 0, 0.1)',
        '--glass-blur-base': '12px',
        '--glass-blur-decay': '2px',
        '--glass-opacity-base': '0.15',
        '--glass-opacity-increment': '0.05',
        '--glass-reflex-strength': '1',
        '--radius-base': '1.0rem',
        '--transition-fast': '200ms',
        '--transition-base': '300ms',
        '--transition-slow': '400ms',
        '--transition-hero': '700ms',
        '--focus-ring-width': '3px',
        '--focus-ring-color': 'var(--c-action)',
        '--focus-ring-opacity': '0.5',
        '--sb-thumb-opacity-idle': '0.12',
        '--sb-thumb-opacity-hover': '0.25',
        '--sb-thumb-opacity-active': '0.4',
        '--border-width-base': '1px',
        '--border-width-thick': '2px',
        '--font-size-base': '0.85rem',
        '--font-weight-base': '400',
        '--font-weight-bold': '600',
        '--font-page-title-weight': '600',
        '--font-page-title-size': '1.1rem',
        '--font-page-title-line-height': '1.35',
        '--font-page-title-letter-spacing': '-0.015em',
        '--font-header-title-weight': '700',
        '--font-header-title-size': '1rem',
        '--font-header-title-line-height': '1.35',
        '--font-header-title-letter-spacing': '-0.02em',
        '--font-section-title-weight': '600',
        '--font-section-title-size': '0.75rem',
        '--font-section-title-line-height': '1.4',
        '--font-section-title-letter-spacing': '0.05em',
        '--font-body-weight': '400',
        '--font-body-size': '0.85rem',
        '--font-body-line-height': '1.4',
        '--font-body-letter-spacing': '0.01em',
        '--font-list-item-weight': '500',
        '--font-list-item-size': '0.9rem',
        '--font-list-item-line-height': '1.4',
        '--font-list-item-letter-spacing': 'normal',
        '--font-caption-weight': '400',
        '--font-caption-size': '0.8rem',
        '--font-caption-line-height': '1.4',
        '--font-caption-letter-spacing': '0.005em',
        '--font-footnote-weight': '400',
        '--font-footnote-size': '0.75rem',
        '--font-footnote-line-height': '1.4',
        '--font-footnote-letter-spacing': '0.01em',
        '--font-label-weight': '600',
        '--font-label-size': '0.7rem',
        '--font-label-line-height': '1.4',
        '--font-label-letter-spacing': '0.02em',
        '--font-tag-weight': '500',
        '--font-tag-size': '0.75rem',
        '--font-tag-line-height': '1.4',
        '--font-tag-letter-spacing': '0.01em',
        '--font-module-title-weight': '500',
        '--font-module-title-size': '0.7rem',
        '--font-module-title-line-height': '1.4',
        '--font-module-title-letter-spacing': '0.05em',
        '--font-micro-weight': '500',
        '--font-micro-size': '0.6rem',
        '--font-micro-line-height': '1',
        '--font-micro-letter-spacing': '0',
        '--font-small-weight': '400',
        '--font-small-size': '0.7rem',
        '--font-small-line-height': '1.4',
        '--font-small-letter-spacing': '0',
        '--ease-base': 'cubic-bezier(0.4, 0, 0.2, 1)',
        '--ease-glass': 'cubic-bezier(1, 0.0, 0.4, 1)',
        '--tooltip-shadow-intensity': '0.12',
        '--tooltip-border-opacity': '0.2',
        '--color-destructive': '#D0021B',
        '--color-warning': '#F5A623'
    };
    
    /**
     * 部分主题定义
     * 只定义需要覆盖的变量，未定义的变量将自动使用 defaultTheme 的值
     * 
     * 注意：此定义必须与 [theme.ts](../design-tokens/theme.ts) 中的 PARTIAL_THEMES 保持一致
     */
    const partialThemes: Record<string, Record<string, string>> = {
      light: {},
      
      dark: {
        // 颜色变量 - 只覆盖不同的颜色
        '--c-content': '#e1e1e1',
        '--c-action': '#03d5ff',
        '--c-bg': '#1b1b1d',
        // Glass 反射参数
        '--glass-reflex-dark': '2',
        '--glass-reflex-light': '0.3',
        // 阴影系统
        '--shadow-color': 'rgba(0, 0, 0, 0.3)',
        // Glass 物理参数
        '--glass-blur-base': '14px',
        '--glass-opacity-base': '0.2',
        // 焦点环样式
        '--focus-ring-opacity': '0.6',
        // Typography 系统
        '--font-size-base': '0.875rem',
        '--font-body-size': '0.875rem',
        // Tooltip 样式
        '--tooltip-shadow-intensity': '0.15',
        '--tooltip-border-opacity': '0.25',
        // Intent 颜色
        '--color-destructive': '#FF4444',
        '--color-warning': '#FFB84D'
      },
      dim: {
        // 颜色变量
        '--c-light': '#80FFEA',
        '--c-dark': '#001A15',
        '--c-glass': 'hsl(170 30% 10% / 0.8)',
        '--c-content': '#A6E22E',
        '--c-action': '#CCF728',
        '--c-bg': '#05080A',
        // Glass 反射参数
        '--glass-reflex-dark': '2',
        '--glass-reflex-light': '0.8',
        // 阴影系统
        '--shadow-color': 'rgba(0, 0, 0, 0.3)',
        // Glass 物理参数
        '--glass-blur-base': '16px',
        '--glass-opacity-base': '0.25',
        // 圆角半径
        '--radius-base': '1.25rem',
        // 动画时长
        '--transition-fast': '250ms',
        '--transition-base': '400ms',
        '--transition-slow': '500ms',
        '--transition-hero': '800ms',
        // 焦点环样式
        '--focus-ring-opacity': '0.6',
        // 滚动条样式
        '--sb-thumb-opacity-idle': '0.15',
        '--sb-thumb-opacity-hover': '0.3',
        '--sb-thumb-opacity-active': '0.45',
        // Typography 系统
        '--font-size-base': '0.875rem',
        '--font-body-size': '0.875rem',
        // 过渡曲线
        '--ease-base': 'cubic-bezier(0.3, 0, 0.2, 1)',
        '--ease-glass': 'cubic-bezier(0.8, 0.0, 0.3, 1)',
        // Tooltip 样式
        '--tooltip-shadow-intensity': '0.2',
        '--tooltip-border-opacity': '0.3',
        // Intent 颜色
        '--color-destructive': '#FF4444',
        '--color-warning': '#FFB84D'
      },
      'rhine-light': {
        // 颜色变量
        '--c-glass': '#DEE4EA',
        '--c-light': '#FFFFFF',
        '--c-dark': '#0B0C0E',
        '--c-content': '#1D2129',
        '--c-action': '#88B00D',
        '--c-bg': '#F2F4F8',
        // Glass 反射参数
        '--glass-reflex-dark': '0.8',
        '--glass-reflex-light': '1.2',
        '--saturation': '110%',
        // 阴影系统
        '--shadow-color': 'rgba(11, 12, 14, 0.08)',
        // Glass 物理参数
        '--glass-blur-base': '10px',
        '--glass-opacity-base': '0.12',
        '--glass-reflex-strength': '1.2',
        // 圆角半径
        '--radius-base': '0.75rem',
        // 动画时长
        '--transition-fast': '150ms',
        '--transition-base': '250ms',
        '--transition-slow': '350ms',
        '--transition-hero': '600ms',
        // 焦点环样式
        '--focus-ring-width': '2px',
        '--focus-ring-opacity': '0.6',
        // 滚动条样式
        '--sb-thumb-opacity-idle': '0.1',
        '--sb-thumb-opacity-hover': '0.2',
        '--sb-thumb-opacity-active': '0.35',
        // 过渡曲线
        '--ease-base': 'cubic-bezier(0.5, 0, 0.1, 1)',
        '--ease-glass': 'cubic-bezier(1, 0.0, 0.3, 1)',
        // Tooltip 样式
        '--tooltip-shadow-intensity': '0.1',
        '--tooltip-border-opacity': '0.15'
      },
      'rhine-dark': {
        // 颜色变量
        '--c-glass': '#242830',
        '--c-light': '#FFFFFF',
        '--c-dark': '#000000',
        '--c-content': '#E6E8EB',
        '--c-action': '#CCF728',
        '--c-bg': '#14161A',
        // Glass 反射参数
        '--glass-reflex-dark': '1.5',
        '--glass-reflex-light': '0.5',
        '--saturation': '130%',
        // 阴影系统
        '--shadow-color': 'rgba(0, 0, 0, 0.4)',
        // Glass 物理参数
        '--glass-blur-base': '14px',
        '--glass-opacity-base': '0.2',
        '--glass-reflex-strength': '1.5',
        // 圆角半径
        '--radius-base': '0.875rem',
        // 动画时长
        '--transition-fast': '180ms',
        '--transition-base': '280ms',
        '--transition-slow': '380ms',
        '--transition-hero': '650ms',
        // 焦点环样式
        '--focus-ring-width': '2px',
        '--focus-ring-opacity': '0.7',
        // Typography 系统
        '--font-size-base': '0.875rem',
        '--font-body-size': '0.875rem',
        // 过渡曲线
        '--ease-base': 'cubic-bezier(0.5, 0, 0.1, 1)',
        '--ease-glass': 'cubic-bezier(1, 0.0, 0.3, 1)',
        // Tooltip 样式
        '--tooltip-shadow-intensity': '0.25',
        '--tooltip-border-opacity': '0.3',
        // Intent 颜色
        '--color-destructive': '#FF5555',
        '--color-warning': '#FFCC00'
      }
    };
    
    /**
     * 生成完整的主题变量映射
     * 通过合并部分主题定义与默认主题生成
     */
    const themeVars: Record<string, Record<string, string>> = {
      light: defaultTheme,
      dark: mergeTheme(defaultTheme, partialThemes.dark),
      dim: mergeTheme(defaultTheme, partialThemes.dim),
      'rhine-light': mergeTheme(defaultTheme, partialThemes['rhine-light']),
      'rhine-dark': mergeTheme(defaultTheme, partialThemes['rhine-dark']),
    };
    
    const vars = themeVars[theme] || themeVars.light;
    
    // 3. 在 <head> 中注入 <style> 标签，为 :root 设置变量
    const rootStyle = document.createElement('style');
    rootStyle.id = 'theme-inline-root';
    let rootCss = ':root{';
    for (const [key, value] of Object.entries(vars)) {
      rootCss += `${key}:${value}!important;`;
    }
    rootCss += '}';
    rootStyle.textContent = rootCss;
    document.head.appendChild(rootStyle);
    
    // 4. 定义一个函数，用于在 <body> 出现时立即应用样式
    const applyToBody = () => {
      if (document.body) {
        // 禁用过渡，防止闪烁
        document.body.setAttribute('data-theme-no-transition', 'true');
        document.body.style.setProperty('transition', 'none', 'important');
        
        // 应用 CSS 变量
        for (const [key, value] of Object.entries(vars)) {
          document.body.style.setProperty(key, value, 'important');
        }
        
        // 为 CSS :has() 选择器创建隐藏的 input
        const existingInputs = document.body.querySelectorAll('input[name="theme-persist"]');
        existingInputs.forEach(input => input.remove());
        
        const themeInput = document.createElement('input');
        themeInput.type = 'radio';
        themeInput.name = 'theme-persist';
        themeInput.value = theme;
        themeInput.checked = true;
        themeInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;';
        document.body.appendChild(themeInput);
        
        return true;
      }
      return false;
    };

    // 5. 使用 MutationObserver 监视 <body> 的出现
    if (!applyToBody()) {
      const observer = new MutationObserver((_mutations, obs) => {
        if (document.body && applyToBody()) {
          obs.disconnect();
        }
      });
      
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      // 备用方案，以防万一
      document.addEventListener('DOMContentLoaded', () => {
        applyToBody();
        observer.disconnect();
      });

      // 超时清理（安全措施）
      setTimeout(() => {
        observer.disconnect();
        applyToBody(); // 最后尝试一次
      }, 100);
    }
    
  } catch (e) {
    // 静默失败，避免破坏 popup
    console.warn('Theme loader script failed', e);
  }
})();

