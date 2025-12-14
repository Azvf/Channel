import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, KeyboardEvent } from 'react';
import { useProgressiveEscape } from '../../../hooks/useProgressiveEscape';

import { useSmartCombobox } from './useSmartCombobox';
import { createStringMatchStrategy } from './searchStrategy';
import { InputIntentResolver, DEFAULT_KEYBOARD_MAP } from './inputIntentMap';
import { getDeviceAdapter } from '@/popup/utils/deviceAdapter';

export interface UseTagInputProps {
  tags: string[];
  suggestions: string[];
  excludeTags?: string[];
  onTagsChange: (tags: string[]) => void | Promise<void>;
  allowCreation?: boolean;
  mode?: "list" | "create";
  onCreateTag?: (tag: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export interface UseTagInputReturn {
  // 状态
  inputValue: string;
  options: string[];
  isMenuOpen: boolean;
  activeIndex: number;
  
  // 控制方法
  setIsMenuOpen: (open: boolean) => void;
  
  // Prop Getters
  getInputProps: (userProps?: React.InputHTMLAttributes<HTMLInputElement>) => {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    onClick: (e: React.MouseEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    // A11y 属性
    role?: string;
    'aria-autocomplete'?: 'none' | 'list' | 'inline' | 'both';
    'aria-expanded'?: boolean;
    'aria-controls'?: string;
    'aria-activedescendant'?: string;
  };
  getOptionProps: (index: number) => {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseEnter: () => void;
    'data-active': boolean;
    // A11y 属性
    id?: string;
    role?: string;
    'aria-selected'?: boolean;
  };
  
  // 操作方法
  removeTag: (index: number) => void;
  
  // Refs (供 UI 层使用)
  inputRef: React.RefObject<HTMLInputElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  optionButtonsRef: React.RefObject<(HTMLButtonElement | null)[]>;
  
  // 新增：用于新架构的扩展接口（向后兼容）
  renderedItems?: Array<{
    type: 'match' | 'create' | 'separator';
    data: string | null;
    index: number;
    isHighlighted: boolean;
    id: string;
  }>;
  secondaryAction?: 'CREATE' | null;
}

export function useTagInput({
  tags,
  suggestions,
  excludeTags = [],
  onTagsChange,
  allowCreation = true,
  mode = "list",
  onCreateTag,
  autoFocus: _autoFocus = false,
  disabled = false,
}: UseTagInputProps): UseTagInputReturn {
  // --- 状态机 ---
  const [inputValue, setInputValue] = useState("");
  const [isMenuOpenState, setIsMenuOpenState] = useState(false);
  
  // 使用新的 useSmartCombobox Hook
  const searchStrategy = useMemo(() => createStringMatchStrategy<string>(), []);
  const smartCombobox = useSmartCombobox({
    inputValue,
    source: suggestions,
    searchStrategy,
    allowCreation,
    selectedItems: tags,
    excludedItems: excludeTags,
  });
  
  // 同步高亮索引（向后兼容）
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // 为了保持兼容性，使用内部状态
  const isMenuOpen = isMenuOpenState;
  
  // 同步 smartCombobox 的高亮索引到 activeIndex
  useEffect(() => {
    // 当使用 enhancedRenderedItems 时，如果 smartCombobox.renderedItems 为空，不覆盖 activeIndex
    if (!inputValue.trim() && isMenuOpen && smartCombobox.renderedItems.length === 0) {
      // 在这种情况下，activeIndex 由 onMouseEnter 手动管理
      return;
    }
    setActiveIndex(smartCombobox.highlightedIndex);
  }, [smartCombobox.highlightedIndex, inputValue, isMenuOpen, smartCombobox.renderedItems.length]);
  
  // 包装 setIsMenuOpen，确保关闭时设置 manuallyClosedRef
  const setIsMenuOpen = useCallback((open: boolean) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:114',message:'setIsMenuOpen called',data:{open:open,currentState:isMenuOpenState,renderedItemsLength:smartCombobox.renderedItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setIsMenuOpenState(open);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:116',message:'setIsMenuOpenState executed',data:{open:open},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!open) {
      manuallyClosedRef.current = true;
      smartCombobox.setHighlightedIndex(-1);
      setActiveIndex(-1);
    }
  }, [smartCombobox, isMenuOpenState]);
  
  // 创建意图解析器
  const intentResolver = useMemo(() => new InputIntentResolver(), []);
  
  // 获取设备适配器
  const deviceAdapter = useMemo(() => getDeviceAdapter(), []);
  
  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  
  // 确保 optionButtonsRef.current 始终存在
  if (!optionButtonsRef.current) {
    optionButtonsRef.current = [];
  }
  
  // --- 手动控制状态 (用于复杂的状态管理) ---
  const manuallyOpenedRef = useRef(false);
  const manuallyClosedRef = useRef(false);
  const isAddingTagRef = useRef(false);
  const inputValueBeforeTagAddRef = useRef<string>("");
  
  // --- 焦点管理：追踪是否应该保持聚焦 ---
  const shouldKeepFocus = useRef(false);
  
  // ---------------------------------------------------------------------------
  // 核心架构 1: 同步焦点断言 (Synchronous Focus Assertion)
  // ---------------------------------------------------------------------------
  // 使用 useLayoutEffect 在 DOM 更新后、浏览器绘制前同步断言焦点状态
  // 解决 Framer Motion 布局动画和 React 渲染周期导致的焦点丢失问题
  useLayoutEffect(() => {
    if (inputRef.current && !disabled) {
      const activeElementBefore = document.activeElement;
      const isInputFocused = activeElementBefore === inputRef.current;
      const isBodyFocused = activeElementBefore === document.body;
      
      // 如果 shouldKeepFocus 为 true，或焦点丢失到 BODY（Framer Motion 布局动画导致），恢复焦点
      if (shouldKeepFocus.current || (!isInputFocused && isBodyFocused)) {
        inputRef.current.focus({ preventScroll: true });
      }
      
      if (shouldKeepFocus.current) {
        shouldKeepFocus.current = false;
      }
    }
  }); // 无依赖数组，每次渲染提交后都运行，确保无死角
  
  // --- 自动聚焦逻辑 --- (已禁用，防止干扰点击检测)
  // useEffect(() => {
  //   if (!autoFocus || !inputRef.current) return;
  //   const focusTimer = requestAnimationFrame(() => inputRef.current?.focus());
  //   return () => cancelAnimationFrame(focusTimer);
  // }, [autoFocus]);
  
  // --- 纯逻辑：建议列表计算（向后兼容，从 smartCombobox 转换） ---
  const options = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:187',message:'Options calculation start',data:{inputValue:inputValue,inputValueTrimmed:inputValue.trim(),isMenuOpen:isMenuOpen,renderedItemsLength:smartCombobox.renderedItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // 未打开且无输入时不计算，避免不必要的计算开销
    if (!inputValue.trim() && !isMenuOpen) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:190',message:'Options calculation - early return empty',data:{inputValueTrimmed:inputValue.trim(),isMenuOpen:isMenuOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return [];
    }
    
