/**
 * URL 工具函数
 * 提供 URL 比较和处理的纯函数
 */

/**
 * 获取 base URL（移除时间戳参数）
 * 用于比较两个 URL 是否指向同一个页面，忽略时间戳等查询参数
 * 
 * @param url - 要处理的 URL
 * @returns base URL（origin + pathname，移除时间戳参数）
 * 
 * @example
 * getBaseUrl('https://example.com/page?t=123') // 'https://example.com/page'
 * getBaseUrl('https://example.com/page?t=456&other=value') // 'https://example.com/page'
 */
export function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('t'); // 移除时间戳参数
    return urlObj.origin + urlObj.pathname; // 只比较 origin + pathname
  } catch {
    // 如果 URL 解析失败，使用简单方法
    return url.split('?')[0];
  }
}

/**
 * 检查两个 URL 是否匹配（基于 base URL）
 * 用于判断两个 URL 是否指向同一个页面，忽略时间戳等查询参数
 * 
 * @param url1 - 第一个 URL
 * @param url2 - 第二个 URL
 * @returns 如果 base URL 匹配返回 true，否则返回 false
 * 
 * @example
 * isUrlMatch('https://example.com/page?t=123', 'https://example.com/page?t=456') // true
 * isUrlMatch('https://example.com/page1', 'https://example.com/page2') // false
 */
export function isUrlMatch(url1: string, url2: string): boolean {
  return getBaseUrl(url1) === getBaseUrl(url2);
}

