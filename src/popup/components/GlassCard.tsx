import React, { useState, useEffect } from 'react';
import { GlassDepthProvider, useGlassDepth } from '../context/GlassDepthContext';

// 让 Props 继承 HTMLAttributes，支持所有标准的 div 属性
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  /**
   * 性能开关：如果这是一个频繁移动/动画的卡片，设为 true
   * 在动画期间会自动禁用模糊效果以提升性能
   */
  isAnimated?: boolean;
  /**
   * 允许手动覆盖深度（例如 Modal 应该始终是 Level 10）
   * 这对于 Portal 渲染的场景特别有用
   */
  depthLevel?: number;
  /**
   * 外部控制的动画状态（可选）
   * 如果提供了此属性，将使用它而不是内部状态
   */
  isAnimating?: boolean;
}

export function GlassCard({ 
  children, 
  className = "", 
  style = {}, 
  disabled = false,
  isAnimated = false,
  depthLevel,
  isAnimating: externalIsAnimating,
  onClick,
  ...rest 
}: GlassCardProps) {
  const parentDepth = useGlassDepth();
  
  // 实际使用的深度
  const depth = depthLevel ?? parentDepth;
  
  // 内部动画状态管理
  const [internalIsAnimating, setInternalIsAnimating] = useState(false);
  
  // 检测动画状态
  useEffect(() => {
    if (isAnimated || externalIsAnimating !== undefined) {
      const shouldBeAnimating = isAnimated || externalIsAnimating || false;
      setInternalIsAnimating(shouldBeAnimating);
      
      // 动画结束后延迟恢复，避免闪烁
      if (!shouldBeAnimating) {
        const timer = setTimeout(() => {
          setInternalIsAnimating(false);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isAnimated, externalIsAnimating]);
  
  // 判断是否处于性能模式
  const isPerformanceMode = isAnimated || internalIsAnimating || externalIsAnimating || false;
  
  const combinedClassName = [
    'liquidGlass-wrapper',
    isPerformanceMode ? 'performance-mode' : '', // 动画模式下会有特殊处理
    disabled ? 'glasscard-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick: React.MouseEventHandler<HTMLDivElement> | undefined = disabled
    ? (event) => {
        event.preventDefault();
        event.stopPropagation();
      }
    : onClick;

  return (
    // 每一个 GlassCard 都是一个新的 Provider，为其子元素提供 +1 的深度
    <GlassDepthProvider forceDepth={depthLevel}>
      <div 
        className={combinedClassName} 
        style={{
          // 传入 CSS 变量供 calc() 使用
          '--local-depth': depth,
          ...style
        } as React.CSSProperties}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        {...rest} // 将剩余属性（包括 onMouseEnter 等）传递给这个 div
      >
        {/* 开发模式下显示深度（用于调试） */}
        {process.env.NODE_ENV === 'development' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '10px',
              opacity: 0.5,
              padding: '2px 4px',
              background: 'var(--bg-surface-glass-active)', // Tokenized
              color: 'var(--color-text-primary)', // Tokenized
              borderRadius: '0 1.4em 0 0',
              pointerEvents: 'none',
              // [Refactor] 开发模式调试信息使用最高层级，确保显示在所有内容之上
              zIndex: 'var(--z-cursor-drag)',
            }}
          >
            D:{depth}
          </div>
        )}
        <div className="liquidGlass-content">
          {children}
        </div>
      </div>
    </GlassDepthProvider>
  );
}
