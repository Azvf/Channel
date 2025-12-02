import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '../utils/motion';
import { POSITIONING } from '../utils/layoutConstants';
import { DURATION } from '../../design-tokens/animation';
import { GlassCard } from './GlassCard';

interface ActivityTooltipProps {
  children: React.ReactElement;
  content: string;
}

/**
 * ActivityTooltip Component
 * 
 * 显示在活动元素上方的工具提示
 * 使用手动定位和 Portal 渲染
 */
export function ActivityTooltip({ children, content }: ActivityTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, DURATION.BASE * 1000); // 300ms 延迟
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useLayoutEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // 优先显示在上方，空间不足时切换到下方
      const spaceAbove = triggerRect.top;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const showAbove = spaceAbove >= tooltipRect.height + POSITIONING.TOOLTIP_OFFSET || spaceAbove > spaceBelow;

      const top = showAbove
        ? triggerRect.top - tooltipRect.height - POSITIONING.TOOLTIP_OFFSET
        : triggerRect.bottom + POSITIONING.TOOLTIP_OFFSET;
      const left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, content]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerElement = React.cloneElement(children, {
    ref: (node: HTMLElement) => {
      triggerRef.current = node;
      // 如果 children 已经有 ref，也要调用它
      const originalRef = (children as any).ref;
      if (typeof originalRef === 'function') {
        originalRef(node);
      } else if (originalRef && typeof originalRef === 'object' && 'current' in originalRef) {
        // 使用类型断言处理 ref.current
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (originalRef as any).current = node;
      }
    },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  });

  return (
    <>
      {triggerElement}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={tooltipRef}
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 'var(--z-tooltip)',
                pointerEvents: 'none',
              }}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <GlassCard
                depthLevel={1}
                style={{
                  padding: 'var(--space-1_5) var(--space-2_5)',
                  borderRadius: 'var(--radius-lg)',
                  border: 'var(--tooltip-border)',
                  boxShadow: 'var(--tooltip-shadow)',
                  fontSize: 'var(--tooltip-font-size)',
                  fontWeight: 500,
                  color: 'var(--tooltip-text-color)',
                }}
              >
                {content}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
