import { useState, useRef, useEffect, useLayoutEffect, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { Tag } from "./Tag";
import { ChevronDown } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  excludeTags?: string[]; // 新增: 需要排除的标签（用于create模式）
  className?: string;
  autoFocus?: boolean; // 新增: 自动聚焦
  disabled?: boolean; // 新增: 禁用状态
  mode?: "list" | "create"; // 新增: 模式选择
  onCreateTag?: (tagName: string) => void; // 新增: create模式下创建标签的回调
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
  onCreateTag
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1); // 当前选中的下拉菜单选项索引
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isPositionReady, setIsPositionReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]); // 下拉菜单按钮的引用数组
  const wasShowingRef = useRef(false);
  const manuallyOpenedRef = useRef(false); // 跟踪是否是手动展开的
  const prevInputValueRef = useRef<string>(inputValue); // 跟踪上一次的inputValue
  const prevTagsLengthRef = useRef<number>(tags.length); // 跟踪上一次的tags长度
  const isAddingTagRef = useRef(false); // 跟踪是否正在添加tag（用于防止useEffect重新打开menu）
  const inputValueBeforeTagAddRef = useRef<string>(""); // 在tags增加时保存当时的inputValue

  // Auto focus on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // 同步prevTagsLengthRef（当tags从外部更新时，不通过addTag）
  useEffect(() => {
    prevTagsLengthRef.current = tags.length;
  }, [tags.length]);

  // 动态计算下拉菜单位置
  useLayoutEffect(() => {
    if (showSuggestions && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceInPx = 8; // 8px 间距

      setDropdownPosition({
        top: rect.bottom + (window.scrollY || 0) + spaceInPx,
        left: rect.left + (window.scrollX || 0),
        width: rect.width
      });
      setIsPositionReady(true);
    } else {
      setIsPositionReady(false);
    }
  }, [showSuggestions]);

  // 注意：高度动画现在由 framer-motion 的 layout 属性自动处理

  useEffect(() => {
    // 检测是否是添加tag导致的状态变化：
    // 1. tags长度增加了（已经在单独的useEffect中检测到）
    // 2. inputValue从有值变为空
    const inputValueCleared = inputValueBeforeTagAddRef.current.trim() !== "" && inputValue.trim() === "";
    
    if (isAddingTagRef.current && inputValueCleared) {
      // 确认是添加tag导致的状态变化，保持menu关闭
      // 更新filteredSuggestions但不打开menu
      if (suggestions.length > 0) {
        const filtered = suggestions.filter(s => 
          !tags.includes(s) && !excludeTags.includes(s)
        );
        setFilteredSuggestions(filtered);
      } else {
        setFilteredSuggestions([]);
      }
      // 重置标记（已完成添加tag的检测）
      isAddingTagRef.current = false;
      inputValueBeforeTagAddRef.current = "";
      // 重置选中索引
      setSelectedIndex(-1);
      // 更新refs后返回
      prevInputValueRef.current = inputValue;
      return;
    }

    // 如果inputValue有内容，重置所有添加tag相关的标记
    if (inputValue.trim() !== "") {
      isAddingTagRef.current = false;
      inputValueBeforeTagAddRef.current = "";
    }

    if (inputValue && suggestions.length > 0) {
      // 输入框有内容：显示匹配的suggestions
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(inputValue.toLowerCase()) && 
        !tags.includes(s) &&
        !excludeTags.includes(s)
      );
      setFilteredSuggestions(filtered);
      // 重置选中索引，因为列表变化了
      setSelectedIndex(-1);
      if (filtered.length > 0) {
        setShowSuggestions(true);
        manuallyOpenedRef.current = false; // 自动展开，不是手动
      } else {
        // 没有匹配的suggestions，如果之前是手动展开的，保持展开但显示空的filteredSuggestions
        // 如果不是手动展开的，则关闭
        if (!manuallyOpenedRef.current) {
          setShowSuggestions(false);
        }
      }
    } else if (!inputValue && suggestions.length > 0) {
      // 输入框为空：只有手动展开时才显示所有可用的suggestions
      const filtered = suggestions.filter(s => 
        !tags.includes(s) && !excludeTags.includes(s)
      );
      setFilteredSuggestions(filtered);
      // 重置选中索引，因为列表变化了
      setSelectedIndex(-1);
      // 如果之前是手动展开的，保持展开；否则关闭
      if (!manuallyOpenedRef.current) {
        setShowSuggestions(false);
      }
    } else {
      setFilteredSuggestions([]);
      setSelectedIndex(-1);
      if (!manuallyOpenedRef.current) {
        setShowSuggestions(false);
      }
    }

    // 更新refs
    prevInputValueRef.current = inputValue;
    prevTagsLengthRef.current = tags.length;
  }, [inputValue, suggestions, tags, excludeTags]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isClickInsideContainer = containerRef.current?.contains(target);
      const isClickInsideDropdown = dropdownRef.current?.contains(target);
      
      // 只有当点击既不在容器内也不在下拉菜单内时，才关闭下拉菜单
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

  // 处理显示和关闭动画
  useEffect(() => {
    const element = dropdownRef.current;
    
    if (showSuggestions) {
      // 显示时：先设置 isAnimating 为 true 让 dropdown 渲染（此时 shouldShowDropdown 为 false，所以是隐藏状态）
      setIsAnimating(true);
      // 使用 requestAnimationFrame 确保 DOM 先渲染隐藏状态
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // DOM 已渲染，现在设置为显示状态，触发渐入动画
          setShouldShowDropdown(true);
          wasShowingRef.current = true;
        });
      });
    } else if (wasShowingRef.current) {
      // 从显示状态变为隐藏：先设置 shouldShowDropdown 为 false 触发渐出动画
      setShouldShowDropdown(false);
      wasShowingRef.current = false;
      // 保持 isAnimating 为 true 以播放退出动画
      setIsAnimating(true);
      // 监听动画结束事件
      if (element) {
        const handleTransitionEnd = (e: TransitionEvent) => {
          // 确保是 opacity 或 transform 的过渡结束，避免子元素触发
          if (e.target === element && (e.propertyName === 'opacity' || e.propertyName === 'transform')) {
            setIsAnimating(false);
          }
        };
        element.addEventListener('transitionend', handleTransitionEnd);
        return () => element.removeEventListener('transitionend', handleTransitionEnd);
      } else {
        // 如果没有元素，说明还没渲染，直接设置为false
        setIsAnimating(false);
      }
    } else {
      // 如果之前没有显示过，直接设置为false
      setShouldShowDropdown(false);
      setIsAnimating(false);
    }
  }, [showSuggestions]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    if (mode === "create") {
      // create模式: 调用onCreateTag回调并清空输入框
      if (onCreateTag) {
        onCreateTag(trimmedTag);
      }
      setInputValue("");
      // 关闭menu状态
      setShowSuggestions(false);
      setShouldShowDropdown(false);
      manuallyOpenedRef.current = false;
      setSelectedIndex(-1);
      // 保持输入框焦点
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      // list模式: 原有逻辑，在内部创建气泡
      if (!tags.includes(trimmedTag)) {
        // 先保存当前的inputValue（在清空之前）
        inputValueBeforeTagAddRef.current = inputValue;
        // 标记正在添加tag
        isAddingTagRef.current = true;
        // 关闭menu状态
        setShowSuggestions(false);
        setShouldShowDropdown(false);
        manuallyOpenedRef.current = false;
        // 然后更新tags（这会触发useEffect，但isAddingTagRef已经设置）
        onTagsChange([...tags, trimmedTag]);
      }
      // 最后清空inputValue（这也会触发useEffect，useEffect会检测到isAddingTagRef并保持menu关闭）
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        // 如果下拉菜单没有显示，先显示它
        if (!showSuggestions) {
          setShowSuggestions(true);
          manuallyOpenedRef.current = false;
        }
        // 移动到下一个选项（循环）
        setSelectedIndex((prev) => {
          const nextIndex = prev < filteredSuggestions.length - 1 ? prev + 1 : 0;
          // 滚动到可见区域
          setTimeout(() => {
            suggestionButtonsRef.current[nextIndex]?.scrollIntoView({
              block: 'nearest',
              behavior: 'smooth'
            });
          }, 0);
          return nextIndex;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        // 如果下拉菜单没有显示，先显示它
        if (!showSuggestions) {
          setShowSuggestions(true);
          manuallyOpenedRef.current = false;
        }
        // 移动到上一个选项（循环）
        setSelectedIndex((prev) => {
          const nextIndex = prev > 0 ? prev - 1 : filteredSuggestions.length - 1;
          // 滚动到可见区域
          setTimeout(() => {
            suggestionButtonsRef.current[nextIndex]?.scrollIntoView({
              block: 'nearest',
              behavior: 'smooth'
            });
          }, 0);
          return nextIndex;
        });
      }
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length && showSuggestions) {
        // 如果有选中的选项，使用选中的选项
        e.preventDefault();
        handleSelect(filteredSuggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        // 否则，使用输入框的值
        e.preventDefault();
        addTag(inputValue);
      }
    } else if (e.key === 'Tab' && filteredSuggestions.length > 0 && showSuggestions) {
      // Handle Tab key to autocomplete first suggestion
      e.preventDefault();
      const autocompleteValue = filteredSuggestions[0];
      setInputValue(autocompleteValue);
      setShowSuggestions(false);
      setShouldShowDropdown(false);
      manuallyOpenedRef.current = false;
      setSelectedIndex(-1);
      // 设置光标位置到文本末尾并保持焦点
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(autocompleteValue.length, autocompleteValue.length);
        }
      }, 0);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0 && mode === "list") {
      // 只在list模式下支持Backspace删除标签
      e.preventDefault();
      removeTag(tags.length - 1);
    } else {
      // 其他按键输入时，重置选中索引
      setSelectedIndex(-1);
    }
  };

  const handleSelect = (suggestion: string) => {
    // 先关闭menu状态
    setShowSuggestions(false);
    setShouldShowDropdown(false);
    manuallyOpenedRef.current = false;
    // 重置选中索引
    setSelectedIndex(-1);
    // 然后添加tag（addTag会按正确顺序更新状态，useEffect会检测到是添加tag并保持menu关闭）
    addTag(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input container with glass effect */}
      <div className="liquidGlass-wrapper relative">
        {/* Content layer */}
        <div className="liquidGlass-content">
          <motion.div 
            layout // <-- 这就是"魔法"：自动处理高度动画
            transition={LAYOUT_TRANSITION} // <-- 使用我们的标准物理
            className="min-h-[2.6rem]"
            style={{
              willChange: 'height',
              backfaceVisibility: 'hidden',
              overflow: 'hidden' // 保持裁切
            }}
          >
            {/* 创建新的内部 flex 容器 */}
            <div
              className="flex flex-wrap gap-2 items-center px-4 py-2" // 将所有 flex 和 padding 样式移到这里
              style={{ height: 'auto' }} // 确保内部容器高度始终自动
            >
              {/* 只在list模式下显示标签气泡 */}
              {mode === "list" && tags.map((tag, index) => (
                <Tag 
                  key={`${tag}-${index}`}
                  label={tag} 
                  onRemove={() => removeTag(index)}
                />
              ))}
              
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // 只有当输入框有内容时才自动显示下拉菜单
                  if (suggestions.length > 0 && inputValue.trim() && !isAddingTagRef.current && !disabled) {
                    setShowSuggestions(true);
                    manuallyOpenedRef.current = false;
                  }
                }}
                placeholder={tags.length === 0 ? placeholder : ""}
                disabled={disabled}
                className="flex-1 min-w-[140px] bg-transparent outline-none"
                style={{ 
                  color: 'var(--c-content)',
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'text'
                }}
              />
              
              {/* Dropdown indicator */}
              {suggestions.length > 0 && (
                <button
                  onClick={() => {
                    const newShowState = !showSuggestions;
                    setShowSuggestions(newShowState);
                    manuallyOpenedRef.current = newShowState; // 手动点击按钮展开/关闭
                    if (!newShowState) {
                      // 关闭时重置状态
                      setShouldShowDropdown(false);
                    }
                  }}
                  className="p-1.5 rounded-full flex-shrink-0 transition-all"
                  style={{ 
                    color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
                    background: showSuggestions ? 'color-mix(in srgb, var(--c-glass) 20%, transparent)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--c-action)';
                    if (!showSuggestions) {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 60%, transparent)';
                    if (!showSuggestions) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dropdown suggestions - Portal 化 */}
      {isPositionReady && (showSuggestions || isAnimating) && filteredSuggestions.length > 0 && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed transition-all duration-300 ease-out ${
            shouldShowDropdown 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 'var(--z-dropdown)'
          }}
        >
          <div 
            className="liquidGlass-wrapper"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--c-bg) 85%, var(--c-glass) 15%)',
              backdropFilter: 'blur(16px) saturate(var(--saturation))',
              WebkitBackdropFilter: 'blur(16px) saturate(var(--saturation))'
            }}
          >
            {/* Content layer */}
            <div 
              className="liquidGlass-content"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--c-bg) 60%, transparent)'
              }}
            >
              <div className="max-h-[160px] overflow-y-auto py-2">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    ref={(el) => {
                      suggestionButtonsRef.current[index] = el;
                    }}
                    onClick={() => handleSelect(suggestion)}
                    className="w-full px-5 py-2.5 text-left transition-all rounded-lg mx-2"
                    style={{ 
                      color: selectedIndex === index ? 'var(--c-action)' : 'var(--c-content)',
                      fontSize: '0.85rem',
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                      width: 'calc(100% - 1rem)',
                      background: selectedIndex === index 
                        ? 'color-mix(in srgb, var(--c-glass) 20%, transparent)' 
                        : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      setSelectedIndex(index);
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 20%, transparent)';
                      e.currentTarget.style.color = 'var(--c-action)';
                    }}
                    onMouseLeave={(e) => {
                      // 注意：这里不重置selectedIndex，保持键盘导航的状态
                      // 只有当鼠标悬停时才更新索引，但离开时不重置
                      e.currentTarget.style.background = selectedIndex === index 
                        ? 'color-mix(in srgb, var(--c-glass) 20%, transparent)' 
                        : 'transparent';
                      e.currentTarget.style.color = selectedIndex === index 
                        ? 'var(--c-action)' 
                        : 'var(--c-content)';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
