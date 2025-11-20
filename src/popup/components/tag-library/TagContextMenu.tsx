import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import type { GameplayTag } from "../../../types/gameplayTag";

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
          style={{ zIndex: "calc(var(--z-modal-layer) + 1)" }}
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
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed liquidGlass-wrapper"
            data-menu-tag-id={tag.id}
            style={{
              top: position.y,
              left: position.x,
              minWidth: "150px",
              borderRadius: "0.8em",
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
                      color: "var(--c-content)",
                      background: "transparent",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
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
                      color: "color-mix(in srgb, var(--c-content) 60%, transparent)",
                      background: "transparent",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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

