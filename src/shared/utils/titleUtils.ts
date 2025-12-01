// src/shared/utils/titleUtils.ts
// 标题工具函数 - 用于检测和处理页面标题

/**
 * 检测 title 是否为 URL 样式
 * 
 * 判断条件：
 * 1. title 以 http:// 或 https:// 开头（完整 URL）
 * 2. title 等于 url（完全匹配）
 * 3. title 是 url 的路径部分（去掉协议后匹配，例如 "example.com/path" 匹配 "https://example.com/path"）
 * 4. title 是 url 的域名部分（例如 "example.com" 匹配 "https://example.com/path"）
 * 
 * @param title - 要检测的标题
 * @param url - 页面 URL（可选，如果提供则进行更精确的匹配）
 * @param debug - 是否输出调试日志（默认 false）
 * @returns 如果 title 是 URL 样式返回 true，否则返回 false
 */
export function isTitleUrl(title: string | undefined, url?: string, debug = false): boolean {
  if (!title) {
    if (debug) console.log('[isTitleUrl] 返回 false: title 为空', { title, url });
    return false;
  }
  
  // 检查完整 URL
  if (title.startsWith('http://') || title.startsWith('https://')) {
    if (debug) console.log('[isTitleUrl] 返回 true: title 是完整 URL', { title });
    return true;
  }
  
  // 如果提供了 url 参数，进行精确匹配
  if (url) {
    // 检查完全匹配
    if (title === url) {
      if (debug) console.log('[isTitleUrl] 返回 true: title 完全匹配 url', { title, url });
      return true;
    }
    
    // 检查是否是 URL 的路径部分（去掉协议后匹配）
    try {
      const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
      if (title === urlWithoutProtocol) {
        if (debug) console.log('[isTitleUrl] 返回 true: title 等于 url 去掉协议后的部分', { title, urlWithoutProtocol });
        return true;
      }
      
      // 检查 title 是否是 URL 的域名部分
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const domainWithoutWww = domain.replace(/^www\./, '');
        const titleWithoutWww = title.replace(/^www\./, '');
        if (title === domain || title === domainWithoutWww || titleWithoutWww === domainWithoutWww) {
          if (debug) console.log('[isTitleUrl] 返回 true: title 是 URL 的域名部分', { title, domain, domainWithoutWww });
          return true;
        }
      } catch (_domainError) {
        // URL 解析失败，继续其他检查
      }
      
      // 检查 title 是否精确匹配 URL 去掉协议后的部分
      if (urlWithoutProtocol.startsWith(title)) {
        if (debug) console.log('[isTitleUrl] 返回 true: urlWithoutProtocol 以 title 开头', { title, urlWithoutProtocol });
        return true;
      }
      
      // 最后检查：title 是否包含在 URL 中（作为路径的一部分）
      if (title.length >= 5 && url.includes(title)) {
        if (debug) console.log('[isTitleUrl] 返回 true: title 包含在 url 中', { title, url });
        return true;
      }
    } catch (_error) {
      if (debug) console.log('[isTitleUrl] URL 解析失败', { error: _error });
    }
  } else {
    // 如果没有提供 url 参数，使用简单的 URL 路径模式匹配
    // 匹配模式：域名（可能包含子域名）+ 路径
    // 例如：example.com/path, www.example.com/path, subdomain.example.com/path
    const urlPathPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
    if (urlPathPattern.test(title)) {
      if (debug) console.log('[isTitleUrl] 返回 true: title 匹配 URL 路径模式', { title });
      return true;
    }
  }
  
  if (debug) console.log('[isTitleUrl] 返回 false: 所有检查都未通过', { title, url });
  return false;
}

/**
 * 检查两个标题是否相似（只差前缀标记）
 * 用于避免因网站动态更新前缀标记（如【新提醒】↔【      】）导致的重复更新
 * 
 * @param title1 - 第一个标题
 * @param title2 - 第二个标题
 * @returns 如果标题相似返回 true，否则返回 false
 */
