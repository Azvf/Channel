import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from "./GlassInput";
import { TagInput } from "./TagInput";
import { GlassCard } from "./GlassCard";
import { ModalHeader } from "./ModalHeader";
import { ModalFooter } from "./ModalFooter";
import { Save } from "lucide-react";
import { dialogSlideIn } from "../utils/motion";

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
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Reset form when page changes or dialog opens
  useEffect(() => {
    setEditedTitle(page.title);
    setEditedTags(page.tags);
  }, [page, isOpen]);

  // 使用原生 dialog API 管理打开/关闭状态
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      // 仅在 dialog 未打开时调用 showModal
      if (!dialog.open) {
        dialog.showModal();
        document.body.setAttribute('data-edit-dialog-open', 'true');
      }
    } else {
      // 仅在 dialog 已打开时调用 close
      // AnimatePresence 会在动画结束后移除 dialog
      if (dialog.open) {
        dialog.close();
        document.body.removeAttribute('data-edit-dialog-open');
      }
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

  // 处理 dialog 关闭事件（ESC 键或点击背景）
  const handleDialogClose = () => {
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <dialog
          ref={dialogRef}
          onClose={handleDialogClose}
          onClick={(e) => {
            // 点击 dialog 本身（backdrop）时关闭
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          className="edit-page-dialog"
        >
          <motion.div
            variants={dialogSlideIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'calc(100% - 32px)',
              maxWidth: '360px',
              maxHeight: '90vh',
              display: 'flex',
            }}
          >
            <GlassCard
              className="overflow-hidden flex flex-col"
              style={{
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
              }}
            >
              {/* Header - 使用标准化的 ModalHeader */}
              <ModalHeader title="Edit Page" onClose={handleCancel} />

              {/* Content - Scrollable */}
              <div
                className="px-3 py-2.5 space-y-2.5 flex-1 overflow-y-auto"
                style={{ minHeight: 0 }}
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
                    as="textarea"
                    rows={2}
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

              {/* Footer - 使用标准化的 ModalFooter */}
              <ModalFooter>
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
              </ModalFooter>
            </GlassCard>
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>,
    document.body
  );
}
