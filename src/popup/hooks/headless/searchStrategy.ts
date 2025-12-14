/**
 * Search Strategy Interface
 * 可插拔的数据预测策略接口
 * 
 * 目的：解耦"怎么搜"和"搜什么"，支持本地搜索、WebWorker、远程API等多种策略
 */

/**
 * 预测结果
 */
export type PredictionResult<T> = {
  /** 完全匹配项（场景 C 的判断依据） */
  exactMatch: T | null;
  /** 部分匹配项列表（场景 A 的列表） */
  partialMatches: T[];
  /** 匹配分数映射（用于排序 Top Hit） */
  scores: Map<T, number>;
};

/**
 * 搜索策略接口
 */
export interface SearchStrategy<T> {
  /**
   * 根据查询字符串预测匹配项
   * @param query - 用户输入的查询字符串
   * @param source - 数据源数组
   * @returns 预测结果，包含完全匹配、部分匹配和分数
   */
  predict(query: string, source: T[]): PredictionResult<T>;
}

/**
 * 字符串匹配策略（默认实现）
 * 使用简单的字符串匹配算法
 */
export class StringMatchStrategy<T extends string> implements SearchStrategy<T> {
  /**
   * 计算匹配分数
   * - 完全匹配: 100
   * - 前缀匹配: 80
   * - 包含匹配: 60
   */
  private calculateScore(item: T, query: string): number {
    const lowerItem = item.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) return 0;
    
    // 完全匹配
    if (lowerItem === lowerQuery) {
      return 100;
    }
    
    // 前缀匹配
    if (lowerItem.startsWith(lowerQuery)) {
      return 80;
    }
    
    // 包含匹配
    if (lowerItem.includes(lowerQuery)) {
      return 60;
    }
    
    return 0;
  }

  predict(query: string, source: T[]): PredictionResult<T> {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return {
        exactMatch: null,
        partialMatches: [],
        scores: new Map(),
      };
    }

    const scores = new Map<T, number>();
    const partialMatches: T[] = [];
    let exactMatch: T | null = null;

    // 计算所有项的匹配分数
    for (const item of source) {
      const score = this.calculateScore(item, trimmedQuery);
      
      if (score > 0) {
        scores.set(item, score);
        
        // 完全匹配
        if (score === 100) {
          exactMatch = item;
        } else {
          // 部分匹配
          partialMatches.push(item);
        }
      }
    }

    // 按分数降序排序部分匹配项
    partialMatches.sort((a, b) => {
      const scoreA = scores.get(a) || 0;
      const scoreB = scores.get(b) || 0;
      return scoreB - scoreA;
    });

    return {
      exactMatch,
      partialMatches,
      scores,
    };
  }
}

/**
 * 创建默认的字符串匹配策略实例
 */
export function createStringMatchStrategy<T extends string>(): SearchStrategy<T> {
  return new StringMatchStrategy<T>();
}

