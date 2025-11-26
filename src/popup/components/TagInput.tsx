import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "./Tag";
import { ChevronDown, Plus } from "lucide-react";
import { StickyDropdown } from "./StickyDropdown";
import { useTagInput } from "../hooks/headless/useTagInput";
import { GlassCard } from "./GlassCard";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void | Promise<void>;
  placeholder?: string;
  suggestions?: string[];
  excludeTags?: string[];
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  mode?: "list" | "create";
  onCreateTag?: (tagName: string) => void;
  allowCreation?: boolean;
  dropdownZIndex?: string;
}

/**
 * TagInput 组件 - 视觉层（Skin）
 * 只负责渲染 Glass 效果、布局、动画
 * 所有逻辑都在 useTagInput hook 中（Brain）
 */
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
  // 1. 引入大脑 - 所有逻辑都在这里
  const { 
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
  } = useTagInput({
    tags,
    suggestions,
    excludeTags,
    onTagsChange,
    allowCreation,
    mode,
    onCreateTag,
    autoFocus,
    disabled,
  });

  // 2. UI 特有的逻辑 (Click Outside) - 这是纯 DOM 行为，属于 View 层
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // 检查是否点击了容器内部
      const isClickInsideContainer = containerRef.current?.contains(target);
      
      // 检查是否点击了下拉菜单（通过查找包含特定类的元素）
      const dropdownElement = (target as Element)?.closest('[data-sticky-dropdown]');
      
      if (!isClickInsideContainer && !dropdownElement) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsMenuOpen, containerRef]);

  // 3. 渲染 - 只负责视觉层
  const inputProps = getInputProps({
    placeholder: tags.length === 0 ? placeholder : "",
  });

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
              className="flex flex-wrap gap-2 items-center cursor-text"
              style={{ 
                height: 'auto',
                padding: 'var(--space-2) var(--space-4)' // 8px 16px
              }}
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
              
              {/* Input - 仅仅是绑定 props */}
              <input
                ref={inputRef}
                type="text"
                {...inputProps}
              />
              
              {/* 下拉按钮 */}
              {suggestions.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 防止触发容器的 focus
                    const newShowState = !isMenuOpen;
                    setIsMenuOpen(newShowState);
                    if (newShowState) inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-full flex-shrink-0 transition-all ml-auto"
                  style={{ 
                    color: isMenuOpen ? 'var(--color-text-action)' : 'var(--color-text-tertiary)',
                    background: isMenuOpen ? 'var(--bg-surface-glass-active)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMenuOpen) {
                      e.currentTarget.style.color = 'var(--color-text-action)';
                      e.currentTarget.style.background = 'var(--bg-surface-glass-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMenuOpen) {
                      e.currentTarget.style.color = 'var(--color-text-tertiary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                  tabIndex={-1}
                >
                  <motion.div
                    animate={{ rotate: isMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="icon-base" strokeWidth={1.5} />
                  </motion.div>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dropdown - 只负责渲染 options */}
      <StickyDropdown 
        isOpen={isMenuOpen && options.length > 0} 
        anchorRef={containerRef}
        zIndex={dropdownZIndex}
      >
        <GlassCard
          depthLevel={1}
          data-sticky-dropdown
          id="tag-input-listbox"
          role="listbox"
          style={{
            overflow: 'hidden',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-elevation-high)',
            // [Refactor] 使用 GlassCard 自动处理 backdrop-filter，移除手动样式
          }}
        >
          <div className="flex flex-col p-1.5">
             <div 
               className="overflow-y-auto overflow-x-hidden"
               style={{ 
                 // [Refactor] 默认只展示 3 个选项的高度
                 // 使用 Design Token：3 个选项高度 + 容器上下 padding
                 maxHeight: 'calc(3 * var(--dropdown-option-height) + 2 * var(--space-1_5))',
                 scrollbarWidth: 'none', 
                 msOverflowStyle: 'none' 
               }}
             >
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>

              {options.map((option, index) => {
                const isCreateOption = allowCreation && 
                                     option === inputValue.trim() && 
                                     !suggestions.some(s => s.toLowerCase() === option.toLowerCase());

                const optionProps = getOptionProps(index);

                return (
                  <div key={`${option}-${index}`} className="scrollbar-hide">
                    <button
                      ref={(el) => { 
                        if (optionButtonsRef.current) {
                          optionButtonsRef.current[index] = el; 
                        }
                      }}
                      {...optionProps}
                      className="w-full text-left transition-colors flex items-center gap-2"
                      style={{ 
                        // [Refactor] 颜色 Token 化
                        padding: 'var(--space-2) var(--space-4)',
                        color: activeIndex === index 
                          ? 'var(--color-text-action)' 
                          : (isCreateOption ? 'var(--color-text-action)' : 'var(--color-text-primary)'),
                        // [Refactor] 使用标准字体 Token
                        font: 'var(--font-body)',
                        fontWeight: isCreateOption ? 500 : 400,
                        letterSpacing: '0.01em',
                        // [Refactor] 背景 Token 化
                        background: activeIndex === index 
                          ? 'var(--bg-surface-glass-hover)' 
                          : 'transparent',
                        borderRadius: 'var(--radius-sm)' // 添加圆角让 hover 更自然
                      }}
                    >
                      {isCreateOption && (
                        <div 
                          className="flex items-center justify-center icon-base rounded-full"
                          style={{ background: 'var(--bg-action-subtle)' }}
                        >
                          <Plus className="icon-xs" strokeWidth={2.5} />
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
        </GlassCard>
      </StickyDropdown>
    </div>
  );
}
