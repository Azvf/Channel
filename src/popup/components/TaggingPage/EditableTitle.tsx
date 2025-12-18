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
  
  // 显示值：优先使用草稿值，但如果草稿值为空且 title 存在，则使用 title
  // 修复：空字符串不会触发 ?? 运算符，需要显式检查
  const displayValue = isControlled 
    ? (draftValue || title)  // 使用 || 而不是 ??，这样空字符串会回退到 title
    : title;
  
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
  // 使用 Tailwind 原子类替换 CSS 变量，确保物理像素级一致性
  // 原设计 Token 映射到 Tailwind:
  // --font-page-title-size: 1.1rem       → text-lg (1.125rem, 接近 1.1rem)
  // --font-page-title-weight: 600        → font-semibold
  // --font-page-title-line-height: 1.35  → leading-snug (1.375, 接近 1.35)
  // --letter-spacing-page-title: -0.015em → tracking-tight
  const typographyClass = "text-lg font-semibold leading-snug tracking-tight text-foreground";
  const typographyClassName = "w-full break-words whitespace-pre-wrap box-border m-0 border-none py-1";
  const sharedStyle: React.CSSProperties = {
    width: "100%",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxSizing: "border-box",
  };

  const containerStyle: React.CSSProperties = {
    minHeight: 'var(--row-min-height)',
    borderRadius: 'var(--radius-md)',
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
          className={`${typographyClass} ${typographyClassName} w-full h-full flex items-start transition-colors duration-200 ease-out hover:bg-accent/50 cursor-text rounded-lg`}
          style={{ 
            ...sharedStyle,
            cursor: isLoading ? "default" : "text" 
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground opacity-80">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="icon-base" />
              </motion.div>
              <span className="text-sm font-medium">Fetching title...</span>
            </div>
          ) : showUrlState ? (
            // URL 状态美化
            <div className="flex items-center gap-2 text-muted-foreground w-full overflow-hidden">
              <LinkIcon className="icon-base shrink-0 opacity-70" />
              <span className="truncate font-mono text-sm opacity-80">{value}</span>
            </div>
          ) : (
            // 普通标题状态
            <span className="text-foreground w-full">
              {value || (
                <span className="text-muted-foreground opacity-50">
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
            className={`${typographyClass} ${typographyClassName}`}
            style={{
              ...sharedStyle,
              visibility: "hidden",
              // 提示浏览器优化高度变化
              willChange: "height",
            }}
          >
            {/* 零宽空格保护：防止空值或换行时高度塌陷 */}
            {value || '\u200b'}
            {value.endsWith("\n") ? "\u200b" : ""}
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
            className={`${typographyClass} ${typographyClassName} absolute inset-0 w-full resize-none outline-none bg-transparent p-0 m-0`}
            style={{
              ...sharedStyle,
              height: "100%",
              overflow: "hidden", // 隐藏滚动条，因为高度由 ghost 撑开
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};
