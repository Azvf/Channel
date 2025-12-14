/**
 * useSmartCombobox Hook
 * Headless 交互状态机
 * 
 * 目的：将"核心交互逻辑"（场景 A/B/C）完全剥离出 UI，构建纯状态机
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

import type { SearchStrategy, PredictionResult } from './searchStrategy';
import { createStringMatchStrategy } from './searchStrategy';
import type { InputIntent } from './inputIntentMap';
import { getDeviceAdapter } from '@/popup/utils/deviceAdapter';

/**
 * 渲染项类型
 */
export type RenderedItemType = 'match' | 'create' | 'separator';

/**
 * 渲染项
 */
export interface RenderedItem<T> {
  /** 项类型 */
  type: RenderedItemType;
  /** 数据（match: T, create: string, separator: null） */
  data: T | string | null;
  /** 虚拟索引（用于键盘导航） */
  index: number;
  /** 是否高亮 */
  isHighlighted: boolean;
  /** 唯一 ID（用于 ARIA） */
  id: string;
}

/**
 * 组合框模式
 */
export type ComboboxMode = 'SELECT_EXISTING' | 'CREATE_NEW' | 'HYBRID';

/**
 * useSmartCombobox Hook 参数
 */
export interface UseSmartComboboxProps<T> {
  /** 用户输入值 */
  inputValue: string;
  /** 数据源数组 */
  source: T[];
  /** 搜索策略（默认使用 StringMatchStrategy） */
  searchStrategy?: SearchStrategy<T>;
  /** 是否允许创建新项 */
  allowCreation?: boolean;
  /** 已选中的项（用于排除） */
  selectedItems?: T[];
  /** 排除的项 */
  excludedItems?: T[];
  /** 项比较函数 */
  itemEquals?: (a: T, b: T) => boolean;
}

/**
 * useSmartCombobox Hook 返回值
 */
export interface UseSmartComboboxReturn<T> {
  /** 渲染项列表（扁平化，包含实体项和虚拟 Create 项） */
  renderedItems: RenderedItem<T>[];
  /** 当前高亮的索引 */
  highlightedIndex: number;
  /** 当前 Enter 键会选中的项 */
  activeItem: T | string | null;
  /** 当前 Shift+Enter 会触发的行为（仅场景 A 存在） */
  secondaryAction: 'CREATE' | null;
  /** 组合框模式 */
  mode: ComboboxMode;
  /** 设置高亮索引 */
  setHighlightedIndex: (index: number) => void;
  /** 导航到下一个 */
  navigateNext: () => void;
  /** 导航到上一个 */
  navigatePrev: () => void;
  /** 处理输入意图 */
  handleIntent: (intent: InputIntent) => {
    action: 'select' | 'create' | 'cancel' | null;
    item: T | string | null;
  };
}

/**
 * 默认的项比较函数
 */
function defaultItemEquals<T>(a: T, b: T): boolean {
  return a === b;
}

/**
 * useSmartCombobox Hook
 */
