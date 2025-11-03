import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Tag } from "./Tag";
import { ChevronDown } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function TagInput({ 
  tags, 
  onTagsChange, 
  placeholder = "", 
  suggestions = [],
  className = "" 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1); // 当前选中的下拉菜单选项索引
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const suggestionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]); // 下拉菜单按钮的引用数组
  const wasShowingRef = useRef(false);
  const manuallyOpenedRef = useRef(false); // 跟踪是否是手动展开的
  const prevInputValueRef = useRef<string>(inputValue); // 跟踪上一次的inputValue
  const prevTagsLengthRef = useRef<number>(tags.length); // 跟踪上一次的tags长度
  const isAddingTagRef = useRef(false); // 跟踪是否正在添加tag（用于防止useEffect重新打开menu）
  const inputValueBeforeTagAddRef = useRef<string>(""); // 在tags增加时保存当时的inputValue

  // 同步prevTagsLengthRef（当tags从外部更新时，不通过addTag）
  useEffect(() => {
    prevTagsLengthRef.current = tags.length;
  }, [tags.length]);

  // 监听内容容器高度变化，添加平滑过渡
  useEffect(() => {
    const wrapper = contentWrapperRef.current;
    if (!wrapper) return;

    let rafId: number;
    let timeoutId: NodeJS.Timeout;
    let isUpdating = false;

    // 更新高度的函数
    const updateHeight = () => {
      if (isUpdating) return;
      
      // 获取当前渲染的高度（如果已设置固定值）
      const currentHeight = wrapper.offsetHeight;
      
      // 关键优化：使用临时克隆来测量新高度，避免影响实际布局
      // 创建一个临时的测量容器来获取新高度，而不改变实际容器的高度
      const tempWrapper = wrapper.cloneNode(true) as HTMLElement;
      
      // 复制计算样式，确保测量准确
      const computedStyle = window.getComputedStyle(wrapper);
      tempWrapper.style.cssText = computedStyle.cssText;
      
      // 设置临时容器的样式用于测量
      tempWrapper.style.position = 'absolute';
      tempWrapper.style.visibility = 'hidden';
      tempWrapper.style.height = 'auto';
      tempWrapper.style.width = `${wrapper.offsetWidth}px`;
      tempWrapper.style.top = '-9999px';
      tempWrapper.style.left = '0';
      tempWrapper.style.transition = 'none';
      tempWrapper.style.willChange = 'auto';
      
      // 添加到DOM中进行测量（需要添加到body或父元素）
      const parent = wrapper.parentElement;
      if (parent) {
        parent.appendChild(tempWrapper);
        // 强制重排以获取准确的scrollHeight
        void tempWrapper.offsetHeight;
        const newHeight = tempWrapper.scrollHeight;
        parent.removeChild(tempWrapper);
        
        // 如果高度没有变化，直接返回
        if (Math.abs(currentHeight - newHeight) < 1) {
          return;
        }
        
        isUpdating = true;
        
        // 使用双requestAnimationFrame确保浏览器完成当前渲染周期后再触发过渡
        rafId = requestAnimationFrame(() => {
          rafId = requestAnimationFrame(() => {
            // 现在启用transition并设置新高度
            wrapper.style.transition = 'height 200ms cubic-bezier(0.25, 0.1, 0.25, 1)';
            wrapper.style.height = `${newHeight}px`;
            
            // 过渡完成后重置isUpdating
            const handleTransitionEnd = (e: TransitionEvent) => {
              // 确保是height属性的过渡结束
              if (e.propertyName === 'height' && e.target === wrapper) {
                isUpdating = false;
                wrapper.removeEventListener('transitionend', handleTransitionEnd);
              }
            };
            wrapper.addEventListener('transitionend', handleTransitionEnd);
          });
        });
      }
    };

    // 触发更新（防抖）
    const scheduleUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(updateHeight, 16);
    };

    // 使用ResizeObserver监听wrapper内容区域的大小变化
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(wrapper);

    // 使用MutationObserver监听内部DOM结构变化（tags的添加/删除）
    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    // 初始化：设置初始高度并启用过渡
    const initHeight = wrapper.scrollHeight;
    wrapper.style.height = `${initHeight}px`;
    wrapper.style.transition = 'height 200ms cubic-bezier(0.25, 0.1, 0.25, 1)';

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      isUpdating = false;
    };
  }, []);

  useEffect(() => {
    // 检测是否是添加tag导致的状态变化：
    // 1. tags长度增加了（已经在单独的useEffect中检测到）
    // 2. inputValue从有值变为空
    const inputValueCleared = inputValueBeforeTagAddRef.current.trim() !== "" && inputValue.trim() === "";
    
    if (isAddingTagRef.current && inputValueCleared) {
      // 确认是添加tag导致的状态变化，保持menu关闭
      // 更新filteredSuggestions但不打开menu
      if (suggestions.length > 0) {
        const filtered = suggestions.filter(s => !tags.includes(s));
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
        !tags.includes(s)
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
      const filtered = suggestions.filter(s => !tags.includes(s));
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
  }, [inputValue, suggestions, tags]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    if (trimmedTag && !tags.includes(trimmedTag)) {
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
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
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
          <div 
            ref={contentWrapperRef}
            className="min-h-[3.2rem]" // 移除 flex 样式，只保留 min-h
            style={{
              willChange: 'height', // 提示浏览器优化高度变化
              backfaceVisibility: 'hidden', // 防止重绘问题
              overflow: 'hidden' // 关键：添加 overflow: hidden 来裁切内部内容
            }}
          >
            {/* 创建新的内部 flex 容器 */}
            <div
              className="flex flex-wrap gap-2 items-center px-5 py-3" // 将所有 flex 和 padding 样式移到这里
              style={{ height: 'auto' }} // 确保内部容器高度始终自动
            >
              {tags.map((tag, index) => (
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
                  if (suggestions.length > 0 && inputValue.trim() && !isAddingTagRef.current) {
                    setShowSuggestions(true);
                    manuallyOpenedRef.current = false;
                  }
                }}
                placeholder={tags.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[140px] bg-transparent outline-none"
                style={{ 
                  color: 'var(--c-content)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.9rem',
                  fontWeight: 400,
                  letterSpacing: '0.01em'
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
          </div>
        </div>
      </div>

      {/* Dropdown suggestions */}
      {(showSuggestions || isAnimating) && filteredSuggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className={`absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 transition-all duration-300 ease-out ${
            shouldShowDropdown 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
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
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.9rem',
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
        </div>
      )}
    </div>
  );
}
