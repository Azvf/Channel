/**
 * 动画高度包装器组件 - 基于 React Spring
 * 
 * 提供平滑的高度过渡动画，同时避免布局抖动问题。
 * 使用 React Spring 实现基于物理的流畅动画。
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
import { animated } from '@react-spring/web';
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
 * - 外层：使用 React Spring 实现高度动画和内容裁切（overflow: hidden）
 * - 内层：负责实际布局（height: auto）
 * 
 * React Spring 的优势：
 * - 基于物理的动画，更自然流畅
 * - 自动插值，性能更好
 * - 支持弹性、缓动等多种动画效果
 * - 更好的性能优化，减少 layout thrashing
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
  const { ref, innerRef, style: animatedStyle } = useAnimatedHeight(hookOptions);

  return (
    <animated.div
      ref={ref}
      className={className}
      style={{
        overflow: 'hidden',
        willChange: 'height',
        backfaceVisibility: 'hidden',
        ...animatedStyle,
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
      } as any}
      {...wrapperProps}
    >
      <div
        ref={innerRef}
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
    </animated.div>
  );
}