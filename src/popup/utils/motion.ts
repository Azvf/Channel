import { Transition, Variants } from 'framer-motion';
import { DURATION, EASE } from '../../design-tokens/animation'; // [Refactor] 引入物理法则
import { SPACE } from './layoutConstants'; // [Refactor] 引入间距常量，保持 JS/CSS 值同步

/**
 * 标准平滑过渡
 * 对应 CSS --transition-fast + --ease-smooth
 * 用于微交互 (Hover, Click, Focus)
 */
export const SMOOTH_TRANSITION: Transition = {
  duration: DURATION.FAST,
  ease: EASE.SMOOTH
};

/**
 * 布局过渡 (稍慢，强调过程)
 * 对应 CSS --transition-base + --ease-smooth
 * 用于布局动画（如高度变化、列表展开）
 */
export const LAYOUT_TRANSITION: Transition = {
  duration: DURATION.BASE,
  ease: EASE.SMOOTH
};

/**
 * 弹窗滑入过渡 (Apple 风格)
 * 用于 Modal、Dialog 等需要"分量感"的界面切换
 */
export const DIALOG_TRANSITION: Transition = {
  duration: 0.25, // 特殊微调值，介于 Fast 和 Base 之间
  ease: EASE.OUT_CUBIC
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
    // [Refactor] 16px -> SPACE.SPACE_4，保持 JS/CSS 值同步
    y: `calc(-50% + ${SPACE.SPACE_4}px)`, // 垂直居中但稍微偏下（滑入起点）
    scale: 0.98
  },
  visible: {
    opacity: 1,
    x: "-50%", // 水平居中
    y: "-50%", // 垂直居中
    scale: 1,
    // [Refactor] 使用统一的 DIALOG_TRANSITION
    transition: DIALOG_TRANSITION
  },
  exit: {
    opacity: 0,
    x: "-50%", // 水平居中
    // [Refactor] 16px -> SPACE.SPACE_4，保持 JS/CSS 值同步
    y: `calc(-50% + ${SPACE.SPACE_4}px)`, // 垂直居中但稍微偏下（滑出终点）
    scale: 0.98,
    transition: SMOOTH_TRANSITION
  }
};

