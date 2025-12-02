// Stats Wall 后台计算服务
// 监听数据变更，触发后台计算，并通过事件通知 Popup

import { GameplayStore } from '../gameplayStore';
import { statsWallManager } from '../StatsWallManager';
import type { RuntimeEventMessage } from '../../shared/rpc-protocol/events';
import type { StatsWallUpdateEvent } from '../../shared/rpc-protocol/events';
import type { TaggedPage } from '../../shared/types/gameplayTag';
import type { CalendarLayoutInfo } from '../../shared/types/statsWall';
import { storageService, STORAGE_KEYS } from '../storageService';

/**
 * Stats Wall 计算服务
 * 在 Background Service Worker 中运行，负责：
 * 1. 监听页面/标签变更事件
 * 2. 触发后台计算（带防抖）
 * 3. 计算完成后发送事件通知
 */
export class StatsWallComputeService {
  private static instance: StatsWallComputeService;
  private computeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY = 1000; // 1秒防抖，避免频繁计算
  private version = 0; // 版本号，每次计算递增
  private isComputing = false; // 防止并发计算
  private cachedLayout: CalendarLayoutInfo | null = null; // 缓存计算结果

  private constructor() {
    // 私有构造函数，单例模式
  }

  public static getInstance(): StatsWallComputeService {
    if (!StatsWallComputeService.instance) {
      StatsWallComputeService.instance = new StatsWallComputeService();
    }
    return StatsWallComputeService.instance;
  }

  /**
   * 初始化服务
   * 订阅 gameplayStore 的变化事件
   * 从 Storage 恢复版本号（如果 Service Worker 重启）
   */
  public async initialize(): Promise<void> {
    const gameplayStore = GameplayStore.getInstance();
    
    // 从 Storage 恢复版本号（如果 Service Worker 重启）
    try {
      const metadata = await storageService.get<{ version: number; computedAt: number }>(STORAGE_KEYS.STATS_WALL_VERSION);
      if (metadata?.version !== undefined) {
        this.version = metadata.version;
      }
    } catch (_error) {
      // 版本号恢复失败不影响主流程，继续使用默认值 0
    }
    
    // 订阅数据变化
    gameplayStore.subscribe(() => {
      this.scheduleCompute();
    });
  }

  /**
   * 安排计算（带防抖）
   */
  private scheduleCompute(): void {
    // 清除之前的定时器
    if (this.computeTimer) {
      clearTimeout(this.computeTimer);
    }

    // 设置新的定时器
    this.computeTimer = setTimeout(() => {
      this.compute();
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 执行计算并发送通知
   */
  private async compute(): Promise<void> {
    // 防止并发计算
    if (this.isComputing) {
      return;
    }
    
    this.isComputing = true;
    this.computeTimer = null;

    try {
      // 从 gameplayStore 获取页面数据（在 Background 中直接使用，无需 RPC）
      const gameplayStore = GameplayStore.getInstance();
      const pages: TaggedPage[] = gameplayStore.getTaggedPages();

      // 执行计算（强制刷新，不使用缓存，直接传入页面列表）
      const layoutInfo = await statsWallManager.getStatsWallData(true, true, pages);

      // 版本号递增
      this.version++;

      // 缓存计算结果
      this.cachedLayout = layoutInfo;

      // 存储轻量级元数据到 Storage（只存储版本号和时间戳，< 100 bytes）
      await this.saveVersionMetadata();

      // 发送轻量级更新事件（只包含版本号，不包含完整数据）
      this.sendUpdateEvent();
    } catch (error) {
      console.error('[StatsWallComputeService] 计算失败:', error);
    } finally {
      this.isComputing = false;
    }
  }

  /**
   * 存储轻量级元数据到 Storage（只存储版本号和时间戳）
   */
  private async saveVersionMetadata(): Promise<void> {
    const metadata = {
      version: this.version,
      computedAt: Date.now(),
    };

    try {
      await storageService.set(STORAGE_KEYS.STATS_WALL_VERSION, metadata);
    } catch (_error) {
      // 存储失败不影响主流程，继续执行
    }
  }

  /**
   * 发送轻量级更新事件到所有连接的 Popup（只包含版本号，不包含完整数据）
   */
  private sendUpdateEvent(): void {
    const event: StatsWallUpdateEvent = {
      type: 'statsWall:updated',
      version: this.version,
      computedAt: Date.now(),
      // 不再包含完整 data，Popup 需要通过 RPC 获取
    };

    const message: RuntimeEventMessage = {
      event: 'statsWall',
      payload: event,
    };

    // 使用 chrome.runtime.sendMessage 发送事件（单向通知，不需要响应）
    // 如果 Popup 未打开，消息会被丢弃（这是预期的行为）
    chrome.runtime.sendMessage(message).catch(() => {
      // 忽略错误：如果 Popup 未打开，sendMessage 会失败，这是正常的
    });
  }

  /**
   * 获取 Stats Wall 数据（RPC 方法）
   * @param clientVersion 客户端版本号，如果匹配则返回缓存，否则重新计算
   * @returns Stats Wall 数据和版本号信息
   */
  public async getStatsWallData(clientVersion?: number): Promise<{
    data: CalendarLayoutInfo;
    version: number;
    cached: boolean;
  }> {
    // 如果客户端版本号匹配当前缓存版本，直接返回缓存
    if (clientVersion !== undefined && clientVersion === this.version && this.cachedLayout !== null) {
      return {
        data: this.cachedLayout,
        version: this.version,
        cached: true,
      };
    }

    // 如果缓存不存在或版本不匹配，需要计算
    if (this.cachedLayout === null || clientVersion !== this.version) {
      // 如果正在计算，等待计算完成
      if (this.isComputing) {
        // 简单轮询等待（最多等待 5 秒）
        const maxWait = 5000;
        const startWait = Date.now();
        while (this.isComputing && (Date.now() - startWait < maxWait)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 如果计算完成，返回缓存
        if (this.cachedLayout !== null) {
          return {
            data: this.cachedLayout,
            version: this.version,
            cached: false, // 虽然是缓存，但刚刚计算完成
          };
        }
      }

      // 如果计算未完成或缓存仍为空，触发计算
      await this.compute();
    }

    // 返回计算结果
    if (this.cachedLayout === null) {
      throw new Error('Stats Wall 数据计算失败');
    }

    return {
      data: this.cachedLayout,
      version: this.version,
      cached: false,
    };
  }

  /**
   * 手动触发计算（用于测试或特殊场景）
   */
  public async triggerCompute(): Promise<void> {
    await this.compute();
  }
}

// 导出单例
export const statsWallComputeService = StatsWallComputeService.getInstance();

