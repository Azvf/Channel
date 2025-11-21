// src/content/features/FeatureOrchestrator.ts
// 特性编排器：统一调度所有页面特性检测器

import { IPageFeature } from './types';
import { VideoDetector } from './VideoDetector';
import { MetaDataDetector } from './MetaDataDetector';

/**
 * 特性编排器
 * 负责注册、管理和执行所有页面特性检测器
 */
class FeatureOrchestrator {
  private features: IPageFeature[] = [];

  constructor() {
    // 注册所有策略
    this.register(new VideoDetector());
    this.register(new MetaDataDetector());
  }

  /**
   * 注册一个特性检测器
   */
  register(feature: IPageFeature): void {
    this.features.push(feature);
  }

  /**
   * 并行执行所有探测器并聚合结果
   * 使用 Promise.allSettled 确保一个探测器崩溃不影响其他
   * 添加超时控制避免阻塞
   */
  async analyzePage(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    // 使用 Promise.allSettled + 超时控制
    const promises = this.features
      .filter(f => f.isEnabled())
      .map(async f => {
        try {
          // 添加超时保护（避免某个探测器卡死）
          return await Promise.race([
            f.detect(),
            new Promise<null>((resolve) =>
              setTimeout(() => {
                console.warn(`[FeatureOrchestrator] ${f.id} 超时`);
                resolve(null);
              }, 2000) // 2秒超时
            ),
          ]);
        } catch (e) {
          console.warn(`[FeatureOrchestrator] ${f.id} 失败:`, e);
          return null;
        }
      });

    // 分批执行（避免一次性执行过多探测器）
    const BATCH_SIZE = 3;
    for (let i = 0; i < promises.length; i += BATCH_SIZE) {
      const batch = promises.slice(i, i + BATCH_SIZE);
      const settlements = await Promise.allSettled(batch);

      settlements.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          const { type, data } = res.value;
          // 聚合结果：{ video: {...}, metadata: {...} }
          results[type] = data;
        }
      });
    }

    return results;
  }

  /**
   * 获取所有已注册的检测器 ID
   */
  getRegisteredFeatures(): string[] {
    return this.features.map(f => f.id);
  }
}

// 导出单例
export const featureOrchestrator = new FeatureOrchestrator();

