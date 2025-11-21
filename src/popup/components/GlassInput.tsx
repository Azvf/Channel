import React, { forwardRef } from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  as?: 'input' | 'textarea';
  icon?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  rows?: number; // For textarea
}

export const GlassInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, GlassInputProps>(
  ({ as = 'input', icon, style, containerStyle, className = '', ...props }, ref) => {
    const Component = as as any;
    
    return (
      <div style={{ position: 'relative', width: '100%', ...containerStyle }} className={className}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: 'var(--space-3)',
            top: as === 'textarea' ? 'var(--space-3)' : '50%',
            transform: as === 'textarea' ? 'none' : 'translateY(-50%)',
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none',
            display: 'flex',
            zIndex: 1
          }}>
            {icon}
          </div>
        )}
        <Component
          ref={ref}
          {...props}
          style={{
            width: '100%',
            minHeight: as === 'textarea' ? '80px' : '44px', // 44px 最小高度
            paddingTop: 'var(--space-2)',
            paddingBottom: 'var(--space-2)',
            paddingLeft: icon ? 'var(--space-10)' : 'var(--space-3)', // 留出 Icon 空间
            paddingRight: 'var(--space-3)',
            
            // 玻璃质感
            background: 'var(--bg-surface-glass-subtle)', 
            border: '1px solid transparent',
            borderRadius: 'var(--radius-lg)', // 12px
            
            // 字体
            color: 'var(--color-text-primary)',
            font: 'var(--font-body)',
            fontSize: '0.9rem',
            outline: 'none',
            resize: 'none',
            transition: 'all 0.2s ease',
            
            ...style
          }}
          onFocus={(e: any) => {
            e.target.style.background = 'var(--bg-surface-glass-active)';
            e.target.style.border = '1px solid var(--border-action-subtle)';
            e.target.style.boxShadow = '0 0 0 3px var(--bg-action-subtle)'; // 柔和的光晕
            props.onFocus?.(e);
          }}
          onBlur={(e: any) => {
            e.target.style.background = 'var(--bg-surface-glass-subtle)';
            e.target.style.border = '1px solid transparent';
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
