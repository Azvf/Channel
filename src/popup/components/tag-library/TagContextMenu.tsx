import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import type { GameplayTag } from "../../../shared/types/gameplayTag";
import { SMOOTH_TRANSITION } from "../../utils/motion"; // [Refactor] 使用统一的动画系统

interface TagContextMenuProps {
  isOpen: boolean;
  tag: GameplayTag | null; // 当前选中的 tag
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TagContextMenu({
  isOpen,
  tag,
  position,
  onClose,
  onEdit,
  onDelete,
}: TagContextMenuProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && tag && (
        <div
          className="fixed inset-0"
          // [Refactor] 使用明确的 Backdrop 层级
          style={{ zIndex: "var(--z-context-menu-backdrop)" }}
          onClick={onClose}
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          <motion.div
            key="tag-library-context-menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            // [Refactor] 使用统一的动画系统，替代硬编码的 0.15s
            transition={SMOOTH_TRANSITION}
            className="fixed liquidGlass-wrapper"
            data-menu-tag-id={tag.id}
            style={{
              // [Refactor] 使用明确的 Body 层级，替代 calc(+1)
              zIndex: "var(--z-context-menu-body)",
              top: position.y,
              left: position.x,
              // [Refactor] 使用标准菜单宽度 Token
              minWidth: "var(--menu-min-width)",
              // [Refactor] Tokenized Radius
              borderRadius: "var(--radius-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="liquidGlass-content p-1">
              <ul className="list-none m-0 p-0">
                <li>
                  <button
                    onClick={() => {
                      onEdit();
                      onClose();
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all hover-action"
                    style={{
                      color: "var(--color-text-primary)",
                      background: "transparent",
                      // [Refactor] 使用标准字体 Token
                      font: "var(--font-caption)",
                      letterSpacing: "var(--letter-spacing-caption)",
                      fontWeight: 500,
                    }}
                  >
                    <Pencil className="icon-sm" />
                    <span>编辑</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all hover-destructive"
                    style={{
                      color: "var(--color-text-secondary)",
                      background: "transparent",
                      // [Refactor] 使用标准字体 Token
                      font: "var(--font-caption)",
                      letterSpacing: "var(--letter-spacing-caption)",
                      fontWeight: 500,
                    }}
                  >
                    <Trash2 className="icon-sm" />
                    <span>删除</span>
                  </button>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

