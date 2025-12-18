/**
 * 滚动位置持久化 Hook
 * 保存和恢复滚动容器的滚动位置
 */

import { useEffect, useRef, useCallback } from 'react';
import { storageService } from '@/services/storageService';

export interface UseScrollPositionOptions {
  /** 存储键，例如 'scroll.tag_management' */
  key: string;
  /** 滚动容器的 ref */
  containerRef: React.RefObject<HTMLElement>;
  /** 是否启用滚动位置恢复，默认 true */
  isEnabled?: boolean;
  /** 滚动轴，默认 'y' */
  axis?: 'x' | 'y' | 'both';
  /** 防抖延迟（毫秒），默认 300ms */
  debounceMs?: number;
}

export interface UseScrollPositionReturn {
  /** 手动恢复滚动位置 */
  restoreScroll: () => void;
  /** 手动保存滚动位置 */
  saveScroll: () => void;
}

/**
 * 滚动位置持久化 Hook
 * 
 * 功能：
 * - 组件 Mount 时恢复滚动位置
 * - 监听滚动事件，防抖保存滚动位置
 * - 弹窗关闭时保存滚动位置
 * 
 * @param options - 配置选项
 * @returns 滚动位置相关的方法
 */
export function useScrollPosition(
  options: UseScrollPositionOptions
): UseScrollPositionReturn {
  const {
    key,
    containerRef,
    isEnabled = true,
    axis = 'y',
    debounceMs = 300,
  } = options;
  
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);
  
  // 保存滚动位置
  const saveScroll = useCallback(async () => {
    if (!isEnabled || !containerRef.current) {
      return;
    }
    
    const element = containerRef.current;
    let scrollData: { x?: number; y?: number } = {};
    
    if (axis === 'x' || axis === 'both') {
      scrollData.x = element.scrollLeft;
    }
    if (axis === 'y' || axis === 'both') {
      scrollData.y = element.scrollTop;
    }
    
    try {
      await storageService.set(key, scrollData);
    } catch (error) {
      console.warn(`[useScrollPosition] Failed to save scroll position for key "${key}":`, error);
    }
  }, [key, containerRef, isEnabled, axis]);
  
  // 防抖保存滚动位置
  const debouncedSaveScroll = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    
    timeoutIdRef.current = setTimeout(() => {
      saveScroll();
      timeoutIdRef.current = null;
    }, debounceMs);
  }, [saveScroll, debounceMs]);
  
  // 恢复滚动位置
  const restoreScroll = useCallback(async () => {
    if (!isEnabled || !containerRef.current || hasRestoredRef.current) {
      return;
    }
    
    try {
      const scrollData = await storageService.get<{ x?: number; y?: number }>(key);
      
      if (scrollData && containerRef.current) {
        const element = containerRef.current;
        
        if (axis === 'x' || axis === 'both') {
          if (typeof scrollData.x === 'number') {
            element.scrollLeft = scrollData.x;
          }
        }
        if (axis === 'y' || axis === 'both') {
          if (typeof scrollData.y === 'number') {
            element.scrollTop = scrollData.y;
          }
        }
        
        hasRestoredRef.current = true;
      }
    } catch (error) {
      console.warn(`[useScrollPosition] Failed to restore scroll position for key "${key}":`, error);
    }
  }, [key, containerRef, isEnabled, axis]);
  
  // 组件 Mount 时恢复滚动位置
  useEffect(() => {
    if (!isEnabled || !containerRef.current) {
      return;
    }
    
    // 延迟恢复，确保 DOM 已渲染完成
    const timeoutId = setTimeout(() => {
      restoreScroll();
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isEnabled, restoreScroll]);
  
  // 监听滚动事件，防抖保存
  useEffect(() => {
    if (!isEnabled || !containerRef.current) {
      return;
    }
    
    const element = containerRef.current;
    
    const handleScroll = () => {
      debouncedSaveScroll();
    };
    
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [isEnabled, debouncedSaveScroll]);
  
  // 组件卸载或弹窗关闭时保存滚动位置
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    
    return () => {
      // 立即保存，不防抖
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      saveScroll();
    };
  }, [isEnabled, saveScroll]);
  
  return {
    restoreScroll,
    saveScroll,
  };
}

