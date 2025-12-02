import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { getTransition, DURATION } from '../../../../design-tokens/animation';

interface IconButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'ghost' | 'destructive' | 'hud'; // hud 变体用于 hud-button-settings，使用 --radius-md 圆角
  size?: 'sm' | 'md' | 'lg';
  /** 图标模式：传入单个图标。如果同时传入 icon 和 children，优先使用 icon */
  icon?: React.ReactNode;
  /** 容器模式：传入多个子元素（原 HudButton 功能）。仅在未传入 icon 时生效 */
  children?: React.ReactNode;
  hoverScale?: boolean; // 是否启用 hover 缩放效果
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ 
  variant = 'ghost',
  size = 'md',
  icon,
  children,
  hoverScale = false,
  className = '',
  style,
  disabled,
  ...props 
}, ref) => {
  // 容器模式需要应用不同的样式策略（负边距、更大的圆角），因此需要区分模式
  const isContainerMode = children !== undefined && icon === undefined;
  
  // 开发时警告：如果同时传入 icon 和 children，优先使用 icon
  if (process.env.NODE_ENV === 'development' && icon !== undefined && children !== undefined) {
    console.warn('IconButton: 同时传入了 icon 和 children，将优先使用 icon。如需容器模式，请移除 icon prop。');
  }
  
  const getStyles = () => {
    // hud 变体和容器模式需要更大的圆角以匹配 HUD 区域的视觉风格
    const borderRadius = (variant === 'hud' || isContainerMode) ? 'var(--radius-md)' : 'var(--radius-xs)';
    
    // hud 变体和容器模式的 transform 动画通过 CSS 实现，需要完整的 transition 声明以支持所有属性
    const transition = (variant === 'hud' || isContainerMode)
      ? 'color var(--transition-fast) var(--ease-smooth), transform var(--transition-fast) var(--ease-smooth), background-color var(--transition-fast) var(--ease-smooth)'
      : getTransition(DURATION.FAST);
    
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius,
      background: 'transparent',
      border: '1px solid transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 'var(--opacity-disabled)' : 1,
      outline: 'none',
      transition,
    };

    // 容器模式需要负边距以扩大点击区域，提升可用性（符合 Fitts' Law）
    if (isContainerMode) {
      base.padding = 'var(--space-1)';
      base.margin = '-var(--space-1)';
    } else {
      // 图标模式根据 size 使用不同的 padding，确保视觉层次清晰
      const sizes = {
        sm: { 
          padding: 'var(--space-1_5)',
        },
        md: { 
          padding: 'var(--space-2)',
        },
        lg: { 
          padding: 'var(--space-2_5)',
        },
      };
      Object.assign(base, sizes[size]);
    }

    const variants = {
      ghost: {
        color: 'var(--color-text-tertiary)',
      },
      destructive: {
        color: 'var(--color-text-tertiary)',
      },
      hud: {
        color: 'var(--color-text-tertiary)',
      }
    };

    return { ...base, ...variants[variant || 'ghost'] };
  };

  const getHoverStyles = () => {
    if (disabled) return undefined;
    
    // hud 变体和容器模式的 transform 动画通过 CSS 类实现，避免与 Framer Motion 冲突
    if (variant === 'hud' || isContainerMode) {
      return undefined;
    }
    
    const baseHover: any = {};
    
    if (hoverScale) {
      baseHover.scale = 1.1;
    }
    
    return Object.keys(baseHover).length > 0 ? baseHover : undefined;
  };

  // 构建 className：容器模式使用 hud-button 类以应用对应的 CSS hover 效果
  const buttonClassName = [
    isContainerMode ? 'hud-button' : 'icon-button',
    variant === 'ghost' ? 'icon-button-ghost' : '',
    variant === 'destructive' ? 'icon-button-destructive' : '',
    variant === 'hud' ? 'icon-button-hud' : '',
    variant === 'hud' && hoverScale ? 'icon-button-hud-scale' : '',
    disabled && isContainerMode ? 'hud-button-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <motion.button
      ref={ref}
      {...props}
      className={buttonClassName}
      style={{ ...getStyles(), ...style } as any}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      whileHover={getHoverStyles()}
      disabled={disabled}
    >
      {isContainerMode ? children : icon}
    </motion.button>
  );
});

IconButton.displayName = 'IconButton';

