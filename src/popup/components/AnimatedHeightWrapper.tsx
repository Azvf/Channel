/**
 * 动画高度包装器组件
 * 
 * 提供平滑的高度过渡动画，同时避免布局抖动问题。
 * 通过分离动画容器和布局容器，确保布局只发生一次，动画平滑流畅。
 * 
 * @example
 * ```tsx
 * <AnimatedHeightWrapper className="min-h-[3.2rem]">
 *   <div className="flex flex-wrap gap-2">
 *     <Tag label="Tag 1" />
 *     <Tag label="Tag 2" />
 *   </div>
 * </AnimatedHeightWrapper>
 * ```
 */

import React, { ReactNode } from 'react';
import { useAnimatedHeight, UseAnimatedHeightOptions } from '../utils/useAnimatedHeight';

export interface AnimatedHeightWrapperProps extends UseAnimatedHeightOptions {
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
 * 该组件自动处理高度动画，你只需要将内容作为 children 传入。
 * 组件会自动创建两层结构：
 * - 外层：负责高度动画和内容裁切（overflow: hidden）
 * - 内层：负责实际布局（height: auto）
 */
export function AnimatedHeightWrapper({
  children,
  className = '',
  style,
  innerClassName = '',
  innerStyle,
  wrapperProps,
  innerProps,
  ...hookOptions
}: AnimatedHeightWrapperProps) {
  const wrapperRef = useAnimatedHeight(hookOptions);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        overflow: 'hidden',
        willChange: 'height',
        backfaceVisibility: 'hidden',
        // 只在左右和上方添加 padding 为阴影留出空间（阴影扩散约 16px）
        // 底部不需要，避免裁切底部内容
        paddingTop: '16px',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '0',
        marginTop: '-16px',
        marginLeft: '-16px',
        marginRight: '-16px',
        marginBottom: '0',
        ...style,
      }}
      {...wrapperProps}
    >
      <div
        className={innerClassName}
        style={{
          height: 'auto',
          // 内层容器底部添加 padding，确保底部内容不被裁切
          paddingBottom: '16px',
          ...innerStyle,
        }}
        {...innerProps}
      >
        {children}
      </div>
    </div>
  );
}