    // 如果菜单打开但没有输入，显示所有可用的 suggestions
    if (!inputValue.trim() && isMenuOpen && smartCombobox.renderedItems.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:199',message:'Options calculation - menu open but no input, showing all suggestions',data:{suggestionsLength:suggestions.length,tagsLength:tags.length,excludeTagsLength:excludeTags.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // 过滤已选中和排除的项
      const availableSuggestions = suggestions.filter(suggestion => {
        const isSelected = tags.includes(suggestion);
        const isExcluded = excludeTags.includes(suggestion);
        return !isSelected && !isExcluded;
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:207',message:'Options calculation - available suggestions result',data:{availableSuggestionsLength:availableSuggestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return availableSuggestions;
    }
    
    // 从 renderedItems 中提取选项（排除分割线）
    const result = smartCombobox.renderedItems
      .filter(item => item.type !== 'separator')
      .map(item => {
        if (item.type === 'create') {
          return item.data as string;
        }
        return item.data as string;
      });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTagInput.ts:218',message:'Options calculation - result',data:{optionsLength:result.length,renderedItemsLength:smartCombobox.renderedItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
  }, [smartCombobox.renderedItems, inputValue, isMenuOpen, suggestions, tags, excludeTags]);
  
  // --- 渐进式退出逻辑 ---
  const handleEscape = useProgressiveEscape([
    {
      id: 'close-dropdown',
      predicate: () => isMenuOpen,
      action: () => {
        setIsMenuOpenState(false);
        manuallyOpenedRef.current = false;
        manuallyClosedRef.current = true;
        setActiveIndex(-1);
        // Escape 关闭菜单后也要保持聚焦
        shouldKeepFocus.current = true;
      }
    },
    {
      id: 'clear-input',
      predicate: () => inputValue.length > 0,
      action: () => {
        setInputValue("");
        shouldKeepFocus.current = true;
      }
    }
  ]);
  
