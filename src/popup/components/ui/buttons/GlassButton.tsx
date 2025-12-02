import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'secondary' | 'primary' | 'destructive';
  children: React.ReactNode;
}

/**
 * GlassButton - 保留原始 glass-button CSS 样式的独立组件
 * 
 * 特点：
 * - 使用相对单位 padding (0.6em 1.2em)，自适应字体大小
 * - 内阴影效果 (var(--shadow-glass-button-inner))
 * - Hover: 颜色变化 + scale(1.05)
 * - Active: scale(0.98)
 * 
 * 与 Button 组件的区别：
 * - Button 使用固定 padding 和 Framer Motion
 * - GlassButton 使用 CSS 类和相对单位
 */
export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(({ 
  variant = 'secondary',
  className = '',
  disabled,
  children,
  ...props 
}, ref) => {
  
  // 构建 className
  const buttonClassName = [
    'glass-button',
    variant === 'primary' ? 'primary' : '',
    variant === 'destructive' ? 'destructive' : '',
    disabled ? 'disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={buttonClassName}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';


