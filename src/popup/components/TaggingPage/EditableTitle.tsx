import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { createLogger } from "@/shared/utils/logger";

const logger = createLogger('EditableTitle');

interface EditableTitleProps {
  title: string;
  isUrl: boolean;
  isLoading?: boolean;
  onSave: (newTitle: string) => void;
  className?: string;
  // 受控模式参数（可选，用于草稿状态）
  draftValue?: string;              // 草稿值（优先显示）
  onDraftChange?: (value: string) => void;  // 草稿变化回调
  isRestored?: boolean;             // 是否从草稿恢复
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  isUrl,
  isLoading,
  onSave,
  className = "",
  draftValue,
  onDraftChange,
  isRestored: _isRestored = false, // 保留参数以保持接口一致性，但当前未使用
}) => {
  // 判断是否使用受控模式（草稿模式）
  const isControlled = draftValue !== undefined && onDraftChange !== undefined;
  
  // 显示值：优先使用草稿值，否则使用 title
  const displayValue = isControlled ? (draftValue ?? title) : title;
  
  const [isEditing, setIsEditing] = useState(false);
  // 非受控模式的初始值应该是 title
  const [internalValue, setInternalValue] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevTitleRef = useRef<string>(title);
  const prevDraftValueRef = useRef<string | undefined>(draftValue);

  // 当前使用的值（受控模式用 displayValue，非受控模式用 internalValue）
  const value = isControlled ? displayValue : internalValue;
  
  // 统一的 setValue 函数：优先调用外部回调，否则更新内部状态
  const setValue = (newValue: string) => {
    if (isControlled) {
      onDraftChange!(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  // 同步外部数据（title 或 draftValue）
  useEffect(() => {
    const prevValue = prevTitleRef.current;
    const prevDraft = prevDraftValueRef.current;
    
    // 更新 refs
    prevTitleRef.current = title;
    prevDraftValueRef.current = draftValue;
    
    // 如果使用受控模式，不需要同步（由外部控制）
    if (isControlled) {
      // 如果 draftValue 变化，记录日志
      if (prevDraft !== draftValue) {
        logger.debug('[EditableTitle] draftValue 变化:', {
          prevDraft,
          newDraft: draftValue,
          isEditing,
        });
      }
      return;
    }
    
    // 非受控模式：同步 title prop
    // 如果不在编辑状态，或者 title 变化，更新内部值
    if (!isEditing || prevValue !== title) {
      setInternalValue(title);
      
      // 记录title prop变化
      if (prevValue !== title) {
        logger.debug('[EditableTitle] title prop变化:', {
          prevValue,
          newValue: title,
          isEditing,
          willResetInput: !isEditing,
        });
      }
    }
  }, [title, draftValue, isEditing, isControlled]);

  const handleBlur = () => {
    setIsEditing(false);
    // 使用 value（当前实际使用的值）进行比较
    if (value.trim() !== title) {
      onSave(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      textareaRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Escape 时恢复为 title（丢弃草稿）
      if (isControlled) {
        onDraftChange!(title);
      } else {
        setInternalValue(title);
      }
      setIsEditing(false);
    }
  };

  // [关键] 共享样式：必须确保 Ghost Div 和 Textarea 的 排版属性 完全一致！
  // 提取自你原来的 TaggingPage.tsx 样式
  // 注意：所有影响布局的属性（box-sizing、border、padding、margin）必须完全一致
  const typographyStyle: React.CSSProperties = {
    font: "var(--font-page-title)",
    letterSpacing: "var(--letter-spacing-page-title)",
    lineHeight: 1.35,
    padding: "0.25rem 0", // 保持一致的 vertical padding
    width: "100%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap", // 允许换行
    boxSizing: "border-box", // 确保 box-sizing 一致
    margin: 0, // 确保 margin 一致
    border: "none", // 确保 border 一致（Ghost Div 和 Textarea 都使用）
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "1.985rem",
    borderRadius: "0.5rem",
  };

  // 视觉状态计算
  const showUrlState = isUrl && !isEditing;

  return (
    <div className={`relative group w-full ${className}`} style={containerStyle}>
      {/* =======================
          VIEW MODE (展示模式)
         ======================= */}
      {!isEditing && (
        <div
          onClick={() => {
            if (!isLoading) {
              setIsEditing(true);
              // 确保切换后聚焦
              requestAnimationFrame(() => {
                textareaRef.current?.focus();
                textareaRef.current?.setSelectionRange(value.length, value.length);
              });
            }
          }}
          className="w-full h-full flex items-start transition-colors duration-200 ease-out hover:bg-[var(--bg-surface-glass-hover)] cursor-text rounded-lg"
          style={{ ...typographyStyle, cursor: isLoading ? "default" : "text" }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] opacity-80">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={16} />
              </motion.div>
              <span className="text-sm font-medium">Fetching title...</span>
            </div>
          ) : showUrlState ? (
            // URL 状态美化
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] w-full overflow-hidden">
              <LinkIcon size={16} className="shrink-0 opacity-70" />
              <span className="truncate font-mono text-sm opacity-80">{value}</span>
            </div>
          ) : (
            // 普通标题状态
            <span className="text-[var(--color-text-primary)] w-full">
              {value || (
                <span className="text-[var(--color-text-tertiary)] opacity-50">
                  Untitled Page
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* =======================
          EDIT MODE (编辑模式)
         ======================= */}
      {isEditing && (
        <div 
          className="relative w-full"
          style={{
            // 创建独立的 Compositor Layer，优化渲染性能
            isolation: "isolate",
            transform: "translateZ(0)", // 强制硬件加速
          }}
        >
          {/* 1. Ghost Element (幽灵节点)
              它的唯一作用是撑开父容器高度。
              visibility: hidden 让它不可见但保留占据空间。
          */}
          <div
            aria-hidden="true"
            style={{
              ...typographyStyle,
              visibility: "hidden",
              // 提示浏览器优化高度变化
              willChange: "height",
            }}
          >
            {/* 加上一个零宽空格或普通空格，防止空行塌陷 */}
            {value + (value.endsWith("\n") ? " " : "")}
          </div>

          {/* 2. 真正的 Textarea
              绝对定位覆盖在 Ghost Element 上。
              因为父容器已经被 Ghost Element 撑开了，所以 absolute 的 height: 100% 刚好填满。
              注意：必须确保所有布局属性（box-sizing、border、padding、margin）与 Ghost Div 完全一致。
          */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            className="absolute inset-0 w-full resize-none outline-none bg-transparent p-0 m-0"
            style={{
              ...typographyStyle,
              height: "100%",
              overflow: "hidden", // 隐藏滚动条，因为高度由 ghost 撑开
              color: "var(--color-text-primary)",
              // border 已在 typographyStyle 中设置为 "none"，确保与 Ghost Div 一致
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};
