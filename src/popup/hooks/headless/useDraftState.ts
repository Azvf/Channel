/**
 * 草稿状态持久化 Hook
 * 封装草稿状态的持久化逻辑，支持防抖保存、恢复和清除
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { storageService } from '@/services/storageService';

export interface UseDraftOptions<T> {
  /** 存储键，例如 'draft.edit_page.123' */
  key: string;
  /** 默认值 */
  initialValue: T;
  /** 是否启用草稿功能，默认 true */
  enable?: boolean;
  /** 防抖延迟（毫秒），默认 500ms */
  debounceMs?: number;
}

export interface UseDraftStateReturn<T> {
  /** 当前值 */
  value: T;
  /** 设置值（会触发防抖保存） */
  setValue: (newValue: T | ((prev: T) => T)) => void;
  /** 清除草稿 */
  clearDraft: () => void;
  /** 是否从草稿恢复（用于调试） */
  isRestored: boolean;
}

/**
 * 草稿状态持久化 Hook
 * 
 * 功能：
 * - 初始化时从 Storage 恢复草稿
 * - 值变化时防抖保存到 Storage
 * - 提供清除草稿的方法
 * 
 * @param options - 配置选项
 * @returns 草稿状态相关的方法和值
 */
export function useDraftState<T>(options: UseDraftOptions<T>): UseDraftStateReturn<T> {
  const { key, initialValue, enable = true, debounceMs = 500 } = options;
  
  // 标记是否从草稿恢复
  const isRestoredRef = useRef(false);
  // 用于跟踪当前值，避免在 useEffect 中依赖 value
  const valueRef = useRef<T>(initialValue);
  // 使用 ref 存储 initialValue 的序列化值，避免依赖项变化导致 useEffect 重复执行
  const initialValueRef = useRef<T>(initialValue);
  const initialValueStrRef = useRef<string>(JSON.stringify(initialValue));
  
  // 同步更新 initialValue ref（当 initialValue 变化时）
  useEffect(() => {
    initialValueRef.current = initialValue;
    initialValueStrRef.current = JSON.stringify(initialValue);
  }, [initialValue]);
  
  // 初始化时尝试从 Storage 恢复
  const [value, setValue] = useState<T>(() => {
    if (!enable) {
      return initialValue;
    }
    
    try {
      // 同步读取 localStorage（仅在初始化时）
      // 注意：这里使用同步读取是为了避免首次渲染闪烁
      // 对于 chrome.storage，我们需要异步读取，但为了简化，先尝试 localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const draft = window.localStorage.getItem(key);
        if (draft !== null) {
          const parsed = JSON.parse(draft) as T;
          isRestoredRef.current = true;
          valueRef.current = parsed;
          return parsed;
        }
      }
    } catch (error) {
      // 解析失败时使用初始值
      console.warn(`[useDraftState] Failed to restore draft for key "${key}":`, error);
    }
    
    valueRef.current = initialValue;
    return initialValue;
  });
  
  // 同步 valueRef 和 value
  useEffect(() => {
    valueRef.current = value;
  }, [value, key]);
  
  // 防抖保存的 timeout ID
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // 防抖保存函数
  const saveDraft = useCallback(
    (newValue: T) => {
      if (!enable) {
        return;
      }
      
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      
      timeoutIdRef.current = setTimeout(async () => {
        try {
          await storageService.set(key, newValue);
        } catch (error) {
          // 静默降级，不影响 UI
          console.warn(`[useDraftState] Failed to save draft for key "${key}":`, error);
        } finally {
          timeoutIdRef.current = null;
        }
      }, debounceMs);
    },
    [key, enable, debounceMs]
  );
  
  // 标记是否已经开始恢复过程（防止异步恢复覆盖用户输入）
  const restoreStartedRef = useRef(false);
  
  // 异步恢复草稿（用于 chrome.storage 环境）
  // 注意：只在 enable 变为 true 时恢复一次，避免在用户输入时重复触发
  useEffect(() => {
    if (!enable) {
      // 当 enable 变为 false 时，重置恢复标志，以便下次 enable 变为 true 时能重新恢复
      isRestoredRef.current = false;
      restoreStartedRef.current = false;
      return;
    }
    
    // 如果已经恢复过或已经开始恢复过程，不再重复恢复
    if (isRestoredRef.current || restoreStartedRef.current) {
      return;
    }
    
    // 如果已经同步恢复了，就不需要异步恢复了
    if (typeof window !== 'undefined' && window.localStorage) {
      const draft = window.localStorage.getItem(key);
      if (draft !== null) {
        return;
      }
    }
    
    // 关键：在 enable 变为 true 的瞬间，捕获当前的 value（使用 ref 获取最新值）
    // 如果此时 value 等于 initialValue，说明可以安全恢复
    // 如果此时 value 不等于 initialValue，说明用户已经开始输入，不应该恢复
    const snapshotValue = valueRef.current;
    const snapshotValueStr = JSON.stringify(snapshotValue);
    // 使用 ref 中的初始值字符串，避免依赖 initialValue 导致 useEffect 重复执行
    const initialValueStr = initialValueStrRef.current;
    
    // 如果快照值不等于初始值，说明用户已经开始输入，不应该恢复
    if (snapshotValueStr !== initialValueStr) {
      return;
    }
    
    // 标记已经开始恢复过程
    restoreStartedRef.current = true;
    
    // 异步尝试从 chrome.storage 恢复
    // 注意：只在 enable 变为 true 且还没有恢复过时执行一次
    storageService.get<T>(key)
      .then((draft) => {
        // 如果 storage 中有草稿，则恢复
        // 使用函数式更新来获取最新的 value，但只在值仍然是快照值时才恢复
        if (draft !== null) {
          // 关键：在 Promise 回调中，先检查 valueRef.current 是否仍然等于快照值
          // 如果 valueRef.current 已经改变，说明用户已经开始输入，不应该恢复
          const currentRefValueStr = JSON.stringify(valueRef.current);
          
          if (currentRefValueStr !== snapshotValueStr || !restoreStartedRef.current) {
            // valueRef 已经改变，说明用户已经开始输入，或者恢复过程已被取消
            // 恢复过程已结束（无论是跳过还是取消），重置标志
            restoreStartedRef.current = false;
            return;
          }
          
          setValue((currentValue) => {
            // 双重检查：当前值必须仍然等于快照值（即仍然是初始值）
            // 这样可以避免在异步恢复过程中，用户已经开始输入的情况
            const currentValueStr = JSON.stringify(currentValue);
            // 再次检查 valueRef（因为可能在 setValue 调用之间用户又输入了）
            const latestRefValueStr = JSON.stringify(valueRef.current);
            
            if (currentValueStr === snapshotValueStr && latestRefValueStr === snapshotValueStr && restoreStartedRef.current) {
              isRestoredRef.current = true;
              valueRef.current = draft;
              // 恢复完成，重置标志
              restoreStartedRef.current = false;
              return draft;
            } else {
              // 恢复过程已结束（值已改变），重置标志
              restoreStartedRef.current = false;
              return currentValue;
            }
          });
        } else {
          // 没有草稿，恢复过程已结束，重置标志
          restoreStartedRef.current = false;
        }
      })
      .catch((error) => {
        console.warn(`[useDraftState] Failed to restore draft for key "${key}":`, error);
        // 恢复失败，重置标志
        restoreStartedRef.current = false;
      });
  }, [key, enable]); // 移除 initialValue 依赖，使用 ref 来避免重复触发
  
  // 设置值的包装函数
  const setDraftValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolvedValue = newValue instanceof Function ? newValue(prev) : newValue;
        valueRef.current = resolvedValue;
        
        // 关键：如果用户输入的值不等于初始值，说明用户已经开始输入
        // 此时应该取消任何待处理的恢复操作
        const resolvedValueStr = JSON.stringify(resolvedValue);
        const initialValueStr = initialValueStrRef.current;
        if (resolvedValueStr !== initialValueStr && restoreStartedRef.current) {
          // 用户已经开始输入，取消恢复操作
          restoreStartedRef.current = false;
        }
        
        saveDraft(resolvedValue);
        return resolvedValue;
      });
    },
    [saveDraft, key] // 移除 initialValue 依赖，使用 ref 来避免重复触发
  );
  
  // 清除草稿
  const clearDraft = useCallback(async () => {
    // 清除待保存的定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    // 清除 Storage 中的草稿
    try {
      await storageService.remove(key);
    } catch (error) {
      console.warn(`[useDraftState] Failed to clear draft for key "${key}":`, error);
    }
    
    // 重置恢复标志
    isRestoredRef.current = false;
  }, [key]);
  
  // 清理函数：组件卸载时保存最后一次值
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      // 如果还有待保存的值，立即保存
      if (enable) {
        storageService.set(key, value).catch((error) => {
          console.warn(`[useDraftState] Failed to save draft on unmount for key "${key}":`, error);
        });
      }
    };
  }, [key, enable, value]);
  
  return useMemo(
    () => ({
      value,
      setValue: setDraftValue,
      clearDraft,
      isRestored: isRestoredRef.current,
    }),
    [value, setDraftValue, clearDraft]
  );
}
