import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { ModalHeader } from "./ModalHeader";
import { GlassInput } from "./GlassInput";
import { currentPageService } from "../../services/popup/currentPageService";
import { GameplayTag } from "../../types/gameplayTag";
import { AlertModal, type AlertAction } from "./AlertModal";

// 引入模块化组件
import { TagRow } from "./tag-library/TagRow";
import { TagContextMenu } from "./tag-library/TagContextMenu";
import { LAYOUT, POSITIONING } from "../utils/layoutConstants";

interface TagManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AlertState {
  isOpen: boolean;
  title: string;
  intent: 'info' | 'warning' | 'destructive';
  children: React.ReactNode;
  actions: AlertAction[];
}

export function TagManagementPage({ isOpen, onClose }: TagManagementPageProps) {
  // --- State Management ---
  const [tags, setTags] = useState<GameplayTag[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<GameplayTag | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  // Menu State
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRefs = useRef<Map<string, HTMLElement>>(new Map());

  // --- Data Fetching ---
  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const [allTags, allCounts] = await Promise.all([
        currentPageService.getAllTags(),
        currentPageService.getAllTagUsageCounts(),
      ]);
      allTags.sort((a, b) => a.name.localeCompare(b.name));
      setTags(allTags);
      setUsageCounts(allCounts);
    } catch (error) {
      console.error("加载标签库失败:", error);
      setAlertState({
        isOpen: true,
        title: "加载失败",
        intent: "destructive",
        children: "加载标签库失败，请稍后重试。",
        actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setEditingTag(null);
      setEditValue("");
      setMenuTargetId(null);
      setLoading(true);
      return;
    }
    void loadTags();
  }, [isOpen, loadTags]);

  // --- Actions ---
  const handleEditTag = (tag: GameplayTag) => {
    setEditingTag(tag);
    setEditValue(tag.name);
    setMenuTargetId(null); // Close menu if open
  };

  const handleSaveEdit = async () => {
    if (!editingTag) return;
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === editingTag.name) {
      setEditingTag(null);
      setEditValue("");
      return;
    }

    try {
      await currentPageService.updateTag(editingTag.id, trimmedValue);
      await loadTags();
      setEditingTag(null);
      setEditValue("");
    } catch (error) {
      setAlertState({
        isOpen: true,
        title: "更新失败",
        intent: "destructive",
        children: error instanceof Error ? error.message : "未知错误",
        actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
      });
    }
  };

  const confirmDelete = async (tagId: string) => {
    setAlertState(null);
    try {
      await currentPageService.deleteTag(tagId);
      await loadTags();
    } catch (error) {
      setAlertState({
        isOpen: true,
        title: "删除失败",
        intent: "destructive",
        children: error instanceof Error ? error.message : "未知错误",
        actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
      });
    }
  };

  const handleDeleteTag = (tagId: string) => {
    setMenuTargetId(null);
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    setAlertState({
      isOpen: true,
      title: "确认删除标签",
      intent: "destructive",
      children: (
        <span>
          你确定要删除标签 "<b>{tag.name}</b>" 吗？
          <br />
          此操作会将其从所有 {usageCounts[tagId] || 0} 个页面中移除，且<strong>无法撤销</strong>。
        </span>
      ),
      actions: [
        { id: "cancel", label: "取消", variant: "default", onClick: () => setAlertState(null) },
        { id: "delete", label: "删除", variant: "destructive", onClick: () => confirmDelete(tagId), autoFocus: true },
      ],
    });
  };

  const handleOpenMenu = useCallback((e: ReactMouseEvent | ReactTouchEvent, tagId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // [Refactor] 使用标准布局常量
    setMenuPosition({ x: rect.right - LAYOUT.MENU_MIN_WIDTH, y: rect.bottom + POSITIONING.DROPDOWN_OFFSET });
    setMenuTargetId(tagId);
  }, []);

  // 注册 ref 的回调
  const setMenuButtonRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) menuButtonRefs.current.set(id, el);
    else menuButtonRefs.current.delete(id);
  }, []);

  // --- Filtering & Search ---
  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;
    const lowerQuery = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(lowerQuery));
  }, [tags, searchQuery]);

  const trimmedQuery = searchQuery.trim();
  const exactMatch = useMemo(() => {
    if (!trimmedQuery) return null;
    return tags.find((tag) => tag.name.toLowerCase() === trimmedQuery.toLowerCase()) || null;
  }, [tags, trimmedQuery]);

  const canCreate = trimmedQuery.length > 0 && !exactMatch && !loading;

  const handleCreateTag = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      await currentPageService.createTag(trimmedQuery);
      setSearchQuery("");
      await loadTags();
    } catch (error) {
      setAlertState({
        isOpen: true,
        title: "创建失败",
        intent: "destructive",
        children: error instanceof Error ? error.message : "未知错误",
        actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && canCreate) {
      e.preventDefault();
      handleCreateTag();
    }
  };

  // --- Variants ---
  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0 } };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              // [Refactor] 使用明确的 Backdrop 层级
              zIndex: "var(--z-modal-backdrop)",
              // [Refactor] Tokenized Backdrop
              background: "var(--bg-surface-glass-active)", 
              backdropFilter: "blur(var(--glass-blur-base))",
            }}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => {
              setMenuTargetId(null);
              onClose();
            }}
          >
            <motion.div
              className="w-full"
              variants={modalVariants}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: "var(--modal-max-width)", 
                // [Refactor] 使用标准模态框高度 Token
                maxHeight: "var(--modal-max-height)", 
                display: "flex" 
              }}
            >
              <GlassCard className="flex flex-col" depthLevel={10} style={{ width: "100%", maxHeight: "var(--modal-max-height)", padding: "var(--space-5)" }}>
                <ModalHeader title="Tag Library" onClose={onClose} />

                <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, paddingRight: "var(--space-2)", marginTop: "var(--space-4)" }}>
                  {/* Search Input */}
                  <div className="mb-4">
                    <GlassInput
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search tags..."
                      autoFocus={isOpen}
                      disabled={loading && tags.length === 0}
                    />
                  </div>

                  <div className="space-y-1">
                    <AnimatePresence>
                      {canCreate && (
                        <motion.div
                          key="create-tag-row"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <GlassCard
                            className="p-3 mb-2 cursor-pointer"
                            onClick={handleCreateTag}
                            // 不需要 depthLevel，这是内部列表项
                            style={{
                              // [Refactor] 使用标准透明度 Token
                              opacity: isCreating ? 'var(--opacity-loading)' : 1,
                              cursor: isCreating ? "wait" : "pointer",
                              // [Refactor] 使用 Action Border
                              border: "1px solid var(--border-action-subtle)",
                              padding: "var(--space-3)",
                              borderRadius: "var(--radius-md)"
                            }}
                            onMouseEnter={(e) => {
                              if (isCreating) return;
                              e.currentTarget.style.background = "var(--bg-surface-glass-hover)";
                            }}
                            onMouseLeave={(e) => {
                              if (isCreating) return;
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <span style={{ color: "var(--color-text-action)", fontWeight: 500, font: "var(--font-body)" }}>
                              {isCreating ? "Creating..." : `+ Create "${trimmedQuery}"`}
                            </span>
                          </GlassCard>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {loading && tags.length === 0 ? (
                      <div style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "var(--space-8)" }}>
                        Loading...
                      </div>
                    ) : filteredTags.length === 0 && !canCreate ? (
                      <div style={{ color: "var(--color-text-tertiary)", textAlign: "center", padding: "var(--space-8)" }}>
                        {searchQuery ? "No tags found" : "Library is empty"}
                      </div>
                    ) : (
                      filteredTags.map((tag) => (
                        <TagRow
                          key={tag.id}
                          tag={tag}
                          isEditing={editingTag?.id === tag.id}
                          editValue={editValue}
                          usageCount={usageCounts[tag.id] || 0}
                          onEditValueChange={setEditValue}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={() => { setEditingTag(null); setEditValue(""); }}
                          onEditTag={handleEditTag}
                          onDeleteTag={() => handleDeleteTag(tag.id)}
                          onOpenMenu={handleOpenMenu}
                          setMenuButtonRef={setMenuButtonRef}
                        />
                      ))
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TagContextMenu
        isOpen={menuTargetId !== null}
        tag={tags.find(t => t.id === menuTargetId) || null}
        position={menuPosition}
        onClose={() => setMenuTargetId(null)}
        onEdit={() => {
            const tag = tags.find(t => t.id === menuTargetId);
            if (tag) handleEditTag(tag);
        }}
        onDelete={() => {
            if (menuTargetId) handleDeleteTag(menuTargetId);
        }}
      />

      <AlertModal
        isOpen={!!alertState?.isOpen}
        onClose={() => setAlertState(null)}
        title={alertState?.title || "提示"}
        intent={alertState?.intent || "info"}
        actions={alertState?.actions || []}
      >
        {alertState?.children}
      </AlertModal>
    </>,
    document.body
  );
}
