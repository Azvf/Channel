/**
 * Design Tokens Utilities
 * 设计 Token 工具函数
 */

/**
 * Helper: 生成 CSS 变量名
 * @param category - 类别名（如 'space', 'radius'）
 * @param key - 键名（如 '2', 'md'）
 * @returns CSS 变量名，如 '--space-2', '--radius-md'
 */
export function getCssVarName(category: string, key: string): string {
  return `--${category}-${key}`;
}

/**
 * Helper: 生成 CSS 变量值
 * @param token - Token 值对象
 * @returns CSS 变量值字符串
 */
export function getCssVarValue(token: any): string {
  if (typeof token === 'object' && token !== null) {
    if ('rem' in token) return `${token.rem}rem`;
    if ('px' in token) return `${token.px}px`;
    if ('vh' in token) return `${token.vh}vh`;
    if ('em' in token) return `${token.em}em`;
    if ('percent' in token) return `${token.percent}%`;
    if ('value' in token) return String(token.value);
    if ('ms' in token) return `${token.ms}ms`;
    if ('bezier' in token) return `cubic-bezier(${token.bezier.join(', ')})`;
  }
  return String(token);
}

