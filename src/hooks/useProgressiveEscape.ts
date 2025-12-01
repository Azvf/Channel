import { useCallback, useEffect, KeyboardEvent } from 'react';

export interface EscapeLayer {
  /** 用于调试的唯一标识 */
  id: string;
  /** 
   * 判断该层级是否处于激活状态。
   * 如果返回 true，则拦截 ESC 事件并执行 action。
   * 优先级由数组顺序决定（索引 0 优先级最高）。
   */
  predicate: () => boolean;
  /** 
   * 该层级被触发时执行的动作 
   */
  action: () => void;
}

/**
 * 渐进式 ESC 退出处理 Hook
 * @param layers 按优先级排序的层级数组
 * @param options 配置选项
 * @param options.global 是否在全局 document 上监听事件（默认 false，返回 onKeyDown 处理函数）
 * @returns onKeyDown 键盘事件处理函数（当 global=false）或 void（当 global=true）
 */
export function useProgressiveEscape(
  layers: EscapeLayer[],
  options?: { global?: boolean }
) {
  const handleKeyDown = useCallback((e: KeyboardEvent | globalThis.KeyboardEvent) => {
    if (e.key !== 'Escape') return;

    // 遍历层级，找到第一个满足条件的层级
    for (const layer of layers) {
      if (layer.predicate()) {
        // 命中拦截
        e.preventDefault();
        e.stopPropagation();
        // 执行动作
        layer.action();
        // console.debug(`[ProgressiveEscape] Layer triggered: ${layer.id}`);
        return; 
      }
    }

    // 如果所有层级都不满足，什么都不做，允许事件冒泡
    // 这对应了 Level 3 (默认行为)
  }, [layers]);

  // 如果启用全局监听，在 document 上添加事件监听器
  useEffect(() => {
    if (!options?.global) return;

    const handleDocumentKeyDown = (e: globalThis.KeyboardEvent) => {
      handleKeyDown(e);
    };

    // 在捕获阶段监听，确保可以拦截事件
    document.addEventListener('keydown', handleDocumentKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, { capture: true });
    };
  }, [handleKeyDown, options?.global]);

  // 如果启用全局监听，不返回处理函数
  if (options?.global) {
    return;
  }

  // 否则返回处理函数供组件使用
  return handleKeyDown;
}

