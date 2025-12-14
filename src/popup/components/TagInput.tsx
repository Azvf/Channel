import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/popup/utils/cn";

import { useTagInput } from "../hooks/headless/useTagInput";
import { LAYOUT_TRANSITION } from "../utils/motion";

import { StickyDropdown } from "./StickyDropdown";
import { Tag } from "./Tag";
import { ShortcutBadge } from "./ShortcutBadge";
import { useDropdownSections } from "../hooks/headless/useDropdownSections";
import { DropdownLayout, DropdownBody, DropdownFooter } from "./ui/DropdownLayout";

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
    renderedItems,
    secondaryAction,
  } = useTagInput({
    // #region agent log
    // Log hook initialization
    // #endregion
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

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:69',message:'TagInput render - state values',data:{isMenuOpen:isMenuOpen,renderedItemsLength:renderedItems?.length,optionsLength:options.length,suggestionsLength:suggestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  }, [isMenuOpen, renderedItems, options.length, suggestions.length]);
  // #endregion

  // 使用 useDropdownSections 处理数据切片
  const itemsToProcess = (renderedItems && renderedItems.length > 0) 
    ? renderedItems 
    : options.map((opt, idx) => ({
        type: (allowCreation && opt === inputValue.trim() && !suggestions.some(s => s.toLowerCase() === opt.toLowerCase())) 
          ? 'create' as const 
          : 'match' as const,
        data: opt,
        index: idx,
        isHighlighted: idx === activeIndex,
        id: `tag-input-option-${idx}`,
      }));

  const { scrollableItems, fixedFooterItem, getOriginalIndex } = 
    useDropdownSections(itemsToProcess);

  const hasFooter = !!fixedFooterItem;
  
  // 修正：无论是否有 footer，滚动区域都展示最多 4 行。
  // 因为我们将 Footer 移出了滚动计算区域，所以这里只需要定义 Body 的高度。
  const visibleRows = 4;

  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const isButtonClickingRef = useRef(false);
  const menuOpenRef = useRef(isMenuOpen);

  useEffect(() => {
    menuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isButtonClickingRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:79',message:'Click outside handler - button clicking, ignoring',data:{isButtonClicking:isButtonClickingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return;
      }

      const target = event.target as Node;
      const isClickOnDropdownButton = dropdownButtonRef.current && (
        dropdownButtonRef.current === target || 
        dropdownButtonRef.current.contains(target)
      );
      
      if (isClickOnDropdownButton) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:90',message:'Click outside handler - click on dropdown button, ignoring',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return;
      }

      const isClickInsideContainer = containerRef.current?.contains(target);
      const dropdownElement = (target as Element)?.closest('[data-sticky-dropdown]');
      
      if (!isClickInsideContainer && !dropdownElement) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:98',message:'Click outside handler - closing menu',data:{currentIsMenuOpen:isMenuOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [setIsMenuOpen, containerRef, isMenuOpen]);

  const inputProps = getInputProps({
    placeholder: tags.length === 0 ? placeholder : "",
  });

  // 提取公共样式函数：保证 Create 和 List Item 视觉完全一致
  const getItemClassName = (isHighlighted: boolean) => cn(
    "w-full text-left transition-colors flex items-center justify-between gap-2 tag-input-option relative select-none",
    "py-2 px-3 rounded-md text-sm", // 标准化 padding 和 圆角
    isHighlighted 
      ? "bg-[var(--bg-surface-glass-hover)] text-[var(--color-text-action)]" 
      : "bg-transparent text-[var(--color-text-primary)]"
  );

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
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:173',message:'Dropdown button clicked',data:{currentIsMenuOpen:isMenuOpen,renderedItemsLength:renderedItems?.length,optionsLength:options.length,suggestionsLength:suggestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    e.stopPropagation();
                    e.preventDefault();
                    const newShowState = !isMenuOpen;
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:177',message:'Calling setIsMenuOpen',data:{newShowState:newShowState,currentIsMenuOpen:isMenuOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
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
        isOpen={(() => {
          // #region agent log
          const shouldOpen = isMenuOpen && (renderedItems?.length ?? options.length) > 0;
          fetch('http://127.0.0.1:7242/ingest/d2e1e5c0-f79e-4559-a3a1-792f3b455e30',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TagInput.tsx:215',message:'StickyDropdown isOpen calculation',data:{isMenuOpen:isMenuOpen,renderedItemsLength:renderedItems?.length,optionsLength:options.length,shouldOpen:shouldOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          return shouldOpen;
        })()} 
        anchorRef={containerRef}
        zIndex={dropdownZIndex}
      >
        <DropdownLayout
          maxRows={visibleRows}
          id="tag-input-listbox"
          role="listbox"
          data-sticky-dropdown
        >
          {/* 滚动区域 */}
          <DropdownBody>
            {scrollableItems.map((item, localIndex) => {
              const originalIndex = getOriginalIndex(localIndex, 'scrollable');
              const optionProps = getOptionProps(originalIndex);
              
              return (
                <div key={item.id} className="scrollbar-hide">
                  <button
                    ref={(el) => { if (optionButtonsRef.current) optionButtonsRef.current[originalIndex] = el; }}
                    {...optionProps}
                    className={getItemClassName(item.isHighlighted)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate font-normal">
                        {item.data}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </DropdownBody>

          {/* 固定底部：样式完全复用，仅图标不同 */}
          {hasFooter && fixedFooterItem && (
            <DropdownFooter showSeparator>
              {(() => {
                const originalIndex = getOriginalIndex(0, 'footer');
                const optionProps = getOptionProps(originalIndex);
                // 显示逻辑：如果只是单纯的 Create 提示，可以加引号
                const displayText = `Create "${fixedFooterItem.data}"`;

                return (
                  <div key={fixedFooterItem.id} className="scrollbar-hide">
                    <button
                      ref={(el) => { if (optionButtonsRef.current) optionButtonsRef.current[originalIndex] = el; }}
                      {...optionProps}
                      className={getItemClassName(fixedFooterItem.isHighlighted)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* 保持图标容器大小与普通 Item 的对齐方式一致 */}
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg-action-subtle)] text-[var(--color-text-action)] flex-shrink-0">
                          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <span className="truncate font-medium">
                          {displayText}
                        </span>
                      </div>
                      
                      {secondaryAction === 'CREATE' && (
                         <ShortcutBadge keys={['Shift', 'Enter']} className="flex-shrink-0 opacity-80" />
                      )}
                    </button>
                  </div>
                );
              })()}
            </DropdownFooter>
          )}
        </DropdownLayout>
      </StickyDropdown>
      
      {/* Live Region for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {renderedItems && renderedItems.length > 0 && (
          <>
            {renderedItems.filter(item => item.type === 'match').length > 0 && (
              `找到 ${renderedItems.filter(item => item.type === 'match').length} 个标签，按向下键导航`
            )}
            {renderedItems.filter(item => item.type === 'create').length > 0 && (
              `按 Enter 创建新标签`
            )}
          </>
        )}
        {(!renderedItems || renderedItems.length === 0) && inputValue.trim() && (
          `无匹配项，按 Enter 创建新标签`
        )}
      </div>
    </div>
  );
}
