/**
 * 高度动画 Hook - 使用 React Spring
 * 
 * 提供基于 React Spring 的平滑高度过渡动画，自动响应内容变化。
 * 
 * @param options - 配置选项
 * @returns ref 对象和动画值，需要绑定到容器上
 * 
 * @example
 * ```tsx
 * const { ref, style, innerRef } = useAnimatedHeight({ 
 *   config: { duration: 200 }
 * });
 * 
 * return (
 *   <animated.div ref={ref} style={style}>
 *     <div ref={innerRef} style={{ height: 'auto' }}>
 *       你的内容
 *     </div>
 *   </animated.div>
 * );
 * ```
 */

import { useEffect, useLayoutEffect, RefObject, useRef } from 'react';
import { useSpring, SpringConfig } from '@react-spring/web';

export interface UseAnimatedHeightOptions {
  /**
   * React Spring 配置选项
   * @default { duration: 300 }
   */
  config?: Partial<SpringConfig>;
  
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
  
  /**
   * 是否初始禁用动画
   * @default false
   */
  immediate?: boolean;
}

export interface UseAnimatedHeightReturn {
  /**
   * ref 对象，需要绑定到外层容器上
   */
  ref: RefObject<HTMLDivElement>;
  
  /**
   * 内层容器的 ref，用于监听实际内容变化
   */
  innerRef: RefObject<HTMLDivElement>;
  
  /**
   * React Spring 动画样式对象（只包含 height）
   */
  style: any;
  
  /**
   * 用于直接操作动画的方法
   */
  api: {
    start: (config?: Partial<SpringConfig>) => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
  };
}

/**
 * 高度动画 Hook
 * 
 * 返回一个 ref 和动画样式，需要绑定到外层容器元素上。
 * 
 * React Spring 的优势：
 * - 基于物理的动画，更自然流畅
 * - 自动插值，性能更好
 * - 丰富的配置选项和生命周期钩子
 * - 支持手势和交互式动画
 */
export function useAnimatedHeight(
  options: UseAnimatedHeightOptions = {}
): UseAnimatedHeightReturn {
  const {
    config = { duration: 300 },
    threshold = 1,
    debounceMs = 16,
    observeMutations = true,
    observeResize = true,
    immediate = false,
  } = options;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const timeoutIdRef = useRef<NodeJS.Timeout>();
  const currentTargetHeightRef = useRef<number | null>(null); // 记录当前目标高度

  // 使用 React Spring 管理高度动画
  const [style, api] = useSpring(() => ({
    height: 0,
    config: config,
    immediate: true, // 初始为 immediate，避免闪烁
  }));

  // 更新高度的函数
  const updateHeight = () => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    // 获取内层容器的实际高度（这是真实内容高度）
    const newHeight = inner.scrollHeight;
    
    // 获取上次的目标高度
    const currentTarget = currentTargetHeightRef.current;

    // 如果高度没有变化，直接返回
    if (currentTarget !== null && Math.abs(currentTarget - newHeight) < threshold) {
      return;
    }

    // 首次挂载时不使用动画
    const shouldImmediate = isInitialMountRef.current || immediate;
    isInitialMountRef.current = false;

    // 更新目标高度记录
    currentTargetHeightRef.current = newHeight;

    // 使用 React Spring 更新高度（使用数字类型，React Spring 会自动添加 px 单位）
    api.start({
      height: newHeight,
      immediate: shouldImmediate,
      config: shouldImmediate ? undefined : config,
    });
  };

  // 触发更新（防抖）
  const scheduleUpdate = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(updateHeight, debounceMs);
  };

  // 使用 useLayoutEffect 在 DOM 更新后同步设置初始高度
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    // 初始化：设置初始高度（无需动画）
    const initHeight = inner.scrollHeight;
    currentTargetHeightRef.current = initHeight;
    api.set({ height: initHeight });
  }, []); // 只在挂载时执行一次

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    const observers: Array<{ disconnect: () => void }> = [];

    // 使用ResizeObserver监听内层容器的大小变化（这是真实的内容高度）
    if (observeResize) {
      const resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(inner);
      observers.push(resizeObserver);
    }

    // 使用MutationObserver监听内层DOM结构变化
    if (observeMutations) {
      const mutationObserver = new MutationObserver(scheduleUpdate);
      mutationObserver.observe(inner, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
      observers.push(mutationObserver);
    }

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      observers.forEach(observer => observer.disconnect());
    };
  }, []); // 只在挂载和卸载时执行

  // 返回 ref、样式和 API
  return {
    ref: wrapperRef,
    innerRef: innerRef,
    style: style, // React Spring 动画样式，需要配合 animated.div 使用
    api: api,
  };
}
