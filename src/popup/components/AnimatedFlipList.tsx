// src/popup/components/AnimatedFlipList.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { SMOOTH_TRANSITION, LAYOUT_TRANSITION } from '../utils/motion';
import { SPACE } from '../utils/layoutConstants'; // [Refactor] 使用统一的间距常量

// 1. 重新导入 useRef 和 useEffect
import React, { useRef, useEffect } from 'react';

// 2. 重新添加 'initial' 变体
// [Refactor] 使用设计系统的间距常量，替代硬编码的像素值
const itemVariants = {
  initial: { opacity: 0, y: SPACE.SPACE_1_5, scale: 0.96 }, // 6px，与设计系统对齐
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: -SPACE.SPACE_2, scale: 0.96 }, // -8px，与设计系统对齐
};

interface AnimatedFlipListProps<T> {
  /**
   * 要渲染的数据数组。
   * 每一项必须有一个唯一的 `id` 字段。
   */
  items: (T & { id: string | number })[];
  
  /**
   * 渲染每个子项的函数。
   * @param item - 数组中的单个数据项
   * @returns React 节点
   */
  renderItem: (item: T) => React.ReactNode;
  
  /**
   * 渲染列表的 HTML 标签（如 'ul', 'ol'）。
   * @default 'div'
   */
  as?: React.ElementType;
  
  /**
   * 传递给容器元素的 className。
   */
  className?: string;
  
  /**
   * 传递给容器元素的 style。
   */
  style?: React.CSSProperties;
}

export function AnimatedFlipList<T>({
  items,
  renderItem,
  as: ContainerTag = 'div',
  className,
  style,
}: AnimatedFlipListProps<T>) {
  // 我们需要一个 motion 组件作为容器，以便 AnimatePresence 
  // 可以正确地将 `layout` 动画委托给它。
  const MotionContainer = motion(ContainerTag);

  // 3. 重新添加用于跟踪新元素的 Refs
  const renderedIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialMountRef = useRef(true);
  
  // 4. 重新添加首次加载逻辑
  if (isInitialMountRef.current && items.length > 0) {
    items.forEach(item => renderedIdsRef.current.add(item.id));
    isInitialMountRef.current = false;
  }
  
  // 5. 重新添加 useEffect 来同步已渲染的 ID
  useEffect(() => {
    const currentIds = new Set(items.map(item => item.id));
    
    renderedIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        renderedIdsRef.current.delete(id);
      }
    });
    
    // (注意：添加新 ID 的逻辑在 render 中处理，确保isNew立即生效)
  }, [items]);
  
  return (
    <MotionContainer 
      className={className} 
      style={style}
      // 移除容器的 layout，避免与内部 item 的 layout 冲突导致抖动
      // 内部每个 item 已经有 layout，它们会触发父级的布局更新
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => {
          // 6. 重新添加 isNew 检查
          const isNew = !renderedIdsRef.current.has(item.id);
          if (isNew) {
            renderedIdsRef.current.add(item.id);
          }
          
          return (
            <motion.div
              key={item.id}
              layout // FLIP 动画：只负责平滑的位置移动
              variants={itemVariants}
              // 7. 使用 isNew 来决定是否播放进入动画
              initial={isNew ? "initial" : false} // <--- 修复
              animate="animate"
              exit="exit"
              transition={{
                ...SMOOTH_TRANSITION, // 用于 opacity, y, x, scale
                layout: LAYOUT_TRANSITION // 用于位置 (layout)
              }}
              // [性能优化] 强制这一层拥有独立的渲染上下文
              // 告诉浏览器此元素即将发生几何变化
              style={{ 
                transform: 'translate3d(0,0,0)', // 静态时也保持层级
                willChange: 'transform'          // 动态时提示浏览器
              }}
            >
              {renderItem(item)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </MotionContainer>
  );
}
