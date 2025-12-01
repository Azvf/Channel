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
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  isUrl,
  isLoading,
  onSave,
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevTitleRef = useRef<string>(title);

  // 同步外部数据
  useEffect(() => {
    const prevValue = prevTitleRef.current;
    prevTitleRef.current = title;
    setValue(title);
    
    // 记录title prop变化
    if (prevValue !== title) {
      logger.debug('[EditableTitle] title prop变化:', {
        prevValue,
        newValue: title,
        isEditing,
        willResetInput: !isEditing, // 如果不在编辑状态，会重置输入框
      });
    }
  }, [title, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
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
      setValue(title);
      setIsEditing(false);
    }
  };

  // [关键] 共享样式：必须确保 Ghost Div 和 Textarea 的 排版属性 完全一致！
  // 提取自你原来的 TaggingPage.tsx 样式
  const typographyStyle: React.CSSProperties = {
    font: "var(--font-page-title)",
    letterSpacing: "var(--letter-spacing-page-title)",
    lineHeight: 1.35,
    padding: "0.25rem 0", // 保持一致的 vertical padding
    width: "100%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap", // 允许换行
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
        <div className="relative w-full">
          {/* 1. Ghost Element (幽灵节点)
              它的唯一作用是撑开父容器高度。
              visibility: hidden 让它不可见但保留占据空间。
          */}
          <div
            aria-hidden="true"
            style={{
              ...typographyStyle,
              visibility: "hidden",
              border: "none",
            }}
          >
            {/* 加上一个零宽空格或普通空格，防止空行塌陷 */}
            {value + (value.endsWith("\n") ? " " : "")}
          </div>

          {/* 2. 真正的 Textarea
              绝对定位覆盖在 Ghost Element 上。
              因为父容器已经被 Ghost Element 撑开了，所以 absolute 的 height: 100% 刚好填满。
          */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            className="absolute inset-0 w-full resize-none outline-none bg-transparent border-none p-0 m-0"
            style={{
              ...typographyStyle,
              height: "100%",
              overflow: "hidden", // 隐藏滚动条，因为高度由 ghost 撑开
              color: "var(--color-text-primary)",
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};
