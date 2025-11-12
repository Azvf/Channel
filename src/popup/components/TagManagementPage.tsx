import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ModalHeader } from "./ModalHeader";
import { GlassInput } from "./GlassInput";
import { useLongPress } from "../utils/useLongPress";
import { currentPageService } from "../../services/popup/currentPageService";
import { GameplayTag } from "../../types/gameplayTag";
import { AlertModal, type AlertAction } from "./AlertModal";

interface TagManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AlertState {
  isOpen: boolean;
  title: string;
  intent: 'info' | 'warning' | 'destructive';
  children: ReactNode;
  actions: AlertAction[];
}

export function TagManagementPage({ isOpen, onClose }: TagManagementPageProps) {
  const [tags, setTags] = useState<GameplayTag[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<GameplayTag | null>(null);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [alertState, setAlertState] = useState<AlertState | null>(null);

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
        actions: [
          {
            id: "ok",
            label: "好的",
            variant: "primary",
            onClick: () => setAlertState(null),
          },
        ],
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
      setMenuOpen(null);
      setLoading(true);
      return;
    }

    void loadTags();
  }, [isOpen, loadTags]);

  const handleEditTag = (tag: GameplayTag) => {
    setEditingTag(tag);
    setEditValue(tag.name);
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTag) {
      setEditingTag(null);
      return;
    }

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
      console.error("更新标签失败:", error);
      setAlertState({
        isOpen: true,
        title: "更新失败",
        intent: "destructive",
        children: error instanceof Error ? error.message : "未知错误",
        actions: [
          { id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) },
        ],
      });
    }
  };

  const confirmDelete = async (tagId: string) => {
    setAlertState(null);
    try {
      await currentPageService.deleteTag(tagId);
      await loadTags();
    } catch (error) {
      console.error("删除标签失败:", error);
      setAlertState({
        isOpen: true,
        title: "删除失败",
        intent: "destructive",
        children: error instanceof Error ? error.message : "未知错误",
        actions: [
          { id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) },
        ],
      });
    }
  };

  const handleDeleteTag = (tagId: string) => {
    setMenuOpen(null);

    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    setAlertState({
      isOpen: true,
      title: "确认删除标签",
      intent: "destructive",
      children: (
        <span>
          你确定要删除标签 “<b>{tag.name}</b>” 吗？
          <br />
          此操作会将其从所有 {usageCounts[tagId] || 0} 个页面中移除，且<strong>无法撤销</strong>。
        </span>
      ),
      actions: [
        { id: "cancel", label: "取消", variant: "default", onClick: () => setAlertState(null) },
        {
          id: "delete",
          label: "删除",
          variant: "destructive",
          onClick: () => confirmDelete(tagId),
          autoFocus: true,
        },
      ],
    });
  };

  const handleOpenMenu = (e: ReactMouseEvent | ReactTouchEvent, tagId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 150,
      y: rect.bottom + 8,
    });
    setMenuOpen(tagId);
  };

  const handleCloseMenu = () => {
    setMenuOpen(null);
  };

  useEffect(() => {
    if (menuOpen === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuElement = document.querySelector("[data-menu-tag-id]");
      const buttonElement = menuButtonRefs.current.get(menuOpen);

      if (
        menuElement &&
        !menuElement.contains(target) &&
        buttonElement &&
        !buttonElement.contains(target)
      ) {
        handleCloseMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const filteredTags = useMemo(() => {
    if (!searchQuery) {
      return tags;
    }
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

    const tagName = trimmedQuery;

    setIsCreating(true);
    try {
      await currentPageService.createTag(tagName);
      setSearchQuery("");
      await loadTags();
    } catch (error) {
      console.error("创建标签失败:", error);
      setAlertState({
        isOpen: true,
        title: "创建失败",
        intent: "destructive",
        children: error instanceof Error ? error.message : "未知错误",
        actions: [
          { id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) },
        ],
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

  const getTagUsageCount = (tagId: string): number => {
    return usageCounts[tagId] || 0;
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  const modalContent = (
    <motion.div
      key="tag-library-modal"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-layer)",
        background: "color-mix(in srgb, var(--c-glass) 15%, transparent)",
        backdropFilter: "blur(4px)",
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => {
        handleCloseMenu();
        onClose();
      }}
    >
      <motion.div
        className="w-full max-w-sm"
        variants={modalVariants}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", display: "flex" }}
      >
        <GlassCard className="p-5 flex flex-col" style={{ width: "100%", maxHeight: "90vh" }}>
          <ModalHeader title="Tag Library" onClose={onClose} />

          <div
            className="flex-1 overflow-y-auto"
            style={{
              minHeight: 0,
              paddingRight: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <GlassInput
                value={searchQuery}
                onChange={setSearchQuery}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索或创建标签..."
                autoFocus={isOpen}
                disabled={loading && tags.length === 0}
                className="w-full"
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
                      style={{
                        opacity: isCreating ? 0.7 : 1,
                        cursor: isCreating ? "wait" : "pointer",
                        border: "1px solid color-mix(in srgb, var(--c-action) 30%, transparent)",
                      }}
                      onMouseEnter={(e) => {
                        if (isCreating) return;
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--c-glass) 15%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        if (isCreating) return;
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          color: "var(--c-action)",
                          fontWeight: 500,
                          fontSize: "0.9rem",
                        }}
                      >
                        {isCreating ? "正在创建..." : `+ 创建标签 "${trimmedQuery}"`}
                      </span>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading && tags.length === 0 ? (
                <div
                  style={{
                    color: "color-mix(in srgb, var(--c-content) 50%, transparent)",
                    textAlign: "center",
                    padding: "2rem",
                  }}
                >
                  Loading...
                </div>
              ) : filteredTags.length === 0 && !canCreate ? (
                <div
                  style={{
                    color: "color-mix(in srgb, var(--c-content) 40%, transparent)",
                    textAlign: "center",
                    padding: "2rem",
                  }}
                >
                  {searchQuery ? "未找到标签" : "标签库为空"}
                </div>
              ) : (
                filteredTags.map((tag) => {
                  const isEditing = editingTag?.id === tag.id;

                  return (
                    <TagRow
                      key={tag.id}
                      tag={tag}
                      isEditing={isEditing}
                      editValue={editValue}
                      onEditValueChange={setEditValue}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={() => {
                        setEditingTag(null);
                        setEditValue("");
                      }}
                      onEditTag={handleEditTag}
                      onDeleteTag={handleDeleteTag}
                      onOpenMenu={handleOpenMenu}
                      getTagUsageCount={getTagUsageCount}
                      menuButtonRefs={menuButtonRefs}
                    />
                  );
                })
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );

  const contextMenuContent = () => {
    if (!isOpen || menuOpen === null) {
      return null;
    }

    const tag = tags.find((item) => item.id === menuOpen);
    if (!tag) {
      return null;
    }

    return (
      <motion.div
        key="tag-library-context-menu"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed liquidGlass-wrapper"
        data-menu-tag-id={menuOpen}
        style={{
          zIndex: "calc(var(--z-modal-layer) + 1)",
          top: menuPosition.y,
          left: menuPosition.x,
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
                  handleEditTag(tag);
                  handleCloseMenu();
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
                  handleDeleteTag(tag.id);
                  handleCloseMenu();
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
    );
  };

  return createPortal(
    <>
      <AnimatePresence>{isOpen && modalContent}</AnimatePresence>
      <AnimatePresence>
        {isOpen && menuOpen !== null && (
          <div
            className="fixed inset-0"
            style={{ zIndex: "calc(var(--z-modal-layer) + 1)" }}
            onClick={handleCloseMenu}
            onContextMenu={(event) => {
              event.preventDefault();
              handleCloseMenu();
            }}
          >
            {contextMenuContent()}
          </div>
        )}
      </AnimatePresence>
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
interface TagRowProps {
  tag: GameplayTag;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTag: (tag: GameplayTag) => void;
  onDeleteTag: (tagId: string) => void;
  onOpenMenu: (e: ReactMouseEvent | ReactTouchEvent, tagId: string) => void;
  getTagUsageCount: (tagId: string) => number;
  menuButtonRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

function TagRow({
  tag,
  isEditing,
  editValue,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onEditTag,
  onDeleteTag,
  onOpenMenu,
  getTagUsageCount,
  menuButtonRefs
}: TagRowProps) {
  const longPressHandlers = useLongPress({
    onLongPress: (e) => onOpenMenu(e, tag.id),
    delay: 500
  });

  if (isEditing) {
    return (
      <div
        className="group relative flex items-center justify-between gap-3 p-3 rounded-lg"
        style={{
          background: "color-mix(in srgb, var(--c-glass) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--c-action) 20%, transparent)",
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color || "var(--c-action)" }}
          ></div>
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSaveEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit();
              }
            }}
            autoFocus
            className="flex-1 w-full bg-transparent outline-none"
            style={{
              color: "var(--c-content)",
              fontSize: "0.9rem",
              fontWeight: 500,
              padding: 0,
              margin: 0,
            }}
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            style={{
              color: "color-mix(in srgb, var(--c-content) 50%, transparent)",
              fontSize: "0.75rem",
              fontWeight: 400,
              opacity: 1,
            }}
          >
            {getTagUsageCount(tag.id)} uses
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={(el) => {
        if (el) {
          menuButtonRefs.current.set(tag.id, el);
        } else {
          menuButtonRefs.current.delete(tag.id);
        }
      }}
      {...longPressHandlers}
      className="group relative flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-all hover-glass"
      style={{
        background: 'transparent',
        border: '1px solid transparent'
      }}
      onContextMenu={(e) => onOpenMenu(e, tag.id)}
      onClick={() => onEditTag(tag)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color || 'var(--c-action)' }}
        />
        <span
          className="truncate"
          style={{
            color: 'var(--c-content)',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {tag.name}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="transition-opacity duration-150 group-hover:opacity-0"
          style={{
            color: 'color-mix(in srgb, var(--c-content) 50%, transparent)',
            fontSize: '0.75rem',
            fontWeight: 400
          }}
        >
          {getTagUsageCount(tag.id)} uses
        </span>

        <div className="absolute right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteTag(tag.id); }}
            className="p-1.5 rounded-md transition-all hover-destructive"
            style={{
              color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
              background: 'transparent'
            }}
            title="删除标签"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


