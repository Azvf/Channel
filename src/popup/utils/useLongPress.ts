import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<EventTarget | null>(null);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'mousedown' && (e as React.MouseEvent).button !== 0) {
      return; // 只处理左键
    }
    targetRef.current = e.currentTarget;
    timeoutRef.current = setTimeout(() => {
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((e: React.MouseEvent | React.TouchEvent, shouldTriggerClick = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (shouldTriggerClick && onClick && targetRef.current === e.currentTarget) {
      onClick(e);
    }
    targetRef.current = null;
  }, [onClick]);

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e, true),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e, true),
    onTouchCancel: (e: React.TouchEvent) => clear(e, false),
  };
}

