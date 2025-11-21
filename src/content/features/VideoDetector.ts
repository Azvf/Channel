// src/content/features/VideoDetector.ts
// 视频检测器：检测页面中的主视频元素

import { IPageFeature, FeatureResult, VideoFeatureData } from './types';

/**
 * 视频检测器
 * 使用启发式算法找到"用户正在看的主视频"
 */
export class VideoDetector implements IPageFeature {
  id = 'video-detector';

  isEnabled(): boolean {
    return true; // 未来可以接入 Settings 配置
  }

  async detect(): Promise<FeatureResult | null> {
    try {
      const videos = document.querySelectorAll('video');
      if (videos.length === 0) {
        return null;
      }

      let bestVideo: HTMLVideoElement | null = null;
      let maxScore = -1;

      // 优化：使用 requestIdleCallback 或分片处理防止卡顿
      // 这里保持同步逻辑简单演示，但添加了性能保护
      videos.forEach((video) => {
        const rect = video.getBoundingClientRect();
        const area = rect.width * rect.height;

        // 排除微小视频 (广告/头像)
        if (area < 5000) return;

        let score = area;
        
        // 正在播放的权重极高
        if (!video.paused) score *= 3;
        
        // 有进度的权重高
        if (video.currentTime > 0) score *= 1.5;

        // 视口可见性加权
        if (this.isInViewport(video)) score *= 1.2;

        if (score > maxScore) {
          maxScore = score;
          bestVideo = video;
        }
      });

      if (!bestVideo) {
        return null;
      }

      const video = bestVideo as HTMLVideoElement;
      const data: VideoFeatureData = {
        timestamp: Math.floor(video.currentTime),
        duration: video.duration || 0,
        src: video.currentSrc || video.src || '',
        isPlaying: !video.paused,
        area: maxScore,
      };

      return {
        type: 'video',
        confidence: maxScore > 10000 ? 0.9 : 0.5,
        data,
      };
    } catch (error) {
      console.warn('[VideoDetector] 检测失败:', error);
      return {
        type: 'video',
        confidence: 0,
        data: null,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 检查元素是否在视口内
   */
  private isInViewport(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
}

