import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(({ 
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
      borderRadius: 'var(--radius-full)', // 胶囊形状
      font: 'var(--font-label)', // 使用 Label 字体 (Bold, Small)
      letterSpacing: '0.02em',
      cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
      opacity: (disabled || isLoading) ? 0.6 : 1,
      border: 'none',
      outline: 'none',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
      sm: { height: '32px', padding: '0 var(--space-3)', fontSize: '0.75rem' },
      md: { height: '44px', padding: '0 var(--space-5)', fontSize: '0.9rem' }, // 核心尺寸
      lg: { height: '56px', padding: '0 var(--space-6)', fontSize: '1rem' },
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

GlassButton.displayName = 'GlassButton';
