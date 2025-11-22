/**
 * 缓存监控服务
 * 用于监控 Repository 缓存命中率
 */

import { CacheStats, ChromeTagRepository, ChromePageRepository } from '../infra/database/chrome-storage/repositories/ChromeStorageRepository';

class CacheMonitor {
  private tagRepo: ChromeTagRepository | null = null;
  private pageRepo: ChromePageRepository | null = null;

  /**
   * 设置要监控的 Repository
   */
  setRepositories(tagRepo: ChromeTagRepository, pageRepo: ChromePageRepository): void {
    this.tagRepo = tagRepo;
    this.pageRepo = pageRepo;
  }

  /**
   * 获取所有 Repository 的缓存统计
   */
  getAllStats(): {
    tags: CacheStats | null;
    pages: CacheStats | null;
    overall: {
      totalHits: number;
      totalMisses: number;
      totalRequests: number;
      overallHitRate: number;
    };
  } {
    const tagStats = this.tagRepo?.getCacheStats() || null;
    const pageStats = this.pageRepo?.getCacheStats() || null;

    const totalHits = (tagStats?.hits || 0) + (pageStats?.hits || 0);
    const totalMisses = (tagStats?.misses || 0) + (pageStats?.misses || 0);
    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      tags: tagStats,
      pages: pageStats,
      overall: {
        totalHits,
        totalMisses,
        totalRequests,
        overallHitRate,
      },
    };
  }

  /**
   * 重置所有统计
   */
  resetAllStats(): void {
    this.tagRepo?.resetCacheStats();
    this.pageRepo?.resetCacheStats();
  }

  /**
   * 获取格式化的统计报告
   */
  getFormattedReport(): string {
    const stats = this.getAllStats();
    const lines: string[] = [];

    lines.push('=== 缓存统计报告 ===');
    
    if (stats.tags) {
      lines.push(`标签 Repository:`);
      lines.push(`  命中: ${stats.tags.hits}`);
      lines.push(`  未命中: ${stats.tags.misses}`);
      lines.push(`  总计: ${stats.tags.total}`);
      lines.push(`  命中率: ${(stats.tags.hitRate * 100).toFixed(2)}%`);
    }

    if (stats.pages) {
      lines.push(`页面 Repository:`);
      lines.push(`  命中: ${stats.pages.hits}`);
      lines.push(`  未命中: ${stats.pages.misses}`);
      lines.push(`  总计: ${stats.pages.total}`);
      lines.push(`  命中率: ${(stats.pages.hitRate * 100).toFixed(2)}%`);
    }

    lines.push(`总体统计:`);
    lines.push(`  总命中: ${stats.overall.totalHits}`);
    lines.push(`  总未命中: ${stats.overall.totalMisses}`);
    lines.push(`  总请求: ${stats.overall.totalRequests}`);
    lines.push(`  总体命中率: ${(stats.overall.overallHitRate * 100).toFixed(2)}%`);

    return lines.join('\n');
  }
}

export const cacheMonitor = new CacheMonitor();