export function isTitleSimilar(title1: string, title2: string): boolean {
  if (title1 === title2) {
    return true;
  }
  
  const normalizeTitle = (title: string): string => {
    return title.replace(/^【[^】]*】\s*/, '').trim();
  };
  
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);
  
  if (normalized1 === normalized2 && normalized1.length > 0) {
    return true;
  }
  
  // 快速检查：长度相似且开头匹配的标题视为相似（避免因细微差异导致的重复更新）
  if (normalized1.length > 10 && normalized2.length > 10) {
    const minLen = Math.min(normalized1.length, normalized2.length);
    const maxLen = Math.max(normalized1.length, normalized2.length);
    if (maxLen - minLen < minLen * 0.1) {
      const prefixLen = Math.min(20, minLen);
      if (normalized1.substring(0, prefixLen) === normalized2.substring(0, prefixLen)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 检测两个标题之间的差异是否微不足道（不重要的变化）
 * 用于过滤掉频繁但无意义的Title更新，如通知计数、时间戳等
 * 
 * 支持的场景：
 * 1. 通知计数变化：如 "(5) 页面标题" ↔ "(6) 页面标题"
 * 2. 时间戳变化：如 "页面标题 - 10:30" ↔ "页面标题 - 10:31"
 * 3. 前缀标记变化：如 "【新提醒】页面标题" ↔ "【      】页面标题"（已有 isTitleSimilar 处理）
 * 4. 数字后缀变化：如 "页面标题 (1)" ↔ "页面标题 (2)"
 * 
 * @param title1 - 第一个标题
 * @param title2 - 第二个标题
 * @returns 如果差异微不足道返回 true，否则返回 false
 */
export function isTitleTriviallyDifferent(title1: string, title2: string): boolean {
  if (title1 === title2) {
    return true;
  }

  // 先使用 isTitleSimilar 检查（处理前缀标记等）
  if (isTitleSimilar(title1, title2)) {
    return true;
  }

  // 提取核心标题（去除常见的前缀和后缀）
  const extractCoreTitle = (title: string): string => {
    // 移除通知计数前缀：如 "(5) " 或 "[5] " 或 "5 - "
    let core = title.replace(/^[([]?\d+[)\]]?\s*[-–—]?\s*/, '');
    
    // 移除常见的前缀标记（中文和英文）
    core = core.replace(/^【[^】]*】\s*/, ''); // 中文方括号
    core = core.replace(/^\[[^\]]*\]\s*/, ''); // 英文方括号
    core = core.replace(/^\([^)]*\)\s*/, ''); // 圆括号
    
    // 移除时间戳后缀：如 " - 10:30" 或 " | 10:30" 或 " (10:30)"
    core = core.replace(/\s*[-–—|]\s*\d{1,2}:\d{2}(:\d{2})?\s*$/, '');
    core = core.replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/, '');
    
    // 移除数字后缀：如 " (1)" 或 " [2]"
    core = core.replace(/\s*[([]\d+[)\]]\s*$/, '');
    
    return core.trim();
  };

  const core1 = extractCoreTitle(title1);
  const core2 = extractCoreTitle(title2);

  // 如果核心标题相同，则认为差异微不足道
  if (core1 === core2 && core1.length > 0) {
    return true;
  }

  // 检查是否只是数字部分不同（通知计数模式）
  // 模式1: "(数字) 标题" 或 "[数字] 标题"
  const notificationPattern = /^[([]?(\d+)[)\]]?\s*(.+)$/;
  const match1 = title1.match(notificationPattern);
  const match2 = title2.match(notificationPattern);
  
  if (match1 && match2 && match1[2] === match2[2]) {
    // 核心标题相同，只是数字不同
    return true;
  }

  // 模式2: "标题 (数字)" 或 "标题 [数字]"
  const suffixPattern = /^(.+?)\s*[([](\d+)[)\]]\s*$/;
  const suffixMatch1 = title1.match(suffixPattern);
  const suffixMatch2 = title2.match(suffixPattern);
  
  if (suffixMatch1 && suffixMatch2 && suffixMatch1[1] === suffixMatch2[1]) {
    // 核心标题相同，只是后缀数字不同
    return true;
  }

  // 检查时间戳模式：如 "标题 - 10:30" ↔ "标题 - 10:31"
  const timePattern = /^(.+?)\s*[-–—|]\s*\d{1,2}:\d{2}(:\d{2})?\s*$/;
  const timeMatch1 = title1.match(timePattern);
  const timeMatch2 = title2.match(timePattern);
  
  if (timeMatch1 && timeMatch2 && timeMatch1[1] === timeMatch2[1]) {
    // 核心标题相同，只是时间戳不同
    return true;
  }

  return false;
}

