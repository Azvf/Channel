import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '../utils/motion';
import { POSITIONING } from '../utils/layoutConstants';
import { DURATION } from '../tokens/animation'; // [Refactor] 使用统一的动画常量

interface ActivityTooltipProps {
  children: React.ReactElement;
  content: string;
}

export function ActivityTooltip({ children, content }: ActivityTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // [Refactor] 使用标准定位常量
    const viewportMargin = POSITIONING.VIEWPORT_MARGIN;
    const tooltipOffset = POSITIONING.TOOLTIP_OFFSET;

    let top = triggerRect.top - tooltipRect.height - tooltipOffset;
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

    // 1. 垂直回退 (Fallback Chain)
    if (top < viewportMargin) {
      // 如果上方空间不够，放到下方
      top = triggerRect.bottom + tooltipOffset;
    }
    // 钳制在视口内
    top = Math.max(viewportMargin, Math.min(top, viewportHeight - tooltipRect.height - viewportMargin));

    // 2. 水平钳制
    left = Math.max(viewportMargin, Math.min(left, viewportWidth - tooltipRect.width - viewportMargin));
    
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
    // [Refactor] 300 -> DURATION.BASE * 1000，与系统动画节奏一致
    timerRef.current = setTimeout(() => {
      setShow(true);
    }, DURATION.BASE * 1000);
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
      // 使用类型断言来处理 ref
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      // 如果 children 有 ref，也调用它
      const childRef = (children as any).ref;
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && 'current' in childRef) {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  });

  const tooltipElement = (
    <motion.div
      ref={tooltipRef}
      className="fixed px-2.5 py-1.5 rounded-lg"
      style={{
        // [Refactor] 使用明确的 Tooltip 层级
        zIndex: 'var(--z-tooltip)',
        top: position.top,
        left: position.left,
        // [Refactor] Tokenized Tooltip Styles
        background: 'var(--tooltip-bg)',
        border: 'var(--tooltip-border)',
        boxShadow: 'var(--tooltip-shadow)',
        fontSize: 'var(--tooltip-font-size)',
        fontWeight: 500,
        color: 'var(--tooltip-text-color)',
        backdropFilter: 'blur(12px)', // Optional: keep specific blur if needed
        pointerEvents: 'none',
      }}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {content}
    </motion.div>
  );

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' && (
        <AnimatePresence>
          {show && createPortal(tooltipElement, document.body)}
        </AnimatePresence>
      )}
    </>
  );
}

