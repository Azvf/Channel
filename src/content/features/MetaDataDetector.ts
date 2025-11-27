// src/content/features/MetaDataDetector.ts
// 元数据检测器：提取页面的 SEO 元数据

import { IPageFeature, FeatureResult, MetaDataFeatureData, HeroImageSource } from './types';

/**
 * 元数据检测器
 * 提取 Open Graph 标签、描述等元数据
 * 实现三级降级策略：Meta → Semantic → Heuristic
 */
export class MetaDataDetector implements IPageFeature {
  id = 'metadata-detector';

  isEnabled(): boolean {
    return true; // 未来可以接入 Settings 配置
  }

  async detect(): Promise<FeatureResult | null> {
    try {
      // 1. 尝试获取所有可能的 Meta 标签 (Tier 1)
      const metaImage = this.getMetaImage();
      let finalImage: string | null = metaImage;
      let imageSource: HeroImageSource | undefined = metaImage ? 'meta' : undefined;
      let confidence = metaImage ? 1.0 : 0;

      // 2. 如果 Meta 层未找到，尝试语义化检测 (Tier 2)
      if (!finalImage) {
        const semanticImage = this.getSemanticImage();
        if (semanticImage) {
          finalImage = semanticImage;
          imageSource = 'semantic';
          confidence = 0.8;
        }
      }

      // 3. 如果语义化检测也未找到，使用视觉启发式算法 (Tier 3)
      if (!finalImage) {
        const domImage = this.getBestDomImage();
        if (domImage) {
          finalImage = domImage;
          imageSource = 'heuristic';
          confidence = 0.7;
        }
      }

      // 获取标题和描述
      const title = this.getMetaContent('og:title') || document.title;
      const description = 
        this.getMetaContent('description') || 
        this.getMetaContent('og:description');

      // 如果没有找到任何元数据，返回 null
      if (!finalImage && !description && !title) {
        return null;
      }

      const data: MetaDataFeatureData = {
        coverImage: finalImage || undefined,
        description: description || undefined,
        title: title || undefined,
        heroImageSource: imageSource,
      };

      return {
        type: 'metadata',
        confidence,
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

  /**
   * 获取 Meta 标签内容
   * 同时支持 property 和 name 属性
   */
  private getMetaContent(property: string): string | null {
    return (
      document.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ||
      document.querySelector(`meta[name="${property}"]`)?.getAttribute('content') ||
      null
    );
  }

  /**
   * 第一优先级：获取 Meta 标签中的图片
   * 按优先级尝试不同的 meta 标签
   */
  private getMetaImage(): string | null {
    const candidates = [
      'og:image',
      'twitter:image',
      'twitter:image:src',
      'thumbnail',
    ];

    for (const key of candidates) {
      const val = this.getMetaContent(key);
      if (val) return val;
    }

    return null;
  }

  /**
   * 第二优先级：语义化检测
   * 1. 检测 JSON-LD 中的 image 字段
   * 2. 检测 <article> 标签内的第一张大图
   */
  private getSemanticImage(): string | null {
    // 1. 尝试从 JSON-LD 中获取
    const jsonLdImage = this.getJsonLdImage();
    if (jsonLdImage) {
      return jsonLdImage;
    }

    // 2. 尝试从 <article> 标签中获取
    const articleImage = this.getArticleImage();
    if (articleImage) {
      return articleImage;
    }

    return null;
  }

  /**
   * 从 JSON-LD 中提取图片
   */
  private getJsonLdImage(): string | null {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      
      for (const script of scripts) {
        try {
          const json = JSON.parse(script.textContent || '{}');
          
          // 处理单个对象或数组
          const items = Array.isArray(json) ? json : [json];
          
          for (const item of items) {
            // 查找 Article 或 BlogPosting 类型
            if (
              item['@type'] === 'Article' ||
              item['@type'] === 'BlogPosting' ||
              item['@type'] === 'NewsArticle'
            ) {
              // 支持多种图片格式
              if (item.image) {
                if (typeof item.image === 'string') {
                  return item.image;
                }
                if (typeof item.image === 'object' && item.image.url) {
                  return item.image.url;
                }
                if (Array.isArray(item.image) && item.image.length > 0) {
                  const firstImage = item.image[0];
                  return typeof firstImage === 'string' ? firstImage : firstImage.url;
                }
              }
            }
          }
        } catch (_e) {
          // 跳过无效的 JSON
          continue;
        }
      }
    } catch (_error) {
      // JSON-LD 解析失败，降级到下一层
    }

    return null;
  }

  /**
   * 从 <article> 标签中提取第一张符合尺寸要求的图片
   */
  private getArticleImage(): string | null {
    const articles = document.querySelectorAll('article');
    
    for (const article of articles) {
      const images = article.querySelectorAll('img');
      
      for (const img of images) {
        // 检查图片是否可见且符合最小尺寸要求
        if (this.isImageValid(img)) {
          return img.src || null;
        }
      }
    }

    return null;
  }

  /**
   * 第三优先级：视觉启发式算法
   * 遍历 DOM，计算所有图片的"视觉权重"，选出最像头图的那张
   */
  private getBestDomImage(): string | null {
    const images = Array.from(document.getElementsByTagName('img'));
    let bestImage: HTMLImageElement | null = null;
    let maxScore = 0;

    // 过滤候选图片：批量读取所有属性（避免布局抖动）
    const candidates = images.filter(img => this.isImageValid(img));

    // 批量计算所有候选图片的评分
    for (const img of candidates) {
      const score = this.calculateImageScore(img);
      
      if (score > maxScore) {
        maxScore = score;
        bestImage = img;
      }
    }

    return bestImage ? bestImage.src : null;
  }

  /**
   * 检查图片是否有效（可见且符合最小尺寸要求）
   */
  private isImageValid(img: HTMLImageElement): boolean {
    const rect = img.getBoundingClientRect();
    
    // 最小尺寸限制：宽度 > 200px 且 高度 > 150px
    const minWidth = 200;
    const minHeight = 150;
    
    // 检查尺寸
    if (rect.width <= minWidth || rect.height <= minHeight) {
      return false;
    }

    // 检查是否隐藏
    if (
      img.style.display === 'none' ||
      img.style.visibility === 'hidden' ||
      img.offsetParent === null
    ) {
      return false;
    }

    return true;
  }

  /**
   * 计算图片的视觉权重分数
   * 公式：score = area × aspectRatioPenalty × semanticBonus - positionPenalty
   */
  private calculateImageScore(img: HTMLImageElement): number {
    const rect = img.getBoundingClientRect();
    
    // 基础分数：面积越大分越高
    let score = rect.width * rect.height;
    
    // 宽高比惩罚：如果图片太"瘦长"或太"扁平"（Banner 广告往往很扁）
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio > 3 || aspectRatio < 0.3) {
      score *= 0.2; // 大幅降低分数
    }
    
    // 位置权重：越靠上越重要（y 越小分越高）
    // 假设首屏高度是 800，越接近 0 越好
    const positionPenalty = Math.max(0, rect.top) * 0.5;
    score -= positionPenalty;
    
    // 特殊加分：如果是 <article> 或 <main> 里的图片
    if (img.closest('article') || img.closest('main')) {
      score *= 1.5;
    }

    return score;
  }
}

