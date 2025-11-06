import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag } from './Tag';
import { LAYOUT_TRANSITION, SMOOTH_TRANSITION } from '../utils/motion';

/**
 * 标签动画的统一定义
 */
const tagVariants = {
  initial: { opacity: 0, scale: 0.8, y: 5 },
  animate: { opacity: 1, scale: 1, y: 0, transition: SMOOTH_TRANSITION },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    x: -10, 
    transition: { ...SMOOTH_TRANSITION, duration: 0.15 }
  },
};

/**
 * 定义 AnimatedTagList 期望的标签数据结构
 */
export interface TagListItem {
  id: string | number;
  label: string;
}

interface AnimatedTagListProps {
  /**
   * 要渲染的标签数组
   */
  tags: TagListItem[];
  /**
   * 移除标签时的回调函数 (按 ID)
   * 如果不提供，标签将不显示删除按钮（只读模式）
   */
  onRemove?: (id: string | number) => void;
  /**
   * 允许传递额外的 className 到 motion.div
   */
  motionClassName?: string;
}

/**
 * 统一的、带动画的标签列表组件 (底层)
 * 负责处理所有标签的 FLIP 动画、进入和退出动画。
 */
export function AnimatedTagList({ tags, onRemove, motionClassName = "inline-flex" }: AnimatedTagListProps) {
  return (
    <AnimatePresence mode="popLayout">
      {tags.map((tag) => (
        <motion.div
          key={tag.id}
          layout // 子元素 FLIP 动画
          variants={tagVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            layout: LAYOUT_TRANSITION, // 位置 (FLIP) 动画
            default: SMOOTH_TRANSITION // 进入/退出 (opacity/scale) 动画
          }}
          // [核心修复] 
          // 确保 motion 包装器是 inline-flex, 
          // 以便在 flex-wrap 容器中正确布局
          className={motionClassName}
        >
          <Tag 
            label={tag.label} 
            onRemove={onRemove ? () => onRemove(tag.id) : undefined}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
