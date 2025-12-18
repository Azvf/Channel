import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/popup/utils/cn";
import { Input } from "./ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";
import { Command, CommandList, CommandItem } from "./ui/command";

import { useTagInput } from "../hooks/headless/useTagInput";

import { Tag } from "./Tag";
import { ShortcutBadge } from "./ShortcutBadge";
import { useDropdownSections } from "../hooks/headless/useDropdownSections";

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
  // 受控模式参数（可选）
  inputValue?: string;              // 外部控制的输入值
  onInputValueChange?: (value: string) => void;  // 输入值变化回调
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
  dropdownZIndex: _dropdownZIndex = "var(--z-dropdown)",
  inputValue: controlledInputValue,
  onInputValueChange,
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
    optionButtonsRef: _optionButtonsRef,
    renderedItems,
    secondaryAction,
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
    inputValue: controlledInputValue,
    onInputValueChange,
  });

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

  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const inputProps = getInputProps({
    placeholder: tags.length === 0 ? placeholder : "",
  });

  return (
    <Popover open={isMenuOpen && (renderedItems?.length ?? options.length) > 0} onOpenChange={setIsMenuOpen}>
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
        <PopoverAnchor asChild>
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
                  
                  <Input
                    ref={inputRef}
                    {...inputProps}
                    onClick={(e) => e.stopPropagation()} 
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-auto p-0 min-w-[calc(var(--space-12)*1.25)]"
                  />
                  
                  {/* 下拉按钮 */}
                  {suggestions.length > 0 && (
                    <button
                      ref={dropdownButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsMenuOpen(!isMenuOpen);
                      }}
                      className={cn(
                        "p-1.5 rounded-full flex-shrink-0 transition-all ml-auto",
                        isMenuOpen 
                          ? "text-[var(--color-text-action)] bg-[var(--bg-surface-glass-active)]" 
                          : "text-[var(--color-text-tertiary)] bg-transparent hover:text-[var(--color-text-action)] hover:bg-[var(--bg-surface-glass-hover)]"
                      )}
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
        </PopoverAnchor>
      </div>

      <PopoverContent 
        align="start" 
        side="bottom" 
        sideOffset={4}
        className="p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="max-h-[calc(4*2.5rem)]">
          <CommandList className="max-h-[calc(4*2.5rem)]">
            {/* 滚动区域 */}
            {scrollableItems.map((item, localIndex) => {
              const originalIndex = getOriginalIndex(localIndex, 'scrollable');
              const optionProps = getOptionProps(originalIndex);
              
              return (
                <CommandItem
                  key={item.id}
                  value={item.data ?? undefined}
                  onSelect={() => {
                    // cmdk 的 onSelect 接收 value，我们需要手动触发 onClick
                    // 创建一个合成事件来调用原始的 onClick
                    const syntheticEvent = {
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      currentTarget: document.createElement('button'),
                      target: document.createElement('button'),
                    } as unknown as React.MouseEvent<HTMLButtonElement>;
                    optionProps.onClick?.(syntheticEvent);
                  }}
                  onMouseEnter={() => optionProps.onMouseEnter()}
                  data-active={optionProps['data-active']}
                  id={optionProps.id}
                  role={optionProps.role}
                  aria-selected={optionProps['aria-selected']}
                  className={cn(
                    "w-full text-left transition-colors flex items-center justify-between gap-2 py-2 px-3 rounded-md text-sm",
                    item.isHighlighted 
                      ? "bg-[var(--bg-surface-glass-hover)] text-[var(--color-text-action)]" 
                      : "bg-transparent text-[var(--color-text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate font-normal">
                      {item.data}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
            
            {/* 固定底部：Create 选项 */}
            {hasFooter && fixedFooterItem && (
              <>
                <div className="h-px bg-border my-1" />
                {(() => {
                  const originalIndex = getOriginalIndex(0, 'footer');
                  const optionProps = getOptionProps(originalIndex);
                  const displayText = `Create "${fixedFooterItem.data}"`;

                  return (
                    <CommandItem
                      key={fixedFooterItem.id}
                      value={fixedFooterItem.data ?? undefined}
                      onSelect={() => {
                        // cmdk 的 onSelect 接收 value，我们需要手动触发 onClick
                        const syntheticEvent = {
                          preventDefault: () => {},
                          stopPropagation: () => {},
                          currentTarget: document.createElement('button'),
                          target: document.createElement('button'),
                        } as unknown as React.MouseEvent<HTMLButtonElement>;
                        optionProps.onClick?.(syntheticEvent);
                      }}
                      onMouseEnter={() => optionProps.onMouseEnter()}
                      data-active={optionProps['data-active']}
                      id={optionProps.id}
                      role={optionProps.role}
                      aria-selected={optionProps['aria-selected']}
                      className={cn(
                        "w-full text-left transition-colors flex items-center justify-between gap-2 py-2 px-3 rounded-md text-sm",
                        fixedFooterItem.isHighlighted 
                          ? "bg-[var(--bg-surface-glass-hover)] text-[var(--color-text-action)]" 
                          : "bg-transparent text-[var(--color-text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
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
                    </CommandItem>
                  );
                })()}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
      
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
    </Popover>
  );
}
