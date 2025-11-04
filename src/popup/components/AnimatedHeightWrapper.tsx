/**
 * 动画高度包装器组件
 * 
 * (已修复) 移除了所有 padding/margin 技巧，
 * 这是一个纯粹的 "overflow: hidden" 容器，
 * 用于配合 `useAnimatedHeight` 或 Framer Motion 的 `layout` prop。
 */

import React, { ReactNode } from 'react';

export interface AnimatedHeightWrapperProps {
  /**
   * 子元素内容
   */
  children: ReactNode;
  
  /**
   * 外层容器的 className
   */
  className?: string;
  
  /**
   * 外层容器的 style
   */
  style?: React.CSSProperties;
  
  /**
   * 内层容器的 className
   */
  innerClassName?: string;
  
  /**
   * 内层容器的 style
   */
  innerStyle?: React.CSSProperties;
  
  /**
   * 外层容器的额外样式属性（如 willChange, backfaceVisibility 等）
   */
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  
  /**
   * 内层容器的额外样式属性
   */
  innerProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * 动画高度包装器组件
 * 
 * 用于内容裁切和布局，不参与 layout 动画以避免内部元素出现渐入渐出效果。
 * 高度变化由父级的 layout 动画处理。
 * 组件会自动创建两层结构：
 * - 外层：负责内容裁切（overflow: hidden），不使用 layout 动画
 * - 内层：普通 div，负责实际布局（height: auto）
 */
export function AnimatedHeightWrapper({
  children,
  className = '',
  style,
  innerClassName = '',
  innerStyle,
  wrapperProps,
  innerProps,
}: AnimatedHeightWrapperProps) {
  return (
    <div
      className={className}
      style={{
        overflow: 'hidden', // <--- 只保留 overflow: hidden
        ...style,
      }}
      {...wrapperProps}
    >
      <div
        className={innerClassName}
        style={{
          height: 'auto', // <--- 内层高度自动
          ...innerStyle,
        }}
        {...innerProps}
      >
        {children}
      </div>
    </div>
  );
}




