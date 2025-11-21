/**
 * Animation Physics Layer
 * 
 * 核心时间单位与缓动曲线定义
 * 这是整个应用的"物理引擎"，确保 CSS 和 JS (Framer Motion) 运行在统一的时间流速上
 * 
 * Strategy: JS-First, CSS-Derived
 * - 将"真理"定义在 JS 中（数值）
 * - 分发给 Framer Motion（数值）
 * - 运行时注入到 CSS 变量（字符串）
 */

/**
 * 核心时间单位 (秒)
 * 基准: 200ms - 人眼感知的"即时"与"过程"的临界点
 */
export const DURATION = {
  /** 0.2s - 微交互 (Hover, Click, Focus) */
  FAST: 0.2,
  /** 0.3s - 较小的布局变化 (List expansion, Card flip) */
  BASE: 0.3,
  /** 0.4s - 较大的界面切换 (Page transition, Modal) */
  SLOW: 0.4,
} as const;

/**
 * 核心缓动曲线 (Cubic Bezier)
 * Apple/Notion 风格的平滑曲线
 */
export const EASE = {
  /** 
   * [0.4, 0, 0.2, 1] - 极其平滑，带有轻微的动量感
   * 用于 Layout/Opacity 过渡
   * 对应 CSS: --ease-smooth
   */
  SMOOTH: [0.4, 0, 0.2, 1] as const,
  
  /** 
   * [0.16, 1, 0.3, 1] - 更有"分量"的物理感
   * 用于 Modal 弹窗、Dialog 滑入
   * Apple/Notion 风格的 "easeOutCubic"
   */
  OUT_CUBIC: [0.16, 1, 0.3, 1] as const,
  
  /** 
   * [0.5, 1.5, 0.5, 1] - 机械/回弹感
   * 用于 Toggle、Switch 等需要"反馈感"的交互
   */
  SPRING: [0.5, 1.5, 0.5, 1] as const,
} as const;

/**
 * [Helper] 生成 CSS 格式的 transition 字符串
 * 用于替代硬编码的 'all 0.2s ease'
 * 
 * @param duration - 持续时间（秒），默认 DURATION.FAST
 * @param ease - 缓动曲线数组，默认 EASE.SMOOTH
 * @param property - CSS 属性，默认 'all'
 * @returns CSS transition 字符串，如 "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
 * 
 * @example
 * ```tsx
 * style={{ transition: getTransition() }} // "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
 * style={{ transition: getTransition(DURATION.BASE, EASE.OUT_CUBIC, 'opacity') }} // "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
 * ```
 */
export function getTransition(
  duration: number = DURATION.FAST, 
  ease: readonly number[] = EASE.SMOOTH,
  property: string = 'all'
): string {
  const easeString = `cubic-bezier(${ease.join(', ')})`;
  return `${property} ${duration}s ${easeString}`;
}

/**
 * [Helper] 将缓动曲线数组转换为 CSS 字符串
 * 
 * @param ease - 缓动曲线数组
 * @returns CSS cubic-bezier 字符串
 * 
 * @example
 * ```tsx
 * const easeString = getEaseString(EASE.SMOOTH); // "cubic-bezier(0.4, 0, 0.2, 1)"
 * ```
 */
export function getEaseString(ease: readonly number[]): string {
  return `cubic-bezier(${ease.join(', ')})`;
}

/**
 * [Helper] 将持续时间（秒）转换为 CSS 时间字符串（毫秒）
 * 
 * @param duration - 持续时间（秒）
 * @returns CSS 时间字符串，如 "200ms"
 * 
 * @example
 * ```tsx
 * const durationMs = getDurationMs(DURATION.FAST); // "200ms"
 * ```
 */
export function getDurationMs(duration: number): string {
  return `${duration * 1000}ms`;
}

