import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/popup/utils/cn";
import { LAYOUT_TRANSITION } from "../utils/motion";

import { Tag } from "./Tag";
import { ShortcutBadge } from "./ShortcutBadge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "./ui/command";

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
 * TagInput 组件 - 使用 shadcn Command + Popover 重构
 * 大幅简化交互逻辑，保留所有原有功能
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
  dropdownZIndex = "var(--z-dropdown)",
  inputValue: controlledInputValue,
  onInputValueChange,
}: TagInputProps) {
  // 状态管理
  const isControlled = controlledInputValue !== undefined && onInputValueChange !== undefined;
  const [internalInputValue, setInternalInputValue] = useState("");
  const inputValue = isControlled ? controlledInputValue : internalInputValue;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 统一的 setInputValue 函数
  const setInputValue = useCallback((newValue: string) => {
    if (isControlled) {
      onInputValueChange!(newValue);
    } else {
      setInternalInputValue(newValue);
    }
  }, [isControlled, onInputValueChange]);

  // 过滤建议列表：排除已选和排除的标签
  const filteredSuggestions = suggestions.filter(suggestion => {
    const isSelected = tags.includes(suggestion);
    const isExcluded = excludeTags.includes(suggestion);
    return !isSelected && !isExcluded;
  });

  // 根据输入值过滤建议
  const filteredOptions = inputValue.trim()
    ? filteredSuggestions.filter(s => 
        s.toLowerCase().includes(inputValue.toLowerCase())
      )
    : filteredSuggestions;

  // 判断是否可以创建新标签
  const canCreate = allowCreation && 
    inputValue.trim() !== "" && 
    !tags.includes(inputValue.trim()) &&
    !filteredSuggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase());

  // 添加标签
  const addTag = useCallback((tagToAdd: string, source: "input" | "suggestion" = "input") => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    
    const matchesSuggestion = suggestions.some(s => s.toLowerCase() === trimmed.toLowerCase());
    
    if (!allowCreation && source === "input" && !matchesSuggestion) return;
    
    if (mode === "create") {
      if (!matchesSuggestion && onCreateTag) {
        onCreateTag(trimmed);
      }
      setInputValue("");
      setIsOpen(false);
    } else {
      if (!tags.includes(trimmed)) {
        onTagsChange([...tags, trimmed]);
      }
      setInputValue("");
    }
  }, [tags, onTagsChange, allowCreation, mode, onCreateTag, suggestions, setInputValue]);

  // 删除标签
  const removeTag = useCallback((index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  }, [tags, onTagsChange]);

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    // 有输入且有匹配项时自动打开
    if (value.trim() && (filteredOptions.length > 0 || canCreate)) {
      setIsOpen(true);
    }
  }, [setInputValue, filteredOptions.length, canCreate]);

  // 处理选择
  const handleSelect = useCallback((value: string) => {
    addTag(value, "suggestion");
    setIsOpen(false);
  }, [addTag]);

  // 处理创建
  const handleCreate = useCallback(() => {
    if (canCreate) {
      addTag(inputValue.trim(), "input");
      setIsOpen(false);
    }
  }, [canCreate, addTag, inputValue]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    
    if (e.key === 'Backspace' && !inputValue && tags.length > 0 && mode === "list") {
      removeTag(tags.length - 1);
      return;
    }

    // Enter 键处理
    if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      // Command 组件会自动处理高亮项的选择
      // 如果没有高亮项，尝试创建新标签
      if (canCreate) {
        handleCreate();
      }
    }
  }, [inputValue, tags, mode, removeTag, isOpen, canCreate, handleCreate]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div 
      ref={containerRef} 
      className={cn("relative", className)}
      onClick={() => {
        inputRef.current?.focus();
        if (suggestions.length > 0 && !isOpen) {
          setIsOpen(true);
        }
      }}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
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
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    disabled={disabled}
                    className="flex-1 min-w-[60px] bg-transparent outline-none"
                    style={{
                      color: 'var(--color-text-primary)',
                      font: 'var(--font-body)',
                      letterSpacing: 'var(--letter-spacing-body)',
                      opacity: disabled ? 'var(--opacity-disabled)' : 1,
                      cursor: disabled ? 'not-allowed' : 'text',
                      minWidth: 'calc(var(--space-12) * 1.25)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? "tag-input-listbox" : undefined}
                  />
                  
                  {/* 下拉按钮 */}
                  {suggestions.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsOpen(!isOpen);
                      }}
                      className="p-1.5 rounded-full flex-shrink-0 transition-all ml-auto"
                      style={{ 
                        color: isOpen ? 'var(--color-text-action)' : 'var(--color-text-tertiary)',
                        background: isOpen ? 'var(--bg-surface-glass-active)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isOpen) {
                          e.currentTarget.style.color = 'var(--color-text-action)';
                          e.currentTarget.style.background = 'var(--bg-surface-glass-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isOpen) {
                          e.currentTarget.style.color = 'var(--color-text-tertiary)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
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
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-1"
          align="start"
          sideOffset={4}
          style={{ zIndex: dropdownZIndex } as React.CSSProperties}
        >
          <Command shouldFilter={false} className="bg-transparent">
            <CommandList id="tag-input-listbox" role="listbox" className="max-h-[calc(4*2rem)]">
              <CommandEmpty>
                {canCreate ? (
                  <div className="py-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    无匹配项，按 Enter 创建新标签
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    无匹配项
                  </div>
                )}
              </CommandEmpty>
              
              {filteredOptions.length > 0 && (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={handleSelect}
                      className="w-full text-left transition-colors flex items-center justify-between gap-2 py-2 px-3 rounded-md text-sm select-none"
                    >
                      <span className="truncate font-normal">{option}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {canCreate && (
                <CommandGroup>
                  <CommandItem
                    value={inputValue.trim()}
                    onSelect={handleCreate}
                    className="w-full text-left transition-colors flex items-center justify-between gap-2 py-2 px-3 rounded-md text-sm select-none border-t border-[var(--border-glass-subtle)] mt-1 pt-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg-action-subtle)] text-[var(--color-text-action)] flex-shrink-0">
                        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                      <span className="truncate font-medium">
                        Create "{inputValue.trim()}"
                      </span>
                    </div>
                    <ShortcutBadge keys={['Enter']} className="flex-shrink-0 opacity-80" />
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
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
        {filteredOptions.length > 0 && (
          `找到 ${filteredOptions.length} 个标签，按向下键导航`
        )}
        {canCreate && (
          `按 Enter 创建新标签`
        )}
        {filteredOptions.length === 0 && !canCreate && inputValue.trim() && (
          `无匹配项`
        )}
      </div>
    </div>
  );
}
