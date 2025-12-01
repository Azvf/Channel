import { useEffect, RefObject } from 'react';

export interface UseModalScrollLockProps {
  isOpen: boolean;
  modalRef: RefObject<HTMLElement>;
  scrollableContentRef: RefObject<HTMLElement>;
}

/**
 * Headless Hook for Modal scroll locking
 * 
 * Prevents background page scrolling when modal is open, while allowing:
 * - Scrolling within the modal's scrollable content area
 * - Scrolling within editable elements (textarea/input) even if parent container cannot scroll
 * 
 * Follows Headless Hooks Pattern: pure logic, no DOM manipulation, works through refs
 */
export function useModalScrollLock({
  isOpen,
  modalRef,
  scrollableContentRef,
}: UseModalScrollLockProps): void {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // 添加属性标记对话框打开状态
    document.body.setAttribute('data-modal-open', 'true');

    // 保存原始状态
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // 禁用body和html的滚动
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // 辅助函数：检查元素是否是可编辑元素（textarea 或 input）
    const isEditableElement = (element: HTMLElement | null): boolean => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      return tagName === 'textarea' || tagName === 'input';
    };

    // 辅助函数：检查特定元素是否可以滚动
    const canElementScroll = (element: HTMLElement | null, deltaY: number): boolean => {
      if (!element) return false;
      const { scrollTop, scrollHeight, clientHeight } = element;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // 如果已经在顶部/底部且还要继续滚动，不允许
      if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) {
        return false;
      }
      return true;
    };

    // 辅助函数：检查元素是否在对话框的可滚动内容区域内
    const isInScrollableArea = (target: EventTarget | null): boolean => {
      if (!target || !scrollableContentRef.current) return false;
      const element = target as HTMLElement;
      return scrollableContentRef.current.contains(element) || scrollableContentRef.current === element;
    };

    // 辅助函数：检查元素是否在对话框内（包括header和footer）
    const isInDialog = (target: EventTarget | null): boolean => {
      if (!target || !modalRef.current) return false;
      const element = target as HTMLElement;
      return modalRef.current.contains(element) || modalRef.current === element;
    };

    // 检查可滚动内容区域是否可以继续滚动
    const canScrollableAreaScroll = (deltaY: number): boolean => {
      if (!scrollableContentRef.current) return false;
      return canElementScroll(scrollableContentRef.current, deltaY);
    };

    // 在捕获阶段拦截滚轮事件
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;

      // 优先检查：如果是可编辑元素，检查该元素本身的滚动能力
      if (isEditableElement(target)) {
        if (canElementScroll(target, e.deltaY)) {
          // 可编辑元素可以滚动，允许滚动但阻止事件冒泡到底层
          e.stopPropagation();
          return;
        }
        // 可编辑元素不能滚动，继续检查父容器
      }

      // 如果在对话框的可滚动内容区域内
      if (isInScrollableArea(target)) {
        if (canScrollableAreaScroll(e.deltaY)) {
          // 允许滚动，但阻止事件继续冒泡到底层
          e.stopPropagation();
        } else {
          // 不能继续滚动，阻止默认行为和冒泡
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      } else {
        // 不在可滚动区域内，完全阻止
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // 拦截触摸滚动事件
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // 如果是可编辑元素，允许触摸滚动
      if (isEditableElement(target)) {
        e.stopPropagation();
        return;
      }

      // 只有在可滚动内容区域内才允许触摸滚动
      if (!isInScrollableArea(target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else {
        e.stopPropagation();
      }
    };

    // 拦截滚动事件（防止通过其他方式滚动）
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;

      // 如果是可编辑元素，允许滚动事件
      if (isEditableElement(target)) {
        e.stopPropagation();
        return;
      }

      // 如果滚动发生在对话框外，阻止
      if (!isInDialog(target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else {
        e.stopPropagation();
      }
    };

    // 使用捕获阶段，确保在事件到达目标之前拦截
    const options = { passive: false, capture: true };
    document.addEventListener('wheel', handleWheel, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('scroll', handleScroll, options);

    // 也阻止键盘滚动（空格、方向键等）
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const scrollKeys = [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];

      if (scrollKeys.includes(e.key)) {
        // 如果是可编辑元素，允许键盘滚动操作
        if (isEditableElement(target)) {
          // 允许键盘滚动，但阻止事件冒泡到底层
          e.stopPropagation();
          return;
        }

        // 如果不在对话框内，阻止键盘滚动
        if (!isInDialog(target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } else if (!isInScrollableArea(target)) {
          // 在对话框内但不在可滚动区域，也阻止
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, options);

    return () => {
      // 移除属性标记
      document.body.removeAttribute('data-modal-open');

      // 恢复原始状态
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;

      // 移除所有事件监听器
      document.removeEventListener('wheel', handleWheel, options as any);
      document.removeEventListener('touchmove', handleTouchMove, options as any);
      document.removeEventListener('scroll', handleScroll, options as any);
      document.removeEventListener('keydown', handleKeyDown, options as any);
    };
  }, [isOpen, modalRef, scrollableContentRef]);
}

