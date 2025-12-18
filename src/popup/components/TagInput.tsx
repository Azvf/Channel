import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/popup/utils/cn";
import { Input } from "./ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";
import { Command, CommandList, CommandItem } from "./ui/command";

import { useSmartCombobox } from "../hooks/headless/useSmartCombobox";
import { InputIntentResolver } from "../hooks/headless/inputIntentMap";
import { createStringMatchStrategy } from "../hooks/headless/searchStrategy";

import { Tag } from "./Tag";
import { ShortcutBadge } from "./ShortcutBadge";

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
 * TagInput 组件 - 直接使用 useSmartCombobox 的简化架构
 * 逻辑与视图分离：useSmartCombobox 处理状态机，组件只负责渲染
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
  // 1. 状态管理
  const isControlled = controlledInputValue !== undefined && onInputValueChange !== undefined;
  const [internalInputValue, setInternalInputValue] = useState("");
  const inputValue = isControlled ? controlledInputValue : internalInputValue;
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const intentResolverRef = useRef(new InputIntentResolver());
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const setInputValue = useCallback((newValue: string) => {
    if (isControlled) {
      onInputValueChange!(newValue);
    } else {
      setInternalInputValue(newValue);
    }
  }, [isControlled, onInputValueChange]);

  // 2. 核心：使用 Hook 接管逻辑
  const searchStrategy = useMemo(() => createStringMatchStrategy<string>(), []);
  const {
    renderedItems,
    highlightedIndex,
    setHighlightedIndex,
    navigateNext,
    navigatePrev,
    handleIntent,
    secondaryAction,
  } = useSmartCombobox({
    inputValue,
    source: suggestions,
    searchStrategy,
    selectedItems: tags,
    excludedItems: excludeTags,
    allowCreation,
  });

  // 3. 事件处理：只负责副作用 (Side Effects)
  const handleSelect = useCallback((item: string, isCreate: boolean) => {
    if (mode === "create" && isCreate && onCreateTag) {
      onCreateTag(item);
    } else if (!tags.includes(item)) {
      onTagsChange([...tags, item]);
    }
    setInputValue("");
    setIsOpen(false);
    // 保持焦点
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [tags, onTagsChange, setInputValue, mode, onCreateTag]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 允许 Tab 键切出
    if (e.key === 'Tab') return;

    // 只有在 Open 状态或特定键才拦截
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    const intent = intentResolverRef.current.resolve(e);
    if (intent) {
      if (isOpen || intent === 'CONFIRM_PRIMARY') {
        e.preventDefault();
      }
      
      // 处理导航意图（滚动由 useEffect 监听 highlightedIndex 变化自动处理）
      if (intent === 'NAVIGATE_NEXT') {
        navigateNext();
        return;
      } else if (intent === 'NAVIGATE_PREV') {
        navigatePrev();
        return;
      }
      
      // 处理其他意图
      const result = handleIntent(intent);
      
      if (result.action === 'select' || result.action === 'create') {
        if (result.item) handleSelect(result.item as string, result.action === 'create');
      } else if (result.action === 'cancel') {
        setIsOpen(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  // 自动打开/聚焦逻辑
  useEffect(() => {
    if (inputValue.trim() && !isOpen && renderedItems.length > 0) {
      setIsOpen(true);
    }
  }, [inputValue, renderedItems.length]); // 移除 isOpen 依赖，防止死循环

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 键盘导航后滚动到高亮项
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      const el = document.getElementById(`combobox-option-${highlightedIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // 移除标签
  const removeTag = useCallback((index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  }, [tags, onTagsChange]);

  return (
    <Popover open={isOpen && renderedItems.length > 0} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div 
          ref={containerRef}
          className={cn("relative", className)}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="liquidGlass-wrapper relative cursor-text">
            <div className="liquidGlass-content">
              <motion.div 
                style={{ 
                  minHeight: 'var(--row-min-height)',
                  backfaceVisibility: 'hidden', 
                  overflow: 'hidden' 
                }}
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
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { 
                      if (inputValue || suggestions.length > 0) setIsOpen(true);
                    }}
                    onClick={(e) => e.stopPropagation()} 
                    placeholder={tags.length === 0 ? placeholder : ""}
                    disabled={disabled}
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-auto p-0"
                    style={{ minWidth: 'calc(var(--space-12) + var(--space-3))' }}
                  />
                  
                  {/* 下拉按钮 */}
                  {suggestions.length > 0 && (
                    <button
                      ref={dropdownButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsOpen(!isOpen);
                      }}
                      className={cn(
                        "p-1.5 rounded-full flex-shrink-0 transition-all ml-auto",
                        isOpen 
                          ? "text-[var(--color-text-action)] bg-[var(--bg-surface-glass-active)]" 
                          : "text-[var(--color-text-tertiary)] bg-transparent hover:text-[var(--color-text-action)] hover:bg-[var(--bg-surface-glass-hover)]"
                      )}
                      tabIndex={-1}
                    >
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
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
        </div>
      </PopoverAnchor>

      <PopoverContent 
        align="start" 
        side="bottom" 
        sideOffset={4} // 使用 var(--space-1) 的值 (4px)，Radix UI 的 sideOffset 只接受数字
        className="p-0 w-[var(--radix-popover-anchor-width)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} style={{ maxHeight: 'var(--dropdown-max-height)' }}>
          <CommandList style={{ maxHeight: 'var(--dropdown-max-height)' }}>
            {renderedItems.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">无匹配项</div>
            )}
            {renderedItems.map((item, index) => {
              if (item.type === 'separator') return null;
              const content = item.data as string;
              const isSelected = index === highlightedIndex;
              
              return (
                <CommandItem
                  key={item.id}
                  value={content}
                  onSelect={() => handleSelect(content, item.type === 'create')}
                  data-selected={isSelected}
                  className={cn(
                    "w-full text-left transition-colors flex items-center justify-between gap-2 py-2 px-3 rounded-md text-sm",
                    isSelected 
                      ? "bg-[var(--bg-surface-glass-hover)] text-[var(--color-text-action)]" 
                      : "bg-transparent text-[var(--color-text-primary)]"
                  )}
                  id={`combobox-option-${index}`}
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onMouseEnter={() => {
                    // 鼠标悬停时更新高亮索引
                    setHighlightedIndex(index);
                  }}
                >
                  {item.type === 'create' ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="flex items-center justify-center rounded-full bg-[var(--bg-action-subtle)] text-[var(--color-text-action)] flex-shrink-0 icon-md"
                      >
                        <Plus 
                          className="icon-sm" 
                          strokeWidth={3} 
                        />
                      </div>
                      <span className="truncate font-medium">
                        创建 "{content}"
                      </span>
                      {secondaryAction === 'CREATE' && (
                        <ShortcutBadge keys={['Shift', 'Enter']} className="flex-shrink-0 opacity-80 ml-auto" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate font-normal">
                        {content}
                      </span>
                    </div>
                  )}
                </CommandItem>
              );
            })}
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
        {renderedItems.length > 0 && (
          <>
            {renderedItems.filter(item => item.type === 'match').length > 0 && (
              `找到 ${renderedItems.filter(item => item.type === 'match').length} 个标签，按向下键导航`
            )}
            {renderedItems.filter(item => item.type === 'create').length > 0 && (
              `按 Enter 创建新标签`
            )}
          </>
        )}
        {renderedItems.length === 0 && inputValue.trim() && (
          `无匹配项，按 Enter 创建新标签`
        )}
      </div>
    </Popover>
  );
}
