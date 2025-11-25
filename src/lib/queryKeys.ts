/**
 * 查询键工厂模式
 * 统一管理所有 TanStack Query 的查询键，便于维护和缓存失效
 */

export const queryKeys = {
  // 标签相关
  allTags: ['tags'] as const,
  
  // 页面相关
  currentPage: (url?: string) => url ? ['page', 'current', url] as const : ['page', 'current'] as const,
  page: (id: string) => ['page', id] as const,
  
  // 设备相关
  devices: (userId?: string) => userId ? ['devices', userId] as const : ['devices'] as const,
  
  // 统计相关
  stats: ['stats'] as const,
} as const;

