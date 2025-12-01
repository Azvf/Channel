/**
 * 超时和延迟常量
 * 用于 RPC 调用、防抖、重试等场景
 * 
 * 这些常量统一管理所有超时和延迟时间，避免硬编码，便于维护和调整
 */
export const TIMEOUTS = {
  /** 
   * 2秒 - ANALYZE_PAGE 消息超时时间
   * 用于 Promise.race 防止 chrome.tabs.sendMessage 无限等待
   * 选择 2 秒的原因：足够大多数页面完成分析，同时避免用户等待过久
   */
  ANALYZE_PAGE_MESSAGE: 2000,
  
  /** 
   * 2秒 - 页面缓存后台调用防抖时间
   * 用于 usePageCache 中避免频繁触发 analyzePageByUrl
   * 选择 2 秒的原因：平衡数据新鲜度和性能开销，避免短时间内重复分析同一页面
   */
  PAGE_CACHE_DEBOUNCE: 2000,
  
  /** 
   * 2秒 - 标签页缓存有效期
   * 用于 BackgroundServiceImpl 中缓存当前活动标签页信息
   * 选择 2 秒的原因：chrome.tabs.query 调用成本较高（~50ms），短时间内重复调用可复用缓存，提升 getCurrentPage 响应速度
   */
  TAB_CACHE_TTL: 2000,
} as const;

