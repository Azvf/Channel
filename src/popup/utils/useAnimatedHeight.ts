/**
 * 高度动画 Hook
 * 
 * 用于实现平滑的高度过渡动画，同时避免布局抖动问题。
 * 通过分离动画容器和布局容器，确保布局只发生一次，动画平滑流畅。
 * 
 * @param options - 配置选项
 * @returns ref 对象，需要绑定到外层容器上
 * 
 * @example
 * ```tsx
 * const wrapperRef = useAnimatedHeight({ 
 *   duration: 200,
 *   easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
 * });
 * 
 * return (
 *   <div ref={wrapperRef} style={{ overflow: 'hidden' }}>
 *     <div style={{ height: 'auto' }}>
 *       你的内容
 *     </div>
 *   </div>
 * );
 * ```
 */

import { useEffect, RefObject, useRef } from 'react';

export interface UseAnimatedHeightOptions {
  /**
   * 动画持续时间（毫秒）
   * @default 200
   */
  duration?: number;
  
  /**
   * CSS 过渡缓动函数
   * @default 'cubic-bezier(0.25, 0.1, 0.25, 1)'
   */
  easing?: string;
  
  /**
   * 高度变化的最小阈值（像素），小于此值不会触发动画
   * @default 1
   */
  threshold?: number;
  
  /**
   * 防抖延迟（毫秒）
   * @default 16
   */
  debounceMs?: number;
  
  /**
   * 是否启用 MutationObserver 监听 DOM 结构变化
   * @default true
   */
  observeMutations?: boolean;
  
  /**
   * 是否启用 ResizeObserver 监听内容大小变化
   * @default true
   */
  observeResize?: boolean;
}

/**
 * 高度动画 Hook
 * 
 * 返回一个 ref，需要绑定到外层容器元素上。该容器应该：
 * 1. 设置 overflow: hidden 来裁切内容
 * 2. 内部包含一个高度为 auto 的内容容器
 * 3. 不要在外层容器上设置 flex 等布局样式（应该在内层容器上设置）
 */
export function useAnimatedHeight(
  options: UseAnimatedHeightOptions = {}
): RefObject<HTMLDivElement> {
  const {
    duration = 200,
    easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    threshold = 1,
    debounceMs = 16,
    observeMutations = true,
    observeResize = true,
  } = options;

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let rafId: number;
    let timeoutId: NodeJS.Timeout;
    let isUpdating = false;

    // 更新高度的函数
    const updateHeight = () => {
      if (isUpdating) return;
      
      // 获取当前渲染的高度（如果已设置固定值）
      const currentHeight = wrapper.offsetHeight;
      
      // 关键优化：使用临时克隆来测量新高度，避免影响实际布局
      // 创建一个临时的测量容器来获取新高度，而不改变实际容器的高度
      const tempWrapper = wrapper.cloneNode(true) as HTMLElement;
      
      // 复制计算样式，确保测量准确
      const computedStyle = window.getComputedStyle(wrapper);
      tempWrapper.style.cssText = computedStyle.cssText;
      
      // 设置临时容器的样式用于测量
      tempWrapper.style.position = 'absolute';
      tempWrapper.style.visibility = 'hidden';
      tempWrapper.style.height = 'auto';
      tempWrapper.style.width = `${wrapper.offsetWidth}px`;
      tempWrapper.style.top = '-9999px';
      tempWrapper.style.left = '0';
      tempWrapper.style.transition = 'none';
      tempWrapper.style.willChange = 'auto';
      
      // 添加到DOM中进行测量（需要添加到body或父元素）
      const parent = wrapper.parentElement;
      if (parent) {
        parent.appendChild(tempWrapper);
        // 强制重排以获取准确的scrollHeight
        void tempWrapper.offsetHeight;
        const newHeight = tempWrapper.scrollHeight;
        parent.removeChild(tempWrapper);
        
        // 如果高度没有变化，直接返回
        if (Math.abs(currentHeight - newHeight) < threshold) {
          return;
        }
        
        isUpdating = true;
        
        // 使用双requestAnimationFrame确保浏览器完成当前渲染周期后再触发过渡
        rafId = requestAnimationFrame(() => {
          rafId = requestAnimationFrame(() => {
            // 现在启用transition并设置新高度
            wrapper.style.transition = `height ${duration}ms ${easing}`;
            wrapper.style.height = `${newHeight}px`;
            
            // 过渡完成后重置isUpdating
            const handleTransitionEnd = (e: TransitionEvent) => {
              // 确保是height属性的过渡结束
              if (e.propertyName === 'height' && e.target === wrapper) {
                isUpdating = false;
                wrapper.removeEventListener('transitionend', handleTransitionEnd);
              }
            };
            wrapper.addEventListener('transitionend', handleTransitionEnd);
          });
        });
      }
    };

    // 触发更新（防抖）
    const scheduleUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(updateHeight, debounceMs);
    };

    const observers: Array<{ disconnect: () => void }> = [];

    // 使用ResizeObserver监听wrapper内容区域的大小变化
    if (observeResize) {
      const resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(wrapper);
      observers.push(resizeObserver);
    }

    // 使用MutationObserver监听内部DOM结构变化
    if (observeMutations) {
      const mutationObserver = new MutationObserver(scheduleUpdate);
      mutationObserver.observe(wrapper, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
      observers.push(mutationObserver);
    }

    // 初始化：设置初始高度并启用过渡
    const initHeight = wrapper.scrollHeight;
    wrapper.style.height = `${initHeight}px`;
    wrapper.style.transition = `height ${duration}ms ${easing}`;

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      observers.forEach(observer => observer.disconnect());
      isUpdating = false;
    };
  }, [duration, easing, threshold, debounceMs, observeMutations, observeResize]);

  return wrapperRef;
}
