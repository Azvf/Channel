import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from "./GlassInput";
import { TagInput } from "./TagInput";
import { GlassCard } from "./GlassCard";
import { ModalHeader } from "./ModalHeader";
import { ModalFooter } from "./ModalFooter";
import { Save } from "lucide-react";
import { TaggedPage } from "../../types/gameplayTag";
import { GlassButton } from "./GlassButton";

interface EditPageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  page: TaggedPage;
  initialTagNames: string[];
  onSave: (payload: { title: string; tagNames: string[] }) => void | Promise<void>;
  allSuggestions?: string[];
}

// Helper for label style to ensure consistency without extra CSS classes
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-1)',
  font: 'var(--font-label)',
  letterSpacing: 'var(--letter-spacing-label)',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase'
};

export function EditPageDialog({
  isOpen,
  onClose,
  page,
  onSave,
  initialTagNames,
  allSuggestions = [],
}: EditPageDialogProps) {
  const [editedTitle, setEditedTitle] = useState(page.title);
  const [editedTags, setEditedTags] = useState<string[]>(initialTagNames);
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset form when page changes or dialog opens
  useEffect(() => {
    setEditedTitle(page.title);
    setEditedTags(initialTagNames);
  }, [page, initialTagNames, isOpen]);

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

  const handleSave = async () => {
    try {
      await Promise.resolve(
        onSave({
          title: editedTitle.trim() || page.title,
          tagNames: editedTags,
        }),
      );
    } catch (error) {
      console.error('保存页面失败:', error);
    }
  };

  const handleCancel = () => {
    setEditedTitle(page.title);
    setEditedTags(initialTagNames);
    onClose();
  };

  // 定义与 SettingsModal 一致的 variants（适用于 flex 布局）
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  // 合并为一个 modalContent 变量，结构与 SettingsModal 一致
  const modalContent = (
    <motion.div
      // 这是 Backdrop
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 'var(--z-modal-layer)',
        background: 'var(--bg-surface-glass-hover)', // Tokenized
        backdropFilter: 'blur(4px)',
        margin: 0
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={handleCancel} // 点击背景时关闭
    >
      <motion.div
        ref={dialogRef} // ref 移到这里
        // 这是 Dialog
        style={{
          width: 'calc(100% - var(--space-8))', // Tokenized padding deduction
          maxWidth: 'var(--modal-max-width)',    // Tokenized
          height: 'auto',
          maxHeight: '90vh',
          display: 'flex'
        }}
        variants={modalVariants}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()} // 阻止点击弹窗内容时关闭
      >
        <GlassCard 
          className="overflow-hidden flex flex-col"
          depthLevel={3}
          style={{ 
            width: '100%', 
            height: '100%'
          }}
        >
          {/* Header - 使用标准化的 ModalHeader */}
          <ModalHeader title="Edit Page" onClose={handleCancel} />

          {/* Content - Scrollable */}
          <div 
            ref={scrollableContentRef}
            className="flex-1 overflow-y-auto"
            style={{ 
              minHeight: 0, 
              padding: 'var(--space-3)' 
            }}
          >
            <div className="space-y-4">
              {/* URL Display */}
              <div>
                <label style={labelStyle}>URL</label>
                <div
                  className="px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: 'var(--bg-surface-glass-subtle)',
                    border: '1px solid var(--border-glass-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500,
                    wordBreak: 'break-all',
                    lineHeight: 1.4
                  }}
                >
                  {page.url}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label style={labelStyle}>Title</label>
                <GlassInput
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Enter page title"
                  as="textarea"
                  rows={2}
                />
              </div>

              {/* Tags Input */}
              <div>
                <label style={labelStyle}>Tags</label>
                <TagInput
                  tags={editedTags}
                  onTagsChange={setEditedTags}
                  placeholder="Add or remove tags"
                  suggestions={allSuggestions}
                  excludeTags={editedTags}
                  allowCreation={true}
                  dropdownZIndex="var(--z-tooltip-layer)"
                />
              </div>
            </div>
          </div>

        {/* Footer - 使用标准化的 ModalFooter */}
        <ModalFooter>
          <GlassButton
            onClick={handleCancel}
            variant="secondary"
          >
            Cancel
          </GlassButton>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            style={{
              background: 'var(--bg-action-subtle)',
              border: '1.5px solid var(--bg-action-subtle)',
              color: 'var(--color-text-action)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-action-moderate)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-action-subtle)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </ModalFooter>
      </GlassCard>
      </motion.div>
    </motion.div>
  );

  // Portal
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 只 Portal *一个* 组件 */}
          {typeof document !== 'undefined' && createPortal(modalContent, document.body)}
        </>
      )}
    </AnimatePresence>
  );
}
