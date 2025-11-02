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
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasShowingRef = useRef(false);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase()) && s !== value
      );
      setFilteredSuggestions(filtered);
      if (filtered.length > 0) {
        // 使用 setTimeout 确保 DOM 更新后再触发动画
        setTimeout(() => setShowSuggestions(true), 10);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setFilteredSuggestions(suggestions);
      setShowSuggestions(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Tab key to autocomplete first suggestion
    if (e.key === 'Tab' && filteredSuggestions.length > 0 && showSuggestions) {
      e.preventDefault();
      onChange(filteredSuggestions[0]);
      setShowSuggestions(false);
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
                    onClick={() => handleSelect(suggestion)}
                    className="w-full px-5 py-2.5 text-left transition-all rounded-lg mx-2"
                    style={{ 
                      color: 'var(--c-content)',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.9rem',
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                      width: 'calc(100% - 1rem)',
                      background: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 20%, transparent)';
                      e.currentTarget.style.color = 'var(--c-action)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--c-content)';
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
