// src/content/features/MetaDataDetector.ts
// 元数据检测器：提取页面的 SEO 元数据

import { IPageFeature, FeatureResult, MetaDataFeatureData } from './types';

/**
 * 元数据检测器
 * 提取 Open Graph 标签、描述等元数据
 */
export class MetaDataDetector implements IPageFeature {
  id = 'metadata-detector';

  isEnabled(): boolean {
    return true; // 未来可以接入 Settings 配置
  }

  async detect(): Promise<FeatureResult | null> {
    try {
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const description = 
        document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      const title = 
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.title;

      // 如果没有找到任何元数据，返回 null
      if (!ogImage && !description && !title) {
        return null;
      }

      const data: MetaDataFeatureData = {
        coverImage: ogImage || undefined,
        description: description || undefined,
        title: title || undefined,
      };

      return {
        type: 'metadata',
        confidence: 1,
        data,
      };
    } catch (error) {
      console.warn('[MetaDataDetector] 检测失败:', error);
      return {
        type: 'metadata',
        confidence: 0,
        data: null,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}

