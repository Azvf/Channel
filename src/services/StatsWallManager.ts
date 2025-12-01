// Stats Wall 管理器 - 应用层服务
import { TaggedPage } from '../shared/types/gameplayTag';
import { CalendarLayoutInfo, IHeatmapStrategy, IDateRangeStrategy, StatsWallCacheMetadata, IncrementalUpdateResult } from '../shared/types/statsWall';
import { LinearHeatmapStrategy } from '../core/strategies/LinearHeatmapStrategy';
import { CalendarGridBuilder } from '../core/strategies/CalendarGridBuilder';
import { TodayOnlyDateRangeStrategy } from '../core/strategies/DateRangeStrategy';
import { currentPageService } from './popup/currentPageService';
import { storageService, STORAGE_KEYS } from './storageService';

export class StatsWallManager {
  private static instance: StatsWallManager;
  
  private strategy: IHeatmapStrategy;
  private dateRangeStrategy: IDateRangeStrategy;
  private gridBuilder: CalendarGridBuilder;
  
  // 简单的内存缓存
  private cache: CalendarLayoutInfo | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1分钟缓存
  
  // 增量缓存元数据
  private cacheMetadata: StatsWallCacheMetadata | null = null;

  private constructor() {
    // 依赖注入（这里简化为直接实例化）
    this.strategy = new LinearHeatmapStrategy();
    this.dateRangeStrategy = new TodayOnlyDateRangeStrategy();
    this.gridBuilder = new CalendarGridBuilder();
  }

  public static getInstance(): StatsWallManager {
    if (!StatsWallManager.instance) {
      StatsWallManager.instance = new StatsWallManager();
    }
    return StatsWallManager.instance;
  }

  /**
   * 获取准备好渲染的视图数据
   * @param forceRefresh 强制刷新缓存
   * @param useIncremental 是否使用增量计算（默认 true）
   * @param pages 可选的页面列表（如果提供，则使用此列表而不是从 currentPageService 获取）
   */
  public async getStatsWallData(
    forceRefresh = false, 
    useIncremental = true,
    pages?: TaggedPage[]
  ): Promise<CalendarLayoutInfo> {
    const now = Date.now();

    // 缓存命中检查
    if (!forceRefresh && this.cache && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cache;
    }

    // 1. 获取原始数据 (Data Source)
    // 如果提供了页面列表，直接使用；否则从 currentPageService 获取
    const pageList = pages ?? await currentPageService.getAllTaggedPages();

    // 2. 尝试增量计算或全量计算
    let activityMap: Map<string, number>;
    
    if (useIncremental && !forceRefresh) {
      // 尝试增量计算
      const incrementalResult = await this.computeIncremental(pageList);
      if (incrementalResult) {
        activityMap = incrementalResult.activityMap;
      } else {
        // 增量计算失败，回退到全量计算
        activityMap = this.aggregatePages(pageList);
        // 更新缓存元数据
        await this.updateCacheMetadata(pageList, activityMap);
      }
    } else {
      // 全量计算
      activityMap = this.aggregatePages(pageList);
      // 更新缓存元数据
      await this.updateCacheMetadata(pageList, activityMap);
    }

    // 3. 计算热图等级 (Domain Logic)
    const levelMap = this.strategy.computeLevels(activityMap);

    // 4. 生成网格布局 (Layout Logic)
    const layoutInfo = this.gridBuilder.build(activityMap, levelMap, this.dateRangeStrategy);

    // 更新缓存
    this.cache = layoutInfo;
    this.lastFetchTime = now;

    return layoutInfo;
  }

  /**
   * 将页面列表聚合为 日期->计数 映射
   */
  private aggregatePages(pages: TaggedPage[]): Map<string, number> {
    const map = new Map<string, number>();
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      // 使用本地时间手动格式化，避免 toISOString() 的 UTC 转换问题
      // 与 CalendarGridBuilder 保持一致，确保日期字符串格式匹配
      const date = new Date(page.createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const current = map.get(dateStr) || 0;
      map.set(dateStr, current + 1);
    }
    
    return map;
  }

  // 允许运行时切换策略 (比如切换到对数热图)
  public setStrategy(strategy: IHeatmapStrategy): void {
    this.strategy = strategy;
    this.cache = null; // 策略改变，缓存失效
  }

  // 允许运行时切换日期范围策略
  public setDateRangeStrategy(strategy: IDateRangeStrategy): void {
    this.dateRangeStrategy = strategy;
    this.cache = null; // 策略改变，缓存失效
  }

  /**
   * 生成空的日历结构（用于初始渲染，避免闪烁）
   */
  public generateEmptyCalendar(): CalendarLayoutInfo {
    return this.gridBuilder.build(new Map(), new Map(), this.dateRangeStrategy);
  }

