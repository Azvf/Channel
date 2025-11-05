import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ActivityTooltipProps {
  children: React.ReactElement;
  content: string;
}

// 边距常量
const VIEWPORT_MARGIN = 8; // 8px 边距

export function ActivityTooltip({ children, content }: ActivityTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.top - tooltipRect.height - 8; // 8px 间距
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

    // 1. 垂直回退 (Fallback Chain)
    if (top < VIEWPORT_MARGIN) {
      // 如果上方空间不够，放到下方
      top = triggerRect.bottom + 8;
    }
    // 钳制在视口内
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, viewportHeight - tooltipRect.height - VIEWPORT_MARGIN));

    // 2. 水平钳制
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - tooltipRect.width - VIEWPORT_MARGIN));
    
    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (show) {
      updatePosition();
      
      // 监听滚动和窗口大小变化，更新位置
      const handleUpdate = () => {
        updatePosition();
      };
      
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [show]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShow(true);
    }, 300); // 延迟 300ms
    // 调用原有的 onMouseEnter（如果有）
    if (children.props.onMouseEnter) {
      children.props.onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
    // 调用原有的 onMouseLeave（如果有）
    if (children.props.onMouseLeave) {
      children.props.onMouseLeave(e);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 克隆 children (activity-bar 或其他元素) 并附加 ref 和事件
  const trigger = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // 如果 children 有 ref，也调用它
      if (typeof children.ref === 'function') {
        children.ref(node);
      } else if (children.ref && 'current' in children.ref) {
        (children.ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  });

  const tooltipElement = show && (
    <div
      ref={tooltipRef}
      className="fixed z-[300] px-2.5 py-1.5 rounded-lg"
      style={{
        top: position.top,
        left: position.left,
        background: 'color-mix(in srgb, var(--c-bg) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        border: '1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--c-content)',
        pointerEvents: 'none',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      {content}
      
      {/* (可选) 添加一个小箭头，但为了极简，我倾向于不加 */}
    </div>
  );

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
      <style>
        {`@keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }`}
      </style>
    </>
  );
}