  // --- 动作：添加/删除 ---
  const addTag = useCallback((tagToAdd: string, source: "input" | "suggestion" = "input") => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    
    const matchesSuggestion = suggestions.some(s => s.toLowerCase() === trimmed.toLowerCase());
    
    if (!allowCreation && source === "input" && !matchesSuggestion) return;
    
    if (mode === "create") {
      if (!matchesSuggestion && onCreateTag) {
        onCreateTag(trimmed);
      }
      setInputValue("");
      setIsMenuOpenState(false);
      manuallyOpenedRef.current = false;
      manuallyClosedRef.current = true;
      setActiveIndex(-1);
      shouldKeepFocus.current = true;
    } else {
      if (!tags.includes(trimmed)) {
        inputValueBeforeTagAddRef.current = inputValue;
        isAddingTagRef.current = true;
        setIsMenuOpenState(false);
        manuallyOpenedRef.current = false;
        manuallyClosedRef.current = true;
        // 在 onTagsChange 之前设置标志，确保 useLayoutEffect 能在渲染周期中捕获
        shouldKeepFocus.current = true;
        onTagsChange([...tags, trimmed]);
      }
      setInputValue("");
    }
    
    // 立即断言焦点，处理不触发重渲染的情况（如重复添加）
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [tags, onTagsChange, allowCreation, mode, onCreateTag, suggestions, inputValue]);
  
  const removeTag = useCallback((index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
    // 删除 Tag 会触发 Framer Motion 布局动画，可能导致焦点丢失到 BODY
    // 设置标志让 useLayoutEffect 在布局更新后恢复焦点
    shouldKeepFocus.current = true;
  }, [tags, onTagsChange]);
  
  // --- 处理添加标签后的状态清理 ---
  useEffect(() => {
    const inputValueCleared = inputValueBeforeTagAddRef.current.trim() !== "" && inputValue.trim() === "";
    if (isAddingTagRef.current && inputValueCleared) {
      isAddingTagRef.current = false;
      inputValueBeforeTagAddRef.current = "";
      setActiveIndex(-1);
      return;
    }
    
    if (inputValue.trim() !== "") {
      isAddingTagRef.current = false;
      inputValueBeforeTagAddRef.current = "";
    }
    
    // 控制显示逻辑
    if (manuallyClosedRef.current) {
      return; // 如果菜单被手动关闭，不要自动重新打开
    }
    
    if (options.length > 0 && (inputValue || manuallyOpenedRef.current)) {
      setIsMenuOpenState(prev => {
        if (!prev) {
          // 菜单打开时自动高亮第一个选项，提升键盘导航体验
          if (activeIndex < 0) {
            setActiveIndex(0);
          }
          return true;
        }
        return prev;
      });
    } else if (options.length === 0) {
      setIsMenuOpenState(false);
    }
  }, [options, inputValue]);
  
