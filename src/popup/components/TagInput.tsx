import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus } from "lucide-react";

import { useTagInput } from "../hooks/headless/useTagInput";
import { LAYOUT_TRANSITION } from "../utils/motion";

import { GlassCard } from "./GlassCard";
import { StickyDropdown } from "./StickyDropdown";
import { Tag } from "./Tag";

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

  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const isButtonClickingRef = useRef(false);
  const menuOpenRef = useRef(isMenuOpen);

  useEffect(() => {
    menuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isButtonClickingRef.current) {
        return;
      }

      const target = event.target as Node;
      const isClickOnDropdownButton = dropdownButtonRef.current && (
        dropdownButtonRef.current === target || 
        dropdownButtonRef.current.contains(target)
      );
      
      if (isClickOnDropdownButton) {
        return;
      }

      const isClickInsideContainer = containerRef.current?.contains(target);
      const dropdownElement = (target as Element)?.closest('[data-sticky-dropdown]');
      
      if (!isClickInsideContainer && !dropdownElement) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [setIsMenuOpen, containerRef]);

  const inputProps = getInputProps({
    placeholder: tags.length === 0 ? placeholder : "",
  });

  return (
    <div 
      ref={containerRef} 
      className={`relative ${className}`}
      onClick={() => {
        inputRef.current?.focus();
        if (suggestions.length > 0 && !isMenuOpen) {
           setIsMenuOpen(true);
        }
      }}
    >
      <div className="liquidGlass-wrapper relative cursor-text">
        <div className="liquidGlass-content">
          <motion.div 
            className="min-h-[2.6rem]"
            style={{ backfaceVisibility: 'hidden', overflow: 'hidden' }}
            layout
          >
            <div
              className="flex flex-wrap gap-2 items-center"
              style={{ 
                height: 'auto',
                padding: 'var(--space-2) var(--space-4)' 
              }}
            >
              <AnimatePresence mode="popLayout">
                {mode === "list" && tags.map((tag, index) => (
                  <Tag 
                    key={tag}
                    label={tag} 
                    onRemove={() => removeTag(index)}
                  />
                ))}
              </AnimatePresence>
              
              <motion.input
                ref={inputRef}
                layout
                transition={{
                   layout: LAYOUT_TRANSITION
                }}
                type="text"
                {...inputProps}
                onClick={(e) => e.stopPropagation()} 
                style={{
                    minWidth: 'calc(var(--space-12) * 1.25)' 
                }}
              />
              
              {/* 下拉按钮 */}
              {suggestions.length > 0 && (
                <button
                  ref={dropdownButtonRef}
                  onMouseDown={(e) => {
                    isButtonClickingRef.current = true;
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const newShowState = !isMenuOpen;
                    setIsMenuOpen(newShowState);
                    setTimeout(() => {
                      isButtonClickingRef.current = false;
                    }, 0);
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
          }}
        >
          <div className="flex flex-col p-1.5">
             <div 
               className="overflow-y-auto overflow-x-hidden"
               style={{ 
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
                        padding: 'var(--space-2) var(--space-4)',
                        color: activeIndex === index 
                          ? 'var(--color-text-action)' 
                          : (isCreateOption ? 'var(--color-text-action)' : 'var(--color-text-primary)'),
                        font: 'var(--font-body)',
                        fontWeight: isCreateOption ? 500 : 400,
                        letterSpacing: 'var(--letter-spacing-body)',
                        background: activeIndex === index 
                          ? 'var(--bg-surface-glass-hover)' 
                          : 'transparent',
                        borderRadius: 'var(--radius-sm)'
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
