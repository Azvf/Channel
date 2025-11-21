// src/content/features/types.ts
// 页面特性检测系统的类型定义

/**
 * 特性检测结果
 */
export interface FeatureResult {
  /** 特性类型标识 (如 'video', 'article', 'metadata') */
  type: string;
  
  /** 置信度 (0-1) */
  confidence: number;
  
  /** 具体的数据载荷 */
  data: any;
  
  /** 错误信息（可选） */
  error?: string;
  
  /** 降级数据（可选） */
  fallback?: any;
}

/**
 * 页面特性检测器接口
 * 所有探测器必须实现此接口
 */
export interface IPageFeature {
  /**
   * 特性名称（唯一标识）
   */
  id: string;

  /**
   * 是否启用（可以通过配置动态开关）
   */
  isEnabled(): boolean;

  /**
   * 执行检测
   * 应该尽量快，避免阻塞主线程
   * @returns 检测结果，如果未检测到则返回 null
   */
  detect(): Promise<FeatureResult | null>;
}

/**
 * 视频检测结果数据
 */
export interface VideoFeatureData {
  /** 视频时间戳（秒） */
  timestamp: number;
  
  /** 视频总时长（秒） */
  duration: number;
  
  /** 视频源地址 */
  src: string;
  
  /** 是否正在播放 */
  isPlaying: boolean;
  
  /** 视频面积（用于评分） */
  area: number;
}

/**
 * 元数据检测结果数据
 */
export interface MetaDataFeatureData {
  /** Open Graph 图片 */
  coverImage?: string;
  
  /** 页面描述 */
  description?: string;
  
  /** 页面标题 */
  title?: string;
}

