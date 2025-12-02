/**
 * 主题工具函数
 * 用于在 html 元素上应用主题，使用 data-theme 属性进行主题检测
 * 
 * 架构说明：
 * - CSS 变量由 Vanilla Extract 在构建时生成（theme.css.ts）
 * - 运行时只需设置 data-theme 属性，CSS 选择器会自动匹配
 * - 极其高效：只需修改属性，浏览器合成线程会自动处理变量切换
 */

import { storageService, STORAGE_KEYS } from '../../services/storageService';

/**
 * 应用主题到 body
 * 
 * 极其高效：只需修改属性，浏览器合成线程会自动处理变量切换
 * 
 * @param themeValue - 主题名称
 * @param disableTransition - 是否禁用过渡效果（用于初始加载）
 */
export function applyThemeToBody(themeValue: string, disableTransition: boolean = false): void {
  const body = document.body;
  if (!body) return;
  
  // 控制过渡效果
  if (disableTransition) {
    body.setAttribute('data-theme-no-transition', 'true');
    body.style.setProperty('transition', 'none', 'important');
  } else {
    body.removeAttribute('data-theme-no-transition');
    body.style.removeProperty('transition');
  }
  
  // 使用 data-theme 属性进行主题检测
  // CSS 选择器 [data-theme="..."] 会立即匹配并应用对应的 CSS 变量
  document.documentElement.setAttribute('data-theme', themeValue);
}

/**
 * 从存储服务读取主题并应用到 body
 */
export async function applySavedTheme(): Promise<void> {
  const savedTheme = (await storageService.get<string>(STORAGE_KEYS.THEME)) || 'light';
  applyThemeToBody(savedTheme);
  
  // 持久化到 localStorage（用于 theme-loader.ts 同步读取）
  localStorage.setItem('theme', savedTheme);
}
