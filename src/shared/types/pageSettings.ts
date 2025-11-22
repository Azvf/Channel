/**
 * 页面设置接口
 */
export interface PageSettings {
  /**
   * 同步视频时间戳
   * 如果开启，当检测到视频控件时，会将视频当前播放时间戳同步保存到 URL 中
   */
  syncVideoTimestamp: boolean;
}

/**
 * 默认页面设置
 */
export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  syncVideoTimestamp: true,
};

