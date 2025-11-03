import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface GlassInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  autoFocus?: boolean;
}

export function GlassInput({ 
  value, 
  onChange, 
  onSelect,
  onKeyDown,
  placeholder = "", 
  suggestions = [],
  className = "",
  autoFocus = false
}: GlassInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1); // 当前选中的下拉菜单选项索引
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]); // 下拉菜单按钮的引用数组
  const wasShowingRef = useRef(false);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase()) && s !== value
      );
      setFilteredSuggestions(filtered);
      // 重置选中索引，因为列表变化了
      setSelectedIndex(-1);
      if (filtered.length > 0) {
        // 使用 setTimeout 确保 DOM 更新后再触发动画
        setTimeout(() => setShowSuggestions(true), 10);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setFilteredSuggestions(suggestions);
      setSelectedIndex(-1);
      setShowSuggestions(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto focus on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Use setTimeout to ensure the component is fully mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // 处理显示和关闭动画
  useEffect(() => {
    const element = dropdownRef.current;
    
    if (showSuggestions) {
      // 显示时：确保 isAnimating 为 true 以渲染元素并触发显示动画
      setIsAnimating(true);
      wasShowingRef.current = true;
    } else if (wasShowingRef.current) {
      // 从显示状态变为隐藏：保持 isAnimating 为 true 以播放退出动画
      wasShowingRef.current = false;
      // 确保 isAnimating 为 true 以渲染元素并播放退出动画
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
      }
    }
  }, [showSuggestions]);

  const handleSelect = (suggestion: string) => {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      onChange(suggestion);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        // 如果下拉菜单没有显示，先显示它
        if (!showSuggestions) {
          setTimeout(() => setShowSuggestions(true), 10);
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
          setTimeout(() => setShowSuggestions(true), 10);
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
      }
    } else if (e.key === 'Tab' && filteredSuggestions.length > 0 && showSuggestions) {
      // Handle Tab key to autocomplete first suggestion
      e.preventDefault();
      onChange(filteredSuggestions[0]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else {
      // 其他按键输入时，重置选中索引
      setSelectedIndex(-1);
    }
    
    // Call parent's onKeyDown handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input container with glass effect */}
      <div className="liquidGlass-wrapper relative">
        {/* Content layer */}
        <div className="liquidGlass-content flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // 只有当输入框有内容时才自动显示下拉菜单
              if (value.trim() && suggestions.length > 0 && filteredSuggestions.length > 0) {
                setTimeout(() => setShowSuggestions(true), 10);
              }
            }}
            placeholder={placeholder}
            className="flex-1 min-w-0 px-6 py-3 bg-transparent outline-none relative z-10"
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
                setShowSuggestions(!showSuggestions);
              }}
              className="flex-shrink-0 mr-4 p-1.5 rounded-full transition-all z-10"
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

      {/* Dropdown suggestions */}
      {(showSuggestions || isAnimating) && filteredSuggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className={`absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 transition-all duration-300 ease-out ${
            showSuggestions 
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
