/**
 * 主题工具函数
 * 用于在 html 元素上应用主题，使用 data-theme 属性进行主题检测
 */

import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { THEME_VARS } from '../../design-tokens/theme';

export function applyThemeToBody(themeValue: string, disableTransition: boolean = false): void {
  const body = document.body;
  if (!body) return;
  
  const vars = THEME_VARS[themeValue as keyof typeof THEME_VARS] || THEME_VARS.light;
  
  // 更新 :root 样式（如果 HTML 脚本已创建）
  let rootStyle = document.getElementById('theme-inline-root') as HTMLStyleElement;
  if (rootStyle) {
    let rootCss = ':root{';
    for (const [key, value] of Object.entries(vars)) {
      rootCss += key + ':' + value + '!important;';
    }
    rootCss += '}';
    rootStyle.textContent = rootCss;
  }
  
  // 控制过渡效果
  if (disableTransition) {
    body.setAttribute('data-theme-no-transition', 'true');
    body.style.setProperty('transition', 'none', 'important');
  } else {
    body.removeAttribute('data-theme-no-transition');
    body.style.removeProperty('transition');
  }
  
  // 设置 CSS 变量到 body
  for (const [key, value] of Object.entries(vars)) {
    body.style.setProperty(key, value, 'important');
  }
  
  // 使用 data-theme 属性进行主题检测（替代 :has() hack）
  document.documentElement.setAttribute('data-theme', themeValue);
}

/**
 * 从存储服务读取主题并应用到 body
 */
export async function applySavedTheme(): Promise<void> {
  const savedTheme = (await storageService.get<string>(STORAGE_KEYS.THEME)) || 'light';
  applyThemeToBody(savedTheme);
}