export function useSmartCombobox<T>({
  inputValue,
  source,
  searchStrategy,
  allowCreation = true,
  selectedItems = [],
  excludedItems = [],
  itemEquals = defaultItemEquals,
}: UseSmartComboboxProps<T>): UseSmartComboboxReturn<T> {
  // 使用默认搜索策略或传入的策略
  // 注意：StringMatchStrategy 只支持 string 类型，如果 T 不是 string，需要提供自定义策略
  const strategy = searchStrategy || (createStringMatchStrategy() as SearchStrategy<T>);

  // 过滤已选中和排除的项
  const availableSource = useMemo(() => {
    return source.filter(item => {
      const isSelected = selectedItems.some(selected => itemEquals(item, selected));
      const isExcluded = excludedItems.some(excluded => itemEquals(item, excluded));
      return !isSelected && !isExcluded;
    });
  }, [source, selectedItems, excludedItems, itemEquals]);

  // 执行搜索预测
  const prediction = useMemo<PredictionResult<T>>(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartCombobox.ts:122',message:'Prediction calculation start',data:{inputValue:inputValue,inputValueTrimmed:inputValue.trim(),availableSourceLength:availableSource.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!inputValue.trim()) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartCombobox.ts:125',message:'Prediction - no input, returning empty',data:{availableSourceLength:availableSource.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return {
        exactMatch: null,
        partialMatches: [],
        scores: new Map(),
      };
    }

    const result = strategy.predict(inputValue, availableSource);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartCombobox.ts:133',message:'Prediction result',data:{exactMatch:result.exactMatch,partialMatchesLength:result.partialMatches.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
  }, [inputValue, availableSource, strategy]);

  // 计算组合框模式和渲染项
  const { renderedItems, mode, secondaryAction } = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartCombobox.ts:134',message:'RenderedItems calculation start',data:{inputValue:inputValue.trim(),predictionExactMatch:prediction.exactMatch,predictionPartialMatchesLength:prediction.partialMatches.length,allowCreation:allowCreation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const trimmedInput = inputValue.trim();
    const items: RenderedItem<T>[] = [];
    let currentMode: ComboboxMode = 'SELECT_EXISTING';
    let hasSecondaryAction: 'CREATE' | null = null;

    // 场景 C：完全匹配
    if (prediction.exactMatch !== null) {
      items.push({
        type: 'match',
        data: prediction.exactMatch,
        index: 0,
        isHighlighted: false, // 将在 highlightedIndex 中设置
        id: `combobox-option-match-0`,
      });
      currentMode = 'SELECT_EXISTING';
      hasSecondaryAction = null;
    }
    // 场景 A：有部分匹配
    else if (prediction.partialMatches.length > 0) {
      // 添加匹配项
      prediction.partialMatches.forEach((match, idx) => {
        items.push({
          type: 'match',
          data: match,
          index: idx,
          isHighlighted: false,
          id: `combobox-option-match-${idx}`,
        });
      });

      // 如果允许创建且输入不完全匹配，添加 Create 选项
      if (allowCreation && trimmedInput) {
        // 添加分割线
        items.push({
          type: 'separator',
          data: null,
          index: items.length,
          isHighlighted: false,
          id: `combobox-separator-${items.length}`,
        });

        // 添加 Create 选项
        items.push({
          type: 'create',
          data: trimmedInput,
          index: items.length,
          isHighlighted: false,
          id: `combobox-option-create-${items.length}`,
        });

        currentMode = 'HYBRID';
        hasSecondaryAction = 'CREATE';
      } else {
        currentMode = 'SELECT_EXISTING';
        hasSecondaryAction = null;
      }
    }
    // 场景 B：完全无匹配
    else if (allowCreation && trimmedInput) {
      items.push({
        type: 'create',
        data: trimmedInput,
        index: 0,
        isHighlighted: false,
        id: `combobox-option-create-0`,
      });
      currentMode = 'CREATE_NEW';
      hasSecondaryAction = null;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartCombobox.ts:210',message:'RenderedItems calculation result',data:{itemsLength:items.length,mode:currentMode,secondaryAction:hasSecondaryAction},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return {
      renderedItems: items,
      mode: currentMode,
      secondaryAction: hasSecondaryAction,
    };
  }, [prediction, inputValue, allowCreation]);

  // 高亮索引状态
  const [highlightedIndex, setHighlightedIndexState] = useState<number>(-1);
  
  // 当 renderedItems 变化时，自动高亮第一个可选项
  useEffect(() => {
    if (renderedItems.length > 0 && highlightedIndex < 0) {
      const firstSelectable = renderedItems.findIndex(item => item.type !== 'separator');
      if (firstSelectable >= 0) {
        setHighlightedIndexState(firstSelectable);
      }
    } else if (renderedItems.length === 0) {
      setHighlightedIndexState(-1);
    }
  }, [renderedItems, highlightedIndex]);

  // 更新高亮索引（确保在有效范围内）
  const setHighlightedIndex = useCallback((index: number) => {
    if (index < 0 || index >= renderedItems.length) {
      return;
    }
    // 跳过分割线
    if (renderedItems[index].type === 'separator') {
      return;
    }
    setHighlightedIndexState(index);
  }, [renderedItems]);

  // 导航到下一个
  const navigateNext = useCallback(() => {
    if (renderedItems.length === 0) return;

    let nextIndex = highlightedIndex + 1;
    
    // 循环查找下一个可选项（跳过分割线）
    for (let i = 0; i < renderedItems.length; i++) {
      if (nextIndex >= renderedItems.length) {
        nextIndex = 0;
      }
      if (renderedItems[nextIndex].type !== 'separator') {
        setHighlightedIndexState(nextIndex);
        return;
      }
      nextIndex++;
    }
  }, [highlightedIndex, renderedItems]);

  // 导航到上一个
  const navigatePrev = useCallback(() => {
    if (renderedItems.length === 0) return;

    let prevIndex = highlightedIndex - 1;
    
    // 循环查找上一个可选项（跳过分割线）
    for (let i = 0; i < renderedItems.length; i++) {
      if (prevIndex < 0) {
        prevIndex = renderedItems.length - 1;
      }
      if (renderedItems[prevIndex].type !== 'separator') {
        setHighlightedIndexState(prevIndex);
        return;
      }
      prevIndex--;
    }
  }, [highlightedIndex, renderedItems]);

  // 更新高亮状态
  const itemsWithHighlight = useMemo(() => {
    return renderedItems.map((item, index) => ({
      ...item,
      isHighlighted: index === highlightedIndex,
    }));
  }, [renderedItems, highlightedIndex]);

  // 计算当前活动项
  const activeItem = useMemo(() => {
    if (highlightedIndex < 0 || highlightedIndex >= itemsWithHighlight.length) {
      return null;
    }
    const item = itemsWithHighlight[highlightedIndex];
    return item.data;
  }, [itemsWithHighlight, highlightedIndex]);

  // 处理输入意图
  const handleIntent = useCallback((intent: InputIntent): {
    action: 'select' | 'create' | 'cancel' | null;
    item: T | string | null;
  } => {
    const deviceAdapter = getDeviceAdapter();

    switch (intent) {
      case 'CONFIRM_PRIMARY': {
        if (activeItem !== null) {
          const activeRenderedItem = itemsWithHighlight[highlightedIndex];
          
          // 触发触感反馈
          deviceAdapter.haptic.impactLight();

          if (activeRenderedItem.type === 'create') {
            return {
              action: 'create',
              item: activeItem as string,
            };
          } else {
            return {
              action: 'select',
              item: activeItem as T,
            };
          }
        }
        // 如果没有高亮项但有输入值，尝试创建
        if (inputValue.trim() && allowCreation) {
          deviceAdapter.haptic.impactLight();
          return {
            action: 'create',
            item: inputValue.trim(),
          };
        }
        return { action: null, item: null };
      }

      case 'CONFIRM_SECONDARY': {
        // Shift+Enter 强制创建
        if (inputValue.trim() && allowCreation && secondaryAction === 'CREATE') {
          deviceAdapter.haptic.impactLight();
          return {
            action: 'create',
            item: inputValue.trim(),
          };
        }
        return { action: null, item: null };
      }

      case 'NAVIGATE_NEXT': {
        navigateNext();
        return { action: null, item: null };
      }

      case 'NAVIGATE_PREV': {
        navigatePrev();
        return { action: null, item: null };
      }

      case 'CANCEL': {
        return { action: 'cancel', item: null };
      }

      default:
        return { action: null, item: null };
    }
  }, [activeItem, itemsWithHighlight, highlightedIndex, inputValue, allowCreation, secondaryAction, navigateNext, navigatePrev]);

  return {
    renderedItems: itemsWithHighlight,
    highlightedIndex,
    activeItem,
    secondaryAction,
    mode,
    setHighlightedIndex,
    navigateNext,
    navigatePrev,
    handleIntent,
  };
}

