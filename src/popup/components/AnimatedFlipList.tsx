// src/popup/components/AnimatedFlipList.tsx

import { motion, AnimatePresence } from 'framer-motion';

import React, { useRef, useEffect } from 'react';

// 定义动画变体，使其可复用

const itemVariants = {

  initial: { opacity: 0, y: 5, scale: 0.9 },

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

  // 跟踪已经渲染过的元素 ID，避免已存在的元素重新播放进入动画

  const renderedIdsRef = useRef<Set<string | number>>(new Set());

  const isInitialMountRef = useRef(true);

  

  // 在首次渲染前，预先标记所有初始元素为已渲染，避免首次加载时所有元素都播放进入动画

  if (isInitialMountRef.current && items.length > 0) {

    items.forEach(item => renderedIdsRef.current.add(item.id));

    isInitialMountRef.current = false;

  }

  

  // 更新已渲染的 ID 集合

  useEffect(() => {

    // 创建当前 items 的 ID 集合

    const currentIds = new Set(items.map(item => item.id));

    

    // 移除已删除的 ID

    renderedIdsRef.current.forEach(id => {

      if (!currentIds.has(id)) {

        renderedIdsRef.current.delete(id);

      }

    });

    

    // 添加新的 ID（在渲染时已经检查过，这里只是确保同步）

    items.forEach(item => {

      if (!renderedIdsRef.current.has(item.id)) {

        renderedIdsRef.current.add(item.id);

      }

    });

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

          // 只对新添加的元素播放进入动画

          const isNew = !renderedIdsRef.current.has(item.id);

          

          return (

            <motion.div

              key={item.id}

              layout // FLIP 动画

              variants={itemVariants} // 使用统一定义的动画

              initial={isNew ? "initial" : false} // 只有新元素才播放进入动画

              animate="animate"

              exit="exit"

              transition={{
                ...itemTransition,
                // layout 动画应该快速且不改变透明度，避免渐入渐出效果
                layout: {
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1]
                }
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

