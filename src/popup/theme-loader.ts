// src/popup/theme-loader.ts
//
// 这是一个在 React 加载前同步执行的脚本，用于防止主题闪烁。
// 它必须非常快，并且只依赖 localStorage。

(function() {
  try {
    // 1. 立即读取同步的 localStorage
    const theme = localStorage.getItem('theme') || 'light';
    
    // 2. 定义主题变量
    // 注意：主题变量定义已统一到 src/design-tokens/color.ts 的 THEME_VARS
    // 但此处保留硬编码，因为此脚本在 React 加载前同步执行，不能导入 TypeScript 模块
    // 如需修改主题变量，请同时更新 src/design-tokens/color.ts
    const themeVars: Record<string, Record<string, string>> = {
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
      dark: {
        '--c-glass': '#bbbbbc',
        '--c-light': '#fff',
        '--c-dark': '#000',
        '--c-content': '#e1e1e1',
        '--c-action': '#03d5ff',
        '--c-bg': '#1b1b1d',
        '--glass-reflex-dark': '2',
        '--glass-reflex-light': '0.3',
        '--saturation': '150%'
      },
      dim: {
        '--c-light': '#99deff',
        '--c-dark': '#20001b',
        '--c-glass': 'hsl(335 250% 74% / 1)',
        '--c-content': '#d5dbe2',
        '--c-action': '#ff48a9',
        '--c-bg': '#152433',
        '--glass-reflex-dark': '2',
        '--glass-reflex-light': '0.7',
        '--saturation': '200%'
      }
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

