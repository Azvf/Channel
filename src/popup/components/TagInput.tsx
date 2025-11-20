import { useState, useRef, useEffect, useLayoutEffect, KeyboardEvent, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "./Tag";
import { ChevronDown, Plus } from "lucide-react";
import { useProgressiveEscape } from "../../hooks/useProgressiveEscape";

// ----------------------------------------------------------------
// 独立组件: 负责无延迟跟随的下拉菜单容器
// ----------------------------------------------------------------
interface StickyDropdownProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  zIndex?: string;
}

function StickyDropdown({ isOpen, anchorRef, children, zIndex = "var(--z-dropdown)" }: StickyDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(isOpen);

  // 处理延迟卸载以播放退出动画 (简单的状态同步)
  useEffect(() => {
    if (isOpen) setIsMounted(true);
    else {
      const timer = setTimeout(() => setIsMounted(false), 200); // 匹配 CSS duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 核心：高性能定位逻辑
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const rect = anchor.getBoundingClientRect();
    // 直接操作 style，避开 React Render Cycle
    dropdown.style.top = `${rect.bottom + 8}px`; // 8px 间距
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isMounted) return;
    
    // 1. 立即定位 (防止首帧错位)
    updatePosition();
    
    // 2. 绑定事件 (增强版)
    // 某些测试环境或复杂布局下，scroll 事件可能只冒泡到 document 而非 window
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    // ✅ 修复：增加对 document 的滚动监听，作为双重保障
    document.addEventListener('scroll', updatePosition, true);
    
    // 3. 启动 rAF 循环
    // ✅ 修复：使用 Ref 追踪最新的 frameId，确保 cleanup 能拿到正确的值
    const frameRef = { id: 0 };
    const loop = () => {
      updatePosition();
      frameRef.id = requestAnimationFrame(loop);
    };
    
    // 启动循环
    frameRef.id = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      // ✅ 修复：清理 document 滚动监听
      document.removeEventListener('scroll', updatePosition, true);
      // ✅ 总是取消最新的帧，防止资源泄漏
      cancelAnimationFrame(frameRef.id);
    };
  }, [isMounted, updatePosition]);

  if (!isMounted) return null;

  return createPortal(
    <div 
      ref={dropdownRef}
      className={`fixed transition-[opacity,transform] duration-200 ease-out ${
        isOpen 
          ? 'opacity-100 translate-y-1 scale-100' 
          : 'opacity-0 translate-y-0 scale-98 pointer-events-none'
      }`}
      style={{
        zIndex: zIndex,
        transformOrigin: 'top center',
        // 初始位置设为 -9999 防止第一帧闪烁
        top: -9999, 
        left: 0 
      }}
    >
      {children}
    </div>,
    document.body
  );
}

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
  const [selectedIndex, setSelectedIndex] = useState(-1); // 当前选中的下拉菜单选项索引
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  
  const manuallyOpenedRef = useRef(false);
  const isAddingTagRef = useRef(false);
  const inputValueBeforeTagAddRef = useRef<string>("");
  const manuallyClosedRef = useRef(false); // ✅ 修复：标记菜单是否被手动关闭（如 ESC）

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
  // 3. 状态管理: 显示/隐藏逻辑
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
    // ✅ 修复：如果菜单被手动关闭（如 ESC），不要自动重新打开
    // 只有当用户继续输入时（onChange 会清除 manuallyClosedRef），才允许重新打开
    if (manuallyClosedRef.current) {
      // 输入值未改变，保持关闭状态（防止 useEffect 自动重新打开）
      return;
    }
    
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
    // ✅ 修复：从依赖数组中移除 selectedIndex，防止 ESC 逻辑死循环
    // 当按下 ESC 时，setSelectedIndex(-1) 不应该触发此 effect 重新执行
  }, [displayOptions, inputValue]);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // 检查是否点击了容器内部
      const isClickInsideContainer = containerRef.current?.contains(target);
      
      // 检查是否点击了下拉菜单（通过查找包含特定类的元素）
      const dropdownElement = (target as Element)?.closest('[data-sticky-dropdown]');
      
      if (!isClickInsideContainer && !dropdownElement) {
        setShowSuggestions(false);
        manuallyOpenedRef.current = false;
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      manuallyOpenedRef.current = false;
      setSelectedIndex(-1);
      inputRef.current?.focus();
    } else {
      if (!tags.includes(trimmedTag)) {
        inputValueBeforeTagAddRef.current = inputValue;
        isAddingTagRef.current = true;
        setShowSuggestions(false);
        manuallyOpenedRef.current = false;
        onTagsChange([...tags, trimmedTag]);
      }
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  // 定义：层级撤销策略
  const handleEscape = useProgressiveEscape([
    {
      id: 'close-dropdown',
      predicate: () => showSuggestions, // Level 1: 如果菜单开着
      action: () => {
        setShowSuggestions(false);
        manuallyOpenedRef.current = false;
        manuallyClosedRef.current = true; // ✅ 修复：标记菜单被手动关闭
        setSelectedIndex(-1);
      }
    },
    {
      id: 'clear-input',
      predicate: () => inputValue.length > 0, // Level 2: 如果有文字
      action: () => setInputValue("")
    }
    // Level 3: 自动 Fallback 到默认行为
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 1. 先让 ESC 钩子处理
    if (e.key === 'Escape') {
      handleEscape(e);
      return;
    }

    // 2. 处理其他按键 (ArrowDown, Enter...)
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
    }
  };

  const handleSelect = (suggestion: string) => {
    setShowSuggestions(false);
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
                onChange={(e) => {
                  // ✅ 修复：输入时清除手动关闭标记，允许菜单重新打开
                  if (manuallyClosedRef.current && e.target.value !== inputValue) {
                    manuallyClosedRef.current = false;
                  }
                  setInputValue(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  // ✅ 修复：点击时，意味着用户有明确意图，可以重置手动关闭标记
                  manuallyClosedRef.current = false;
                  if (suggestions.length > 0 && inputValue.trim()) {
                    setShowSuggestions(true);
                    manuallyOpenedRef.current = false;
                  }
                }}
                onFocus={() => {
                  // 🚨 修复：增加 !manuallyClosedRef.current 检查
                  // 防止 ESC 关闭后，因焦点事件导致的意外重开
                  if (
                    suggestions.length > 0 && 
                    inputValue.trim() && 
                    !isAddingTagRef.current && 
                    !disabled && 
                    !manuallyClosedRef.current // <--- 新增此条件
                  ) {
                    // 注意：这里不再重置 manuallyClosedRef，
                    // 只有用户输入(onChange)或点击(onClick)时才重置它
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

      {/* Dropdown (使用 StickyDropdown 组件) */}
      <StickyDropdown 
        isOpen={showSuggestions && displayOptions.length > 0} 
        anchorRef={containerRef}
        zIndex={dropdownZIndex}
      >
        <div 
          data-sticky-dropdown
          className="overflow-hidden border border-[color-mix(in_srgb,var(--c-light)_20%,transparent)] shadow-2xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--c-bg) 95%, var(--c-glass) 15%)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: '0.85rem',
            boxShadow: '0 16px 40px -12px rgba(0, 0, 0, 0.2), 0 4px 12px -4px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex flex-col p-1.5">
            <div 
              className="max-h-[240px] overflow-y-auto overflow-x-hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>

              {displayOptions.map((option, index) => {
                const isCreateOption = allowCreation && 
                                     option === inputValue.trim() && 
                                     !suggestions.some(s => s.toLowerCase() === option.toLowerCase());

                return (
                  <div key={`${option}-${index}`} className="scrollbar-hide">
                    <button
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </StickyDropdown>
    </div>
  );
}
