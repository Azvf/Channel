/**
 * Platform Detection Utilities
 * 平台检测工具
 * 
 * 用于检测运行平台，主要用于快捷键格式化等场景
 */

/**
 * 检测是否为 Mac 平台
 * @returns true 如果是 Mac 平台，否则为 false
 */
export function isMacPlatform(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // 检测 macOS 或 iOS
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) || 
         /Mac/.test(navigator.userAgent);
}


