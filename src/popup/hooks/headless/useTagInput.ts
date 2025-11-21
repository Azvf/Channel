import { useState, useRef, useEffect, useMemo, useCallback, KeyboardEvent } from 'react';
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
    'aria-activedescendant'?: string;
  };
  getOptionProps: (index: number) => {
    onClick: () => void;
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
  autoFocus = false,
  disabled = false,
}: UseTagInputProps): UseTagInputReturn {
  // --- 状态机 ---
  const [inputValue, setInputValue] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
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
  
  // --- 自动聚焦逻辑 ---
  useEffect(() => {
    if (!autoFocus || !inputRef.current) return;
    const focusTimer = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(focusTimer);
  }, [autoFocus]);
  
  // --- 纯逻辑：建议列表计算 ---
  const options = useMemo(() => {
    const trimmed = inputValue.trim();
    const lowerInput = trimmed.toLowerCase();
    
    if (!trimmed && !isMenuOpen) return []; // 优化：未打开时不计算
    
    const available = suggestions.filter(s => 
      !tags.includes(s) && !excludeTags.includes(s)
    );
    
    // 模糊匹配
    const matches = available.filter(s => s.toLowerCase().includes(lowerInput));
    
    // 检查是否有精确匹配
    const exactMatch = suggestions.some(s => s.toLowerCase() === lowerInput);
    const alreadySelected = tags.some(t => t.toLowerCase() === lowerInput);
    
    // "创建新标签" 选项逻辑
    if (allowCreation && trimmed && !exactMatch && !alreadySelected) {
      return [trimmed, ...matches]; // 第一项是用户输入（用于创建）
    }
    
    return matches;
  }, [inputValue, suggestions, tags, excludeTags, isMenuOpen, allowCreation]);
  
  // --- 渐进式退出逻辑 ---
  const handleEscape = useProgressiveEscape([
    {
      id: 'close-dropdown',
      predicate: () => isMenuOpen,
      action: () => {
        setIsMenuOpen(false);
        manuallyOpenedRef.current = false;
        manuallyClosedRef.current = true;
        setActiveIndex(-1);
      }
    },
    {
      id: 'clear-input',
      predicate: () => inputValue.length > 0,
      action: () => setInputValue("")
    }
  ]);
  
  // --- 动作：添加/删除 ---
  const addTag = useCallback((tagToAdd: string, source: "input" | "suggestion" = "input") => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    
    const matchesSuggestion = suggestions.some(s => s.toLowerCase() === trimmed.toLowerCase());
    
    if (!allowCreation && source === "input" && !matchesSuggestion) return;
    
    // 区分是"选择建议"还是"创建新标签"
    if (mode === "create") {
      if (!matchesSuggestion && onCreateTag) {
        onCreateTag(trimmed);
      }
      setInputValue("");
      setIsMenuOpen(false);
      manuallyOpenedRef.current = false;
      setActiveIndex(-1);
      inputRef.current?.focus();
    } else {
      // list 模式
      if (!tags.includes(trimmed)) {
        inputValueBeforeTagAddRef.current = inputValue;
        isAddingTagRef.current = true;
        setIsMenuOpen(false);
        manuallyOpenedRef.current = false;
        onTagsChange([...tags, trimmed]);
      }
      setInputValue("");
    }
  }, [tags, onTagsChange, allowCreation, mode, onCreateTag, suggestions, inputValue]);
  
  const removeTag = useCallback((index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
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
      setIsMenuOpen(prev => {
        if (!prev) return true;
        return prev;
      });
    } else if (options.length === 0) {
      setIsMenuOpen(false);
    }
  }, [options, inputValue]);
  
  // --- 交互：键盘事件处理 (核心复杂性所在) ---
  const getInputProps = useCallback((userProps?: React.InputHTMLAttributes<HTMLInputElement>) => {
    // 解构 userProps，排除可能冲突的属性
    const { value: _, onChange: userOnChange, onKeyDown: userOnKeyDown, onFocus: userOnFocus, onClick: userOnClick, placeholder: userPlaceholder, className: userClassName, style: userStyle, ...restUserProps } = userProps || {};
    
    return {
      ...restUserProps,
      value: inputValue, // 确保 value 始终是 string
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        // 输入时清除手动关闭标记，允许菜单重新打开
        if (manuallyClosedRef.current && e.target.value !== inputValue) {
          manuallyClosedRef.current = false;
        }
        setInputValue(e.target.value);
        userOnChange?.(e);
      },
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        // 1. 先让 ESC 钩子处理
        if (e.key === 'Escape') {
          handleEscape(e);
          userOnKeyDown?.(e);
          return;
        }
        
        // 2. 处理其他按键
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (!isMenuOpen && options.length > 0) {
              setIsMenuOpen(true);
              manuallyOpenedRef.current = false;
            }
            setActiveIndex(prev => {
              const next = prev < 0 ? 0 : (prev < options.length - 1 ? prev + 1 : 0);
              // 确保滚动可见
              optionButtonsRef.current[next]?.scrollIntoView({ block: 'nearest' });
              return next;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (!isMenuOpen && options.length > 0) {
              setIsMenuOpen(true);
              manuallyOpenedRef.current = false;
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
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        // 防止 ESC 关闭后，因焦点事件导致的意外重开
        if (
          suggestions.length > 0 && 
          inputValue.trim() && 
          !isAddingTagRef.current && 
          !disabled && 
          !manuallyClosedRef.current
        ) {
          setIsMenuOpen(true);
          manuallyOpenedRef.current = false;
        }
        userOnFocus?.(e);
      },
      onClick: (e: React.MouseEvent<HTMLInputElement>) => {
        // 点击时，意味着用户有明确意图，可以重置手动关闭标记
        manuallyClosedRef.current = false;
        if (suggestions.length > 0 && inputValue.trim()) {
          setIsMenuOpen(true);
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
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        ...userStyle,
      },
      // A11y 属性 - 符合 WAI-ARIA 标准
      role: 'combobox',
      'aria-autocomplete': 'list' as const,
      'aria-expanded': isMenuOpen,
      'aria-activedescendant': activeIndex >= 0 ? `tag-input-option-${activeIndex}` : undefined,
    };
  }, [inputValue, isMenuOpen, options, activeIndex, tags, mode, disabled, suggestions, allowCreation, handleEscape, addTag, removeTag]);
  
  // --- 交互：选项点击 ---
  const getOptionProps = useCallback((index: number) => ({
    onClick: () => {
      setIsMenuOpen(false);
      manuallyOpenedRef.current = false;
      setActiveIndex(-1);
      addTag(options[index], "suggestion");
      inputRef.current?.focus();
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

