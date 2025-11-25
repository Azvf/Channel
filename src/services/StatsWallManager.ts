// Stats Wall 管理器 - 应用层服务
import { TaggedPage } from '../shared/types/gameplayTag';
import { CalendarLayoutInfo, IHeatmapStrategy, IDateRangeStrategy } from '../shared/types/statsWall';
import { LinearHeatmapStrategy } from '../core/strategies/LinearHeatmapStrategy';
import { CalendarGridBuilder } from '../core/strategies/CalendarGridBuilder';
import { TodayOnlyDateRangeStrategy } from '../core/strategies/DateRangeStrategy';
import { currentPageService } from './popup/currentPageService';

export class StatsWallManager {
  private static instance: StatsWallManager;
  
  private strategy: IHeatmapStrategy;
  private dateRangeStrategy: IDateRangeStrategy;
  private gridBuilder: CalendarGridBuilder;
  
  // 简单的内存缓存
  private cache: CalendarLayoutInfo | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1分钟缓存

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
   */
  public async getStatsWallData(forceRefresh = false): Promise<CalendarLayoutInfo> {
    const now = Date.now();

    // 缓存命中检查
    if (!forceRefresh && this.cache && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cache;
    }

    // 1. 获取原始数据 (Data Source)
    const pages = await currentPageService.getAllTaggedPages();

    // 2. 数据聚合 (Data Processing)
    // 这里可以将 heavy lifting 放到 Web Worker 中
    const activityMap = this.aggregatePages(pages);

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
      // 假设 createdAt 是 timestamp number
      const dateStr = new Date(page.createdAt).toISOString().split('T')[0];
      
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
   * [Test Only] 重置单例状态
   * 用于测试环境，确保测试间状态隔离
   */
  public resetForTests(): void {
    this.cache = null;
    this.lastFetchTime = 0;
    // 如果 strategy 也是有状态的，也需要重置
    this.strategy = new LinearHeatmapStrategy();
    this.dateRangeStrategy = new TodayOnlyDateRangeStrategy();
  }
}

export const statsWallManager = StatsWallManager.getInstance();

