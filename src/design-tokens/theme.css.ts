/**
 * Theme CSS Generator (Vanilla Extract)
 * 
 * 构建时 CSS 生成逻辑
 * 从 THEME_VARS 自动生成所有主题的 CSS 变量定义
 * 
 * 关键特性：
 * - Zero-Runtime: 所有样式在构建时预计算
 * - SSOT: theme.ts 是唯一数据源
 * - Tailwind 兼容: 精确控制 CSS 变量命名，保持语义化变量格式
 */

import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';
import { THEME_VARS } from './theme';

/**
 * 1. 定义变量契约 (Contract)
 * 
 * 关键点：使用 mapper 保持变量名与当前系统完全一致。
 * Vanilla Extract 默认会哈希变量名，但我们需要保留语义化变量格式
 * 以便 Tailwind 配置无需修改即可继续工作。
 * 
 * mapper 函数处理逻辑：
 * - path[0] 是 key，例如 "--bg-page"
 * - VE 会自动添加 "--" 前缀，所以我们移除原始 key 中的前缀以避免 "--" 重复
 */
const vars = createGlobalThemeContract(THEME_VARS.light, (_value, path) => {
  // path[0] 是 key，例如 "--bg-page"
  // VE 会自动添加 "--" 前缀，所以我们移除原始 key 中的前缀以避免 "--" 重复
  const key = path[0];
  return key.replace(/^--/, '');
});

/**
 * 2. 生成全局主题 CSS
 * 
 * 遍历 THEME_VARS 自动生成所有主题的 CSS 变量定义。
 * 
 * 策略：
 * - light 主题 -> 挂载到 :root (作为默认兜底)
 * - 其他主题  -> 挂载到 [data-theme="themeName"]
 */
Object.entries(THEME_VARS).forEach(([themeName, themeTokens]) => {
  const selector = themeName === 'light' 
    ? ':root' 
    : `[data-theme="${themeName}"]`;

  createGlobalTheme(selector, vars, themeTokens);
});

// 导出 vars 供可能的 TS 引用 (虽然你的架构主要用 Tailwind，但保留这个接口很好)
export { vars };

