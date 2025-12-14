import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, KeyboardEvent } from 'react';
import { useProgressiveEscape } from '../../../hooks/useProgressiveEscape';

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
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // 包装 setIsMenuOpen，确保关闭时设置 manuallyClosedRef
  const setIsMenuOpen = useCallback((open: boolean) => {
    setIsMenuOpenState(open);
    if (!open) {
      manuallyClosedRef.current = true;
    }
  }, []);
  
  // 为了保持兼容性，使用内部状态
  const isMenuOpen = isMenuOpenState;
  
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
  
  // --- 纯逻辑：建议列表计算 ---
  const options = useMemo(() => {
    const trimmed = inputValue.trim();
    const lowerInput = trimmed.toLowerCase();
    
    // 未打开且无输入时不计算，避免不必要的计算开销
    if (!trimmed && !isMenuOpen) return [];
    
    const available = suggestions.filter(s => 
      !tags.includes(s) && !excludeTags.includes(s)
    );
    
    const matches = available.filter(s => s.toLowerCase().includes(lowerInput));
    const exactMatch = suggestions.some(s => s.toLowerCase() === lowerInput);
    const alreadySelected = tags.some(t => t.toLowerCase() === lowerInput);
    
    // 允许创建且输入不匹配现有建议时，将用户输入作为第一项（用于创建新标签）
    if (allowCreation && trimmed && !exactMatch && !alreadySelected) {
      return [trimmed, ...matches];
    }
    
    return matches;
  }, [inputValue, suggestions, tags, excludeTags, isMenuOpen, allowCreation]);
  
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
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (!isMenuOpen && options.length > 0) {
              setIsMenuOpenState(true);
              manuallyOpenedRef.current = false;
              manuallyClosedRef.current = false;
            }
            setActiveIndex(prev => {
              const next = prev < 0 ? 0 : (prev < options.length - 1 ? prev + 1 : 0);
              // 滚动到可见区域，确保键盘导航时选项始终可见
              optionButtonsRef.current[next]?.scrollIntoView({ block: 'nearest' });
              return next;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (!isMenuOpen && options.length > 0) {
              setIsMenuOpenState(true);
              manuallyOpenedRef.current = false;
              manuallyClosedRef.current = false;
            }
            setActiveIndex(prev => {
              const next = prev > 0 ? prev - 1 : options.length - 1;
              optionButtonsRef.current[next]?.scrollIntoView({ block: 'nearest' });
              return next;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < options.length && isMenuOpen) {
              addTag(options[activeIndex], "suggestion");
            } else if (inputValue.trim()) {
              const trimmedValue = inputValue.trim();
              const matchesSuggestion = suggestions.some(s => s.toLowerCase() === trimmedValue.toLowerCase());
              if (allowCreation || matchesSuggestion) {
                addTag(inputValue, matchesSuggestion ? "suggestion" : "input");
              }
            }
            break;
          case 'Backspace':
            if (!inputValue && tags.length > 0 && mode === "list") {
              removeTag(tags.length - 1);
            }
            break;
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
          if (activeIndex < 0 && options.length > 0) {
            setActiveIndex(0);
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
      'aria-activedescendant': activeIndex >= 0 ? `tag-input-option-${activeIndex}` : undefined,
    };
  }, [inputValue, isMenuOpen, options, activeIndex, tags, mode, disabled, suggestions, allowCreation, handleEscape, addTag, removeTag]);
  
  // ---------------------------------------------------------------------------
  // 核心架构 2: 事件阻断 (Event Interception)
  // ---------------------------------------------------------------------------
  // 在 onMouseDown 中阻止浏览器默认的焦点转移行为
  // 浏览器默认：mousedown -> blur (Input失焦) -> focus (Button得焦) -> click
  // 通过 preventDefault 阻止焦点转移，确保焦点始终保持在 Input 上
  const getOptionProps = useCallback((index: number) => ({
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation(); // 防止事件冒泡干扰其他处理器
    },
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      
      setIsMenuOpenState(false);
      manuallyOpenedRef.current = false;
      manuallyClosedRef.current = true;
      setActiveIndex(-1);
      
      addTag(options[index], "suggestion");
    },
    onMouseEnter: () => setActiveIndex(index),
    'data-active': index === activeIndex,
    // A11y 属性 - 符合 WAI-ARIA 标准
    id: `tag-input-option-${index}`,
    role: 'option',
    'aria-selected': index === activeIndex,
  }), [options, activeIndex, addTag]);
  
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
  };
}

