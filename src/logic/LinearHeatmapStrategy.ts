// 线性热图计算策略
import { IHeatmapStrategy, ActivityLevel } from '../types/statsWall';

export class LinearHeatmapStrategy implements IHeatmapStrategy {
  computeLevels(activityMap: Map<string, number>): Map<string, ActivityLevel> {
    const levelMap = new Map<string, ActivityLevel>();
    
    // 1. 找出最大值
    let max = 0;
    for (const count of activityMap.values()) {
      if (count > max) max = count;
    }

    if (max === 0) return levelMap;

    // 2. 计算阈值 (使用位运算取整，性能微优于 Math.ceil)
    const level1 = Math.max(1, (max * 0.25) | 0); // 25%
    const level2 = Math.max(2, (max * 0.50) | 0); // 50%
    const level3 = Math.max(3, (max * 0.75) | 0); // 75%

    // 3. 映射级别
    for (const [key, count] of activityMap) {
      let level: ActivityLevel = 0;
      if (count >= level3) level = 3;
      else if (count >= level2) level = 2;
      else if (count >= level1) level = 1;
      
      levelMap.set(key, level);
    }

    return levelMap;
  }
}

