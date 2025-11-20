import { useState, useRef, useEffect, KeyboardEvent, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "./Tag";
import { ChevronDown, Plus } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void | Promise<void>;
  placeholder?: string;
  suggestions?: string[];
  excludeTags?: string[]; // 新增: 需要排除的标签（用于create模式）
  className?: string;
  autoFocus?: boolean; // 新增: 自动聚焦
  disabled?: boolean; // 新增: 禁用状态
  mode?: "list" | "create"; // 新增: 模式选择
  onCreateTag?: (tagName: string) => void; // 新增: create模式下创建标签的回调
  allowCreation?: boolean; // 新增: 是否允许创建新标签
  dropdownZIndex?: string;
}

export function TagInput({ 
  tags, 
  onTagsChange, 
  placeholder = "", 
  suggestions = [],
  excludeTags = [],
  className = "",
  autoFocus = false,
  disabled = false,
  mode = "list",
  onCreateTag,
  allowCreation = true,
  dropdownZIndex = "var(--z-dropdown)"
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1); // 当前选中的下拉菜单选项索引
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isPositionReady, setIsPositionReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  
  const wasShowingRef = useRef(false);
  const manuallyOpenedRef = useRef(false);
  const isAddingTagRef = useRef(false);
  const inputValueBeforeTagAddRef = useRef<string>("");

  // ----------------------------------------------------------------
  // 1. 核心逻辑优化: 自动聚焦
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!autoFocus || !inputRef.current) return;
    const focusTimer = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(focusTimer);
  }, [autoFocus]);

  // ----------------------------------------------------------------
  // 2. 核心逻辑优化: 建议列表计算 (Memoized)
  // ----------------------------------------------------------------
  const displayOptions = useMemo(() => {
    const trimmedInput = inputValue.trim();
    const lowerInput = trimmedInput.toLowerCase();
    
    const matched = suggestions.filter(s => 
      s.toLowerCase().includes(lowerInput) && 
      !tags.includes(s) &&
      !excludeTags.includes(s)
    );

    const exactMatch = suggestions.some(s => s.toLowerCase() === lowerInput);
    const alreadySelected = tags.some(t => t.toLowerCase() === lowerInput);

    // 允许创建新标签的逻辑
    if (allowCreation && trimmedInput && !exactMatch && !alreadySelected) {
      return [trimmedInput, ...matched];
    }

    return matched;
  }, [inputValue, suggestions, tags, excludeTags, allowCreation]);

  // ----------------------------------------------------------------
  // 3. 核心优化: 稳健的下拉菜单定位系统
  // ----------------------------------------------------------------
  const updateDropdownPosition = useCallback(() => {
    if (showSuggestions && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceInPx = 8;
      setDropdownPosition({
        top: rect.bottom + spaceInPx, // 移除 window.scrollY，因为 fixed 定位是相对于视口的
        left: rect.left,              // 移除 window.scrollX
        width: rect.width
      });
      setIsPositionReady(true);
    }
  }, [showSuggestions]);

  // 监听滚动和调整大小，实时更新位置
  useEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true); // capture=true 以捕获所有滚动
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showSuggestions, updateDropdownPosition]);

  // ----------------------------------------------------------------
  // 4. 状态管理: 显示/隐藏逻辑
  // ----------------------------------------------------------------
  useEffect(() => {
    // 处理添加标签后的状态清理
    const inputValueCleared = inputValueBeforeTagAddRef.current.trim() !== "" && inputValue.trim() === "";
    if (isAddingTagRef.current && inputValueCleared) {
      isAddingTagRef.current = false;
      inputValueBeforeTagAddRef.current = "";
      setSelectedIndex(-1);
      return;
    }

    if (inputValue.trim() !== "") {
      isAddingTagRef.current = false;
      inputValueBeforeTagAddRef.current = "";
    }

    // 控制显示逻辑
    if (displayOptions.length > 0 && (inputValue || manuallyOpenedRef.current)) {
      setShowSuggestions(prev => {
        if (!prev) return true;
        return prev;
      });
      // 仅在之前没有选中项时重置（保留键盘导航状态）
      if (selectedIndex === -1) setSelectedIndex(-1);
    } else if (displayOptions.length === 0) {
      setShowSuggestions(false);
    }
  }, [displayOptions, inputValue, selectedIndex]);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // 检查是否点击了 input、容器、dropdown 或 dropdown 中的按钮
      const isClickInsideContainer = containerRef.current?.contains(target);
      const isClickInsideDropdown = dropdownRef.current?.contains(target);
      
      if (!isClickInsideContainer && !isClickInsideDropdown) {
        setShowSuggestions(false);
        setShouldShowDropdown(false);
        manuallyOpenedRef.current = false;
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 动画状态管理
  useEffect(() => {
    const element = dropdownRef.current;
    if (showSuggestions) {
      setIsAnimating(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldShowDropdown(true);
          wasShowingRef.current = true;
        });
      });
    } else if (wasShowingRef.current) {
      setShouldShowDropdown(false);
      wasShowingRef.current = false;
      setIsAnimating(true);
      
      const handleTransitionEnd = (e: TransitionEvent) => {
        if (e.target === element && (e.propertyName === 'opacity' || e.propertyName === 'transform')) {
          setIsAnimating(false);
        }
      };
      // 设置一个安全超时，防止 transitionend 不触发
      const safetyTimer = setTimeout(() => setIsAnimating(false), 300);
      
      if (element) {
        element.addEventListener('transitionend', handleTransitionEnd);
        return () => {
          element.removeEventListener('transitionend', handleTransitionEnd);
          clearTimeout(safetyTimer);
        };
      }
    } else {
      setShouldShowDropdown(false);
      setIsAnimating(false);
    }
  }, [showSuggestions]);

  // ----------------------------------------------------------------
  // 5. 交互处理: 添加/移除/键盘
  // ----------------------------------------------------------------
  const addTag = (tag: string, source: "input" | "suggestion" = "input") => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const matchesSuggestion = suggestions.some(s => s.toLowerCase() === trimmedTag.toLowerCase());

    if (!allowCreation && source === "input" && !matchesSuggestion) return;

    if (mode === "create") {
      if (!allowCreation && source === "input" && !matchesSuggestion) return;
      if (onCreateTag) onCreateTag(trimmedTag);
      
      setInputValue("");
      setShowSuggestions(false);
      setShouldShowDropdown(false);
      manuallyOpenedRef.current = false;
      setSelectedIndex(-1);
      inputRef.current?.focus();
    } else {
      if (!tags.includes(trimmedTag)) {
        inputValueBeforeTagAddRef.current = inputValue;
        isAddingTagRef.current = true;
        setShowSuggestions(false);
        setShouldShowDropdown(false);
        manuallyOpenedRef.current = false;
        onTagsChange([...tags, trimmedTag]);
      }
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions && displayOptions.length > 0) {
        setShowSuggestions(true);
        manuallyOpenedRef.current = false;
      }
      setSelectedIndex(prev => {
        const next = prev < 0 ? 0 : (prev < displayOptions.length - 1 ? prev + 1 : 0);
        // 确保滚动可见
        suggestionButtonsRef.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!showSuggestions && displayOptions.length > 0) {
        setShowSuggestions(true);
        manuallyOpenedRef.current = false;
      }
      setSelectedIndex(prev => {
        const next = prev > 0 ? prev - 1 : displayOptions.length - 1;
        suggestionButtonsRef.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < displayOptions.length && showSuggestions) {
        handleSelect(displayOptions[selectedIndex]);
      } else if (inputValue.trim()) {
        const trimmedValue = inputValue.trim();
        const matchesSuggestion = suggestions.some(s => s.toLowerCase() === trimmedValue.toLowerCase());
        if (allowCreation || matchesSuggestion) {
          addTag(inputValue, matchesSuggestion ? "suggestion" : "input");
        }
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0 && mode === "list") {
      removeTag(tags.length - 1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setShouldShowDropdown(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    setShowSuggestions(false);
    setShouldShowDropdown(false);
    manuallyOpenedRef.current = false;
    setSelectedIndex(-1);
    addTag(suggestion, "suggestion");
    inputRef.current?.focus();
  };

  // ----------------------------------------------------------------
  // 6. 渲染
  // ----------------------------------------------------------------
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 保持原有的 Glass Wrapper 结构 */}
      <div className="liquidGlass-wrapper relative">
        <div className="liquidGlass-content">
          <motion.div 
            className="min-h-[2.6rem]"
            style={{ backfaceVisibility: 'hidden', overflow: 'hidden' }}
          >
            <div
              className="flex flex-wrap gap-2 items-center px-4 py-2 cursor-text"
              style={{ height: 'auto' }}
              // 优化：点击容器任意位置聚焦输入框
              onClick={() => inputRef.current?.focus()}
            >
              {/* 只在list模式下显示标签气泡 */}
              <AnimatePresence mode="popLayout">
                {mode === "list" && tags.map((tag, index) => (
                  <Tag 
                    key={tag}
                    label={tag} 
                    onRemove={() => removeTag(index)}
                  />
                ))}
              </AnimatePresence>
              
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0 && inputValue.trim() && !isAddingTagRef.current && !disabled) {
                    setShowSuggestions(true);
                    manuallyOpenedRef.current = false;
                  }
                }}
                placeholder={tags.length === 0 ? placeholder : ""}
                disabled={disabled}
                // 优化：减小 min-width，使输入体验更流畅
                className="flex-1 min-w-[60px] bg-transparent outline-none"
                style={{ 
                  color: 'var(--color-text-primary)',
                  font: 'var(--font-body)',
                  letterSpacing: 'var(--letter-spacing-body)',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'text'
                }}
              />
              
              {suggestions.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 防止触发容器的 focus
                    const newShowState = !showSuggestions;
                    setShowSuggestions(newShowState);
                    manuallyOpenedRef.current = newShowState;
                    if (!newShowState) setShouldShowDropdown(false);
                    if (newShowState) inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-full flex-shrink-0 transition-all ml-auto"
                  style={{ 
                    color: showSuggestions ? 'var(--c-action)' : 'color-mix(in srgb, var(--c-content) 60%, transparent)',
                    background: showSuggestions ? 'color-mix(in srgb, var(--c-glass) 20%, transparent)' : 'transparent'
                  }}
                  // 保留原有的 hover 样式逻辑
                  onMouseEnter={(e) => {
                    if (!showSuggestions) {
                      e.currentTarget.style.color = 'var(--c-action)';
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showSuggestions) {
                      e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 60%, transparent)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                  tabIndex={-1}
                >
                  <motion.div
                    animate={{ rotate: showSuggestions ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  </motion.div>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dropdown (Portal) */}
      {isPositionReady && (showSuggestions || isAnimating) && displayOptions.length > 0 && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed transition-all duration-200 ease-out ${
            shouldShowDropdown 
              ? 'opacity-100 translate-y-1' 
              : 'opacity-0 translate-y-0 pointer-events-none'
          }`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: dropdownZIndex
          }}
        >
          <div 
            className="liquidGlass-wrapper shadow-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--c-bg) 85%, var(--c-glass) 15%)',
              backdropFilter: 'blur(16px) saturate(var(--saturation))',
              WebkitBackdropFilter: 'blur(16px) saturate(var(--saturation))',
              borderRadius: '0.75rem' // 略微优化圆角
            }}
          >
            <div className="liquidGlass-content">
              <div className="max-h-[200px] overflow-y-auto py-1.5">
                {displayOptions.map((option, index) => {
                  const isCreateOption = allowCreation && 
                                       option === inputValue.trim() && 
                                       !suggestions.some(s => s.toLowerCase() === option.toLowerCase());

                  return (
                    <button
                      key={`${option}-${index}`}
                      ref={(el) => { suggestionButtonsRef.current[index] = el; }}
                      onClick={() => handleSelect(option)}
                      className="w-full px-4 py-2 text-left transition-colors flex items-center gap-2"
                      style={{ 
                        color: selectedIndex === index 
                          ? 'var(--c-action)' 
                          : (isCreateOption ? 'var(--c-action)' : 'var(--c-content)'),
                        fontSize: '0.85rem',
                        fontWeight: isCreateOption ? 500 : 400,
                        letterSpacing: '0.01em',
                        background: selectedIndex === index 
                          ? 'color-mix(in srgb, var(--c-glass) 15%, transparent)' 
                          : 'transparent'
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {isCreateOption && (
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-[color-mix(in_srgb,var(--c-action)15%,transparent)]">
                          <Plus className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                      )}
                      <span className="truncate">
                        {isCreateOption ? `Create "${option}"` : option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
