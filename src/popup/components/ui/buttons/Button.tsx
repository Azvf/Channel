import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { getTransition, DURATION } from '../../../../design-tokens/animation';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  variant = 'secondary', 
  size = 'md',
  icon,
  isLoading,
  style,
  disabled,
  ...props 
}, ref) => {
  
  const getStyles = () => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      borderRadius: 'var(--radius-xs)', // 鹅卵石
      font: 'var(--font-label)', // 使用 Label 字体 (Bold, Small)
      letterSpacing: '0.02em',
      cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
      // [Refactor] 使用标准透明度 Token
      opacity: (disabled || isLoading) ? 'var(--opacity-disabled)' : 1,
      border: 'none',
      outline: 'none',
      // [Refactor] 使用统一的物理引擎，确保与 Framer Motion 同步
      transition: getTransition(DURATION.FAST),
      position: 'relative',
    };

    const variants = {
      primary: {
        background: 'var(--bg-action-solid)',
        color: '#ffffff', // 强制白色，保证在任何主题下的对比度
        boxShadow: 'var(--shadow-md)',
      },
      secondary: {
        background: 'var(--bg-surface-glass)',
        border: '1px solid var(--border-glass-subtle)',
        color: 'var(--color-text-primary)',
      },
      ghost: {
        background: 'transparent',
        color: 'var(--color-text-secondary)',
      },
      destructive: {
        background: 'var(--bg-surface-glass)',
        border: '1px solid var(--color-destructive)',
        color: 'var(--color-destructive)',
      }
    };

    const sizes = {
      sm: { 
        height: 'var(--control-height-sm)', // [Refactor] 使用标准控件高度 Token
        padding: '0 var(--space-3)', 
        font: 'var(--font-small)' // [Refactor] 使用标准字体 Token
      },
      md: { 
        height: 'var(--control-height-md)', // [Refactor] 使用标准控件高度 Token (原 --row-min-height)
        padding: '0 var(--space-5)', 
        font: 'var(--font-label)' // [Refactor] 使用标准字体 Token
      },
      lg: { 
        height: 'var(--control-height-lg)', // [Refactor] 使用标准控件高度 Token
        padding: '0 var(--space-6)', 
        font: 'var(--font-body)' // [Refactor] 使用标准字体 Token
      },
    };

    return { ...base, ...variants[variant], ...sizes[size] };
  };

  return (
    <motion.button
      ref={ref}
      {...props}
      style={{ ...getStyles(), ...style } as any}
      whileTap={!(disabled || isLoading) ? { scale: 0.96 } : undefined}
      whileHover={!(disabled || isLoading) && variant !== 'primary' ? { 
        backgroundColor: variant === 'destructive' ? 'var(--hover-bg-destructive)' : 'var(--bg-surface-glass-hover)' 
      } : undefined}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
         // 简单的 Loading 占位，后续可用 SVG 替换
        <span style={{ width: '1em', height: '1em', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      ) : (
        <>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {children}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.button>
  );
});

Button.displayName = 'Button';

