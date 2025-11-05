import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, dialogSlideIn } from '../utils/motion';
import { GlassInput } from "./GlassInput";
import { TagInput } from "./TagInput";
import { X, Save } from "lucide-react";

interface EditPageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  page: {
    id: number;
    title: string;
    url: string;
    tags: string[];
    screenshot: string;
  };
  onSave: (updatedPage: {
    id: number;
    title: string;
    url: string;
    tags: string[];
    screenshot: string;
  }) => void;
}

export function EditPageDialog({ isOpen, onClose, page, onSave }: EditPageDialogProps) {
  const [editedTitle, setEditedTitle] = useState(page.title);
  const [editedTags, setEditedTags] = useState<string[]>(page.tags);
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset form when page changes or dialog opens
  useEffect(() => {
    setEditedTitle(page.title);
    setEditedTags(page.tags);
  }, [page, isOpen]);

  // 彻底防止底层页面滚动：在document级别拦截所有滚动事件
  useEffect(() => {
    if (isOpen) {
      // 添加属性标记对话框打开状态
      document.body.setAttribute('data-edit-dialog-open', 'true');
      
      // 保存原始状态
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      // 禁用body和html的滚动
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // 检查元素是否在对话框的可滚动内容区域内
      const isInScrollableArea = (target: EventTarget | null): boolean => {
        if (!target || !scrollableContentRef.current) return false;
        const element = target as HTMLElement;
        return scrollableContentRef.current.contains(element) || scrollableContentRef.current === element;
      };

      // 检查元素是否在对话框内（包括header和footer）
      const isInDialog = (target: EventTarget | null): boolean => {
        if (!target || !dialogRef.current) return false;
        const element = target as HTMLElement;
        return dialogRef.current.contains(element) || dialogRef.current === element;
      };

      // 检查可滚动内容区域是否可以继续滚动
      const canScroll = (deltaY: number): boolean => {
        if (!scrollableContentRef.current) return false;
        const { scrollTop, scrollHeight, clientHeight } = scrollableContentRef.current;
        const isAtTop = scrollTop <= 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        // 如果已经在顶部/底部且还要继续滚动，不允许
        if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) {
          return false;
        }
        return true;
      };

      // 在捕获阶段拦截滚轮事件
      const handleWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        
        // 如果在对话框的可滚动内容区域内，且可以滚动，则允许
        if (isInScrollableArea(target)) {
          if (canScroll(e.deltaY)) {
            // 允许滚动，但阻止事件继续冒泡到底层
            e.stopPropagation();
          } else {
            // 不能继续滚动，阻止默认行为和冒泡
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        } else {
          // 不在可滚动区域内，完全阻止
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      };

      // 拦截触摸滚动事件
      const handleTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        
        // 只有在可滚动内容区域内才允许触摸滚动
        if (!isInScrollableArea(target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } else {
          e.stopPropagation();
        }
      };

      // 拦截滚动事件（防止通过其他方式滚动）
      const handleScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        
        // 如果滚动发生在对话框外，阻止
        if (!isInDialog(target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } else {
          e.stopPropagation();
        }
      };

      // 使用捕获阶段，确保在事件到达目标之前拦截
      const options = { passive: false, capture: true };
      document.addEventListener('wheel', handleWheel, options);
      document.addEventListener('touchmove', handleTouchMove, options);
      document.addEventListener('scroll', handleScroll, options);
      
      // 也阻止键盘滚动（空格、方向键等）
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const scrollKeys = [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
        
        if (scrollKeys.includes(e.key)) {
          // 如果不在对话框内，阻止键盘滚动
          if (!isInDialog(target)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          } else if (!isInScrollableArea(target)) {
            // 在对话框内但不在可滚动区域，也阻止
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown, options);
      
      return () => {
        // 移除属性标记
        document.body.removeAttribute('data-edit-dialog-open');
        
        // 恢复原始状态
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        
        // 移除所有事件监听器
        document.removeEventListener('wheel', handleWheel, options as any);
        document.removeEventListener('touchmove', handleTouchMove, options as any);
        document.removeEventListener('scroll', handleScroll, options as any);
        document.removeEventListener('keydown', handleKeyDown, options as any);
      };
    } else {
      // dialog 关闭时也移除属性标记
      document.body.removeAttribute('data-edit-dialog-open');
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave({
      ...page,
      title: editedTitle.trim() || page.title,
      tags: editedTags,
    });
    onClose();
  };

  const handleCancel = () => {
    setEditedTitle(page.title);
    setEditedTags(page.tags);
    onClose();
  };

  if (!isOpen) return null;

  const backdropElement = (
    <motion.div
      className="fixed z-[var(--z-modal-layer)]"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
        backdropFilter: 'blur(4px)',
        margin: 0,
        padding: 0
      }}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={handleCancel}
    />
  );

  const dialogElement = (
    <motion.div
      ref={dialogRef}
      className="fixed rounded-xl border overflow-hidden"
      style={{
        zIndex: 'calc(var(--z-modal-layer) + 1)',
        left: '50%',
        top: '50%',
        // transform 已由 dialogSlideIn variant 处理（包含居中逻辑）
        width: 'calc(100% - 32px)',
        maxWidth: '360px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'color-mix(in srgb, var(--c-bg) 96%, transparent)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderColor: 'color-mix(in srgb, var(--c-glass) 45%, transparent)',
        boxShadow: `
          0 0 0 1px color-mix(in srgb, var(--c-glass) 12%, transparent),
          0 2px 4px -1px color-mix(in srgb, var(--c-glass) 10%, transparent),
          0 4px 8px -2px color-mix(in srgb, var(--c-glass) 15%, transparent),
          0 8px 16px -4px color-mix(in srgb, var(--c-glass) 20%, transparent),
          0 16px 32px -8px color-mix(in srgb, var(--c-glass) 25%, transparent),
          0 32px 64px -16px color-mix(in srgb, var(--c-glass) 30%, transparent)
        `
      }}
      variants={dialogSlideIn}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
        {/* Header - Fixed */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{
            borderBottom: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--c-content)',
              letterSpacing: '-0.02em',
              margin: 0
            }}
          >
            Edit Page
          </h2>

          <button
            onClick={handleCancel}
            className="rounded-lg p-2 transition-all"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)',
              color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 35%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 20%, transparent)';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          ref={scrollableContentRef}
          className="px-3 py-2.5 space-y-2.5 flex-1 overflow-y-auto"
          style={{
            minHeight: 0,
            // [修复] 删除魔术数字，依赖 Flexbox 自动布局
            // maxHeight: 'calc(90vh - 140px)' 
          }}
        >
          {/* URL Display (Read-only) */}
          <div>
            <label
              className="block mb-1"
              style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            URL
          </label>
          <div
            className="px-2.5 py-1 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)',
              fontSize: '0.7rem',
              color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))',
              fontWeight: 500,
              wordBreak: 'break-all'
            }}
          >
              {page.url}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label
              className="block mb-1"
              style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            Title
          </label>
            <GlassInput
              value={editedTitle}
              onChange={(value) => setEditedTitle(value)}
              placeholder="Enter page title"
            />
          </div>

          {/* Tags Input */}
          <div>
            <label
              className="block mb-1"
              style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            Tags
          </label>
            <TagInput
              tags={editedTags}
              onTagsChange={setEditedTags}
              placeholder="Add or remove tags"
            />
          </div>
        </div>

        {/* Footer - Fixed */}
        <div
          className="px-4 py-3 flex items-center justify-end gap-2 flex-shrink-0"
          style={{
            borderTop: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
          }}
        >
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)',
              color: 'var(--c-content)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 35%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 25%, transparent)';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            style={{
              background: 'color-mix(in srgb, var(--c-action) 100%, transparent)',
              border: '1.5px solid color-mix(in srgb, var(--c-action) 100%, transparent)',
              color: 'var(--c-bg)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              boxShadow: '0 2px 8px -2px color-mix(in srgb, var(--c-action) 40%, transparent)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 85%, var(--c-bg))';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px -2px color-mix(in srgb, var(--c-action) 50%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 100%, transparent)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px -2px color-mix(in srgb, var(--c-action) 40%, transparent)';
            }}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </motion.div>
  );

  // 使用Portal将backdrop和dialog渲染到body下，确保覆盖整个视口
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {typeof document !== 'undefined' && createPortal(backdropElement, document.body)}
          {typeof document !== 'undefined' && createPortal(dialogElement, document.body)}
        </>
      )}
    </AnimatePresence>
  );
}