  // --- 交互：键盘事件处理 (核心复杂性所在) ---
  const getInputProps = useCallback((userProps?: React.InputHTMLAttributes<HTMLInputElement>) => {
    // 解构 userProps，排除可能冲突的属性
    const { value: _value, onChange: userOnChange, onKeyDown: userOnKeyDown, onFocus: userOnFocus, onBlur: userOnBlur, onClick: userOnClick, placeholder: userPlaceholder, className: userClassName, style: userStyle, ...restUserProps } = userProps || {};
    
    return {
      ...restUserProps,
      value: inputValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        // 用户输入时清除手动关闭标记，允许菜单在输入时自动重新打开
        if (manuallyClosedRef.current && e.target.value !== inputValue) {
          manuallyClosedRef.current = false;
        }
        setInputValue(e.target.value);
        userOnChange?.(e);
      },
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        // 优先让渐进式退出钩子处理 ESC，支持嵌套 UI 的 LIFO 关闭顺序
        if (e.key === 'Escape' && handleEscape) {
          handleEscape(e);
          userOnKeyDown?.(e);
          return;
        }
        
        // 使用 InputIntentResolver 解析键盘事件
        const intent = intentResolver.resolve(e, DEFAULT_KEYBOARD_MAP);
        
        if (intent) {
          // 打开菜单（如果需要）
          if ((intent === 'NAVIGATE_NEXT' || intent === 'NAVIGATE_PREV') && !isMenuOpen && options.length > 0) {
            setIsMenuOpenState(true);
            manuallyOpenedRef.current = false;
            manuallyClosedRef.current = false;
          }
          
          // 处理意图
          const result = smartCombobox.handleIntent(intent);
          
          if (result.action === 'select' && result.item) {
            e.preventDefault();
            addTag(result.item as string, "suggestion");
          } else if (result.action === 'create' && result.item) {
            e.preventDefault();
            addTag(result.item as string, "input");
          } else if (result.action === 'cancel') {
            // Cancel 已由 handleEscape 处理
          } else if (intent === 'NAVIGATE_NEXT' || intent === 'NAVIGATE_PREV') {
            e.preventDefault();
            // 导航后滚动到可见区域
            requestAnimationFrame(() => {
              const newIndex = smartCombobox.highlightedIndex;
              setActiveIndex(newIndex);
              if (newIndex >= 0 && newIndex < optionButtonsRef.current.length) {
                optionButtonsRef.current[newIndex]?.scrollIntoView({ block: 'nearest' });
              }
            });
          }
        } else {
          // 处理其他按键（如 Backspace）
          switch (e.key) {
            case 'Backspace':
              if (!inputValue && tags.length > 0 && mode === "list") {
                removeTag(tags.length - 1);
              }
              break;
          }
        }
        
        userOnKeyDown?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        userOnBlur?.(e);
      },
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        // 防止 ESC 关闭后，因焦点事件导致的意外重开
        if (
          suggestions.length > 0 && 
          inputValue.trim() && 
          !isAddingTagRef.current && 
          !disabled && 
          !manuallyClosedRef.current
        ) {
          setIsMenuOpenState(true);
          manuallyOpenedRef.current = false;
          // 菜单打开时自动高亮第一个选项，提升键盘导航体验
          if (smartCombobox.highlightedIndex < 0 && options.length > 0) {
            const firstSelectable = smartCombobox.renderedItems.findIndex(item => item.type !== 'separator');
            if (firstSelectable >= 0) {
              smartCombobox.setHighlightedIndex(firstSelectable);
              setActiveIndex(firstSelectable);
            }
          }
        }
        userOnFocus?.(e);
      },
      onClick: (e: React.MouseEvent<HTMLInputElement>) => {
        // 用户点击输入框表示明确意图，重置手动关闭标记以允许菜单重新打开
        manuallyClosedRef.current = false;
        if (suggestions.length > 0 && inputValue.trim()) {
          setIsMenuOpenState(true);
          manuallyOpenedRef.current = false;
        }
        userOnClick?.(e);
      },
      placeholder: tags.length === 0 ? (userPlaceholder || "") : "",
      disabled,
      className: userClassName || "flex-1 min-w-[60px] bg-transparent outline-none",
      style: {
        color: 'var(--color-text-primary)',
        font: 'var(--font-body)',
        letterSpacing: 'var(--letter-spacing-body)',
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        ...userStyle,
      },
      // A11y 属性 - 符合 WAI-ARIA 标准
      role: 'combobox',
      'aria-autocomplete': 'list' as const,
      'aria-expanded': isMenuOpen,
      'aria-controls': 'tag-input-listbox',
      'aria-activedescendant': activeIndex >= 0 && smartCombobox.renderedItems[activeIndex] 
        ? smartCombobox.renderedItems[activeIndex].id 
        : undefined,
      // 虚拟键盘优化
      enterKeyHint: smartCombobox.secondaryAction === 'CREATE' ? 'go' : 'done',
      autocapitalize: 'none',
    };
  }, [inputValue, isMenuOpen, options, activeIndex, tags, mode, disabled, suggestions, allowCreation, handleEscape, addTag, removeTag, smartCombobox, intentResolver]);
  
  // 增强的 renderedItems（用于 getOptionProps）
  const enhancedRenderedItems = useMemo(() => {
    // 如果菜单打开但没有输入，且 renderedItems 为空，则生成所有可用的 suggestions
    if (!inputValue.trim() && isMenuOpen && smartCombobox.renderedItems.length === 0) {
      const availableSuggestions = suggestions.filter(suggestion => {
        const isSelected = tags.includes(suggestion);
        const isExcluded = excludeTags.includes(suggestion);
        return !isSelected && !isExcluded;
      });
      return availableSuggestions.map((suggestion, idx) => ({
        type: 'match' as const,
        data: suggestion,
        index: idx,
        // 使用 activeIndex 而不是 smartCombobox.highlightedIndex，因为在这种情况下 smartCombobox 的 renderedItems 是空的
        isHighlighted: idx === activeIndex,
        id: `tag-input-option-${idx}`,
      }));
    }
    return smartCombobox.renderedItems;
  }, [inputValue, isMenuOpen, smartCombobox.renderedItems, activeIndex, suggestions, tags, excludeTags]);

  // ---------------------------------------------------------------------------
  // 核心架构 2: 事件阻断 (Event Interception)
  // ---------------------------------------------------------------------------
  // 在 onMouseDown 中阻止浏览器默认的焦点转移行为
  // 浏览器默认：mousedown -> blur (Input失焦) -> focus (Button得焦) -> click
  // 通过 preventDefault 阻止焦点转移，确保焦点始终保持在 Input 上
  const getOptionProps = useCallback((index: number) => {
    // 从增强的 renderedItems 中找到对应的项
    const renderedItem = enhancedRenderedItems[index];
    if (!renderedItem) {
      return {
        onMouseDown: () => {},
        onClick: () => {},
        onMouseEnter: () => {},
        'data-active': false,
        id: `tag-input-option-${index}`,
        role: 'option' as const,
        'aria-selected': false,
      };
    }
    
    return {
      onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation(); // 防止事件冒泡干扰其他处理器
      },
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        
        setIsMenuOpenState(false);
        manuallyOpenedRef.current = false;
        manuallyClosedRef.current = true;
        smartCombobox.setHighlightedIndex(-1);
        setActiveIndex(-1);
        
        // 触发触感反馈
        deviceAdapter.haptic.impactLight();
        
        if (renderedItem.type === 'create') {
          addTag(renderedItem.data as string, "input");
        } else {
          addTag(renderedItem.data as string, "suggestion");
        }
      },
      onMouseEnter: () => {
        // 当使用 enhancedRenderedItems 时，需要手动同步 activeIndex
        if (!inputValue.trim() && isMenuOpen && smartCombobox.renderedItems.length === 0) {
          setActiveIndex(index);
        } else {
          smartCombobox.setHighlightedIndex(index);
        }
      },
      'data-active': index === activeIndex,
      // A11y 属性 - 符合 WAI-ARIA 标准
      id: renderedItem.id,
      role: 'option' as const,
      'aria-selected': index === smartCombobox.highlightedIndex,
    };
  }, [enhancedRenderedItems, smartCombobox, addTag, deviceAdapter]);
  
  return {
    inputValue,
    options,
    isMenuOpen,
    activeIndex,
    setIsMenuOpen,
    getInputProps,
    getOptionProps,
    removeTag,
    inputRef,
    containerRef,
    optionButtonsRef,
    // 新增：用于新架构的扩展接口（向后兼容）
    renderedItems: enhancedRenderedItems.map(item => ({
      type: item.type,
      data: item.data,
      index: item.index,
      isHighlighted: item.isHighlighted,
      id: item.id,
    })),
    secondaryAction: smartCombobox.secondaryAction,
  };
}

