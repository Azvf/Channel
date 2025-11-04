// src/popup/components/AnimatedFlipList.tsx

import { motion, AnimatePresence } from 'framer-motion';

import React from 'react';

// 定义动画变体，移除 initial 变体（不再需要进入动画）

const itemVariants = {

  animate: { opacity: 1, y: 0, scale: 1 },

  exit: { opacity: 0, x: -10, scale: 0.8 },

};

// 定义过渡效果

const itemTransition = { 

  duration: 0.3, 

  ease: [0.4, 0, 0.2, 1] as const // easeOut cubic-bezier

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

  

  return (

    <MotionContainer 

      className={className} 

      style={style}

      // 移除容器的 layout，避免与内部 item 的 layout 冲突导致抖动

      // 内部每个 item 已经有 layout，它们会触发父级的布局更新

    >

      <AnimatePresence mode="popLayout" initial={false}>

        {items.map((item) => (

          <motion.div

            key={item.id}

            layout // FLIP 动画：只负责平滑的位置移动

            variants={itemVariants}

            initial={false} // 彻底修复：禁用进入动画，新元素立即以 animate 状态出现

            animate="animate"

            exit="exit"

            transition={{

              ...itemTransition,

              // layout 动画独立配置，只改变位置，不影响透明度

              layout: {

                duration: 0.3,

                ease: [0.4, 0, 0.2, 1]

              }

            }}

          >

            {renderItem(item)}

          </motion.div>

        ))}

      </AnimatePresence>

    </MotionContainer>

  );

}
