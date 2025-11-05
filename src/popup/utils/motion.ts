import { Transition, Variants } from 'framer-motion';

/**
 * 我们的核心缓动曲线和持续时间，用于所有标准过渡。
 * 这匹配了 globals.css 中的 --ease-smooth 和 --transition-fast。
 */
export const SMOOTH_TRANSITION: Transition = {
  duration: 0.2, // 快速响应
  ease: [0.4, 0, 0.2, 1] // ease-smooth
};

/**
 * 布局动画（如高度变化）的过渡，可以稍慢以保证平滑。
 */
export const LAYOUT_TRANSITION: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1]
};

/**
 * 变体(Variant)：标准淡入/淡出
 * 用于 Tooltip, Backdrop 等
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: SMOOTH_TRANSITION },
  exit: { opacity: 0, transition: SMOOTH_TRANSITION }
};

/**
 * 变体(Variant)：淡入 + 轻微缩放
 * 用于 PagePreview 浮窗
 */
export const fadeAndScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: SMOOTH_TRANSITION },
  exit: { opacity: 0, scale: 0.95, transition: SMOOTH_TRANSITION }
};

/**
 * 变体(Variant)：弹窗滑入
 * 用于 SettingsModal, EditPageDialog 等
 * 注意：此 variant 假设元素使用 left: 50%, top: 50% 定位
 * 通过 x: "-50%", y: "-50%" 实现居中，同时保持滑入动画
 */
export const dialogSlideIn: Variants = {
  hidden: {
    opacity: 0,
    x: "-50%", // 水平居中
    y: "calc(-50% + 16px)", // 垂直居中但稍微偏下（滑入起点）
    scale: 0.98
  },
  visible: {
    opacity: 1,
    x: "-50%", // 水平居中
    y: "-50%", // 垂直居中
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1] // Apple/Notion 风格的 "easeOutCubic"
    }
  },
  exit: {
    opacity: 0,
    x: "-50%", // 水平居中
    y: "calc(-50% + 16px)", // 垂直居中但稍微偏下（滑出终点）
    scale: 0.98,
    transition: SMOOTH_TRANSITION
  }
};