  /**
   * 增量计算
   * 只计算新增/变更的页面，合并到现有缓存中
   * @param pages 所有页面列表
   * @returns 增量计算结果，如果无法增量计算则返回 null
   */
  private async computeIncremental(pages: TaggedPage[]): Promise<{ activityMap: Map<string, number>; result: IncrementalUpdateResult } | null> {
    // 1. 加载缓存元数据
    await this.loadCacheMetadata();
    
    if (!this.cacheMetadata) {
      // 没有缓存，无法增量计算
      return null;
    }

    // 2. 找出变更的页面
    const existingPageIds = new Set(this.cacheMetadata.pageIds);
    const currentPageIds = new Set(pages.map(p => p.id));
    
    // 找出新增和变更的页面
    const changedPages: TaggedPage[] = [];
    const removedPageIds: string[] = [];
    
    // 检查新增或变更的页面（使用 updatedAt 作为版本标识）
    for (const page of pages) {
      if (!existingPageIds.has(page.id)) {
        // 新页面
        changedPages.push(page);
      } else {
        // 检查是否更新（比较 updatedAt）
        // 注意：这里简化处理，实际应该比较页面版本号
        // 由于没有页面版本号，我们假设所有现有页面都可能被更新
        // 为了性能，我们可以只检查最近更新的页面
        const pageUpdatedAt = page.updatedAt || page.createdAt;
        if (pageUpdatedAt > this.cacheMetadata.lastPageVersion) {
          changedPages.push(page);
        }
      }
    }
    
    // 检查删除的页面
    for (const pageId of existingPageIds) {
      if (!currentPageIds.has(pageId)) {
        removedPageIds.push(pageId);
      }
    }

    // 如果没有变更，直接返回现有缓存
    if (changedPages.length === 0 && removedPageIds.length === 0) {
      const activityMap = new Map<string, number>(
        Object.entries(this.cacheMetadata.activityMap)
      );
      return {
        activityMap,
        result: {
          updatedDates: [],
          newDates: [],
          removedDates: [],
        },
      };
    }

    // 3. 计算变更页面的日期聚合
    const incrementalActivityMap = this.aggregatePages(changedPages);
    
    // 4. 合并到现有 activityMap
    const existingActivityMap = new Map<string, number>(
      Object.entries(this.cacheMetadata.activityMap)
    );
    
    // 移除已删除页面的日期计数（简化处理：如果页面被删除，我们无法精确知道它影响了哪些日期）
    // 为了简化，我们只处理新增和更新，删除操作需要全量重新计算
    
    // 合并增量数据
    const mergedActivityMap = this.mergeActivityMap(existingActivityMap, incrementalActivityMap);
    
    // 5. 计算更新的日期
    const updatedDates: string[] = [];
    const newDates: string[] = [];
    
    for (const [dateStr] of incrementalActivityMap.entries()) {
      if (existingActivityMap.has(dateStr)) {
        updatedDates.push(dateStr);
      } else {
        newDates.push(dateStr);
      }
    }

    // 6. 更新缓存元数据
    const maxUpdatedAt = Math.max(
      ...pages.map(p => p.updatedAt || p.createdAt),
      this.cacheMetadata.lastPageVersion
    );
    
    this.cacheMetadata = {
      version: this.cacheMetadata.version + 1,
      lastComputedAt: Date.now(),
      lastPageVersion: maxUpdatedAt,
      activityMap: Object.fromEntries(mergedActivityMap),
      pageIds: Array.from(currentPageIds),
    };
    
    // 持久化缓存
    await this.persistCacheMetadata();

    return {
      activityMap: mergedActivityMap,
      result: {
        updatedDates,
        newDates,
        removedDates: removedPageIds.length > 0 ? [] : [], // 简化处理，删除需要全量计算
      },
    };
  }

  /**
   * 合并活动映射
   */
  private mergeActivityMap(
    existing: Map<string, number>,
    updates: Map<string, number>
  ): Map<string, number> {
    const merged = new Map<string, number>(existing);
    
    for (const [dateStr, count] of updates.entries()) {
      const existingCount = merged.get(dateStr) || 0;
      merged.set(dateStr, existingCount + count);
    }
    
    return merged;
  }

  /**
   * 更新缓存元数据（全量计算后调用）
   */
  private async updateCacheMetadata(pages: TaggedPage[], activityMap: Map<string, number>): Promise<void> {
    const maxUpdatedAt = Math.max(...pages.map(p => p.updatedAt || p.createdAt), 0);
    
    this.cacheMetadata = {
      version: (this.cacheMetadata?.version || 0) + 1,
      lastComputedAt: Date.now(),
      lastPageVersion: maxUpdatedAt,
      activityMap: Object.fromEntries(activityMap),
      pageIds: pages.map(p => p.id),
    };
    
    await this.persistCacheMetadata();
  }

  /**
   * 加载缓存元数据
   */
  private async loadCacheMetadata(): Promise<void> {
    if (this.cacheMetadata) {
      return; // 已加载
    }
    
    const cached = await storageService.get<StatsWallCacheMetadata>(STORAGE_KEYS.STATS_WALL_CACHE);
    if (cached) {
      this.cacheMetadata = cached;
    }
  }

  /**
   * 持久化缓存元数据
   */
  private async persistCacheMetadata(): Promise<void> {
    if (!this.cacheMetadata) {
      return;
    }
    
    try {
      await storageService.set(STORAGE_KEYS.STATS_WALL_CACHE, this.cacheMetadata);
    } catch (error) {
      console.error('[StatsWallManager] 持久化缓存失败:', error);
    }
  }

  /**
   * 获取缓存元数据（用于调试）
   */
  public async getCacheMetadata(): Promise<StatsWallCacheMetadata | null> {
    await this.loadCacheMetadata();
    return this.cacheMetadata;
  }

  /**
   * [Test Only] 重置单例状态
   * 用于测试环境，确保测试间状态隔离
   */
  public resetForTests(): void {
    this.cache = null;
    this.lastFetchTime = 0;
    this.cacheMetadata = null;
    // 如果 strategy 也是有状态的，也需要重置
    this.strategy = new LinearHeatmapStrategy();
    this.dateRangeStrategy = new TodayOnlyDateRangeStrategy();
  }
}

export const statsWallManager = StatsWallManager.getInstance();

