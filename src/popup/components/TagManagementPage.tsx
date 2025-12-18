import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FunctionalModal } from "./FunctionalModal";
import { GlassCard } from "./GlassCard";
import { Input } from "./ui/input";
import { currentPageService } from "../../services/popup/currentPageService";
import { GameplayTag } from "../../shared/types/gameplayTag";
import { AlertModal, type AlertAction } from "./AlertModal";
import { useUpdateTag, useDeleteTag, useCreateTag } from "../hooks/mutations/useTagMutations";
import { useDraftState } from "../hooks/headless/useDraftState";
import { useScrollPosition } from "../hooks/headless/useScrollPosition";

// 引入模块化组件
import { TagRow } from "./tag-library/TagRow";

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
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  // 使用草稿状态持久化搜索输入
  const {
    value: searchQuery,
    setValue: setSearchQuery,
    isRestored: isSearchRestored,
  } = useDraftState({
    key: 'draft.tag_management.search',
    initialValue: '',
    enable: isOpen,
  });

  // 使用草稿状态持久化编辑输入
  const {
    value: editValue,
    setValue: setEditValue,
    clearDraft: clearEditDraft,
  } = useDraftState({
    key: 'draft.tag_management.edit',
    initialValue: '',
    enable: isOpen,
  });

  // 滚动容器 ref（使用 FunctionalModal 的 contentRef）
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 滚动位置恢复
  useScrollPosition({
    key: 'scroll.tag_management',
    containerRef: contentRef,
    isEnabled: isOpen,
    axis: 'y',
  });

  // 恢复搜索输入时自动全选文本（UX 细节）
  // 只在 modal 打开时执行一次，避免在用户输入时重复执行
  // 使用 ref 跟踪是否已执行，防止 searchQuery 变化时重复触发
  const hasAutoSelectedRef = useRef(false);
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAutoSelectedRef.current = false;
      prevIsOpenRef.current = false;
      return;
    }
    
    // 只在 modal 从关闭变为打开时，且 searchQuery 有值且是从草稿恢复的，才自动全选
    const isOpening = !prevIsOpenRef.current && isOpen;
    prevIsOpenRef.current = isOpen;
    
    // 只在 modal 刚打开（从关闭变为打开）且 searchQuery 有值且是从草稿恢复的，才自动全选
    if (isOpening && searchQuery && isSearchRestored && searchInputRef.current && !hasAutoSelectedRef.current) {
      // 延迟执行，确保 DOM 已渲染
      const timeoutId = setTimeout(() => {
        if (searchInputRef.current && !hasAutoSelectedRef.current) {
          searchInputRef.current.select();
          hasAutoSelectedRef.current = true;
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, searchQuery, isSearchRestored]);

  // Menu State - 已移除，改用 ContextMenu 组件内部管理

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
      setEditingTag(null);
      // 不在这里清除 editValue，让 useDraftState 的 enable 参数控制草稿的启用/禁用
      setLoading(true);
      return;
    }
    void loadTags();
  }, [isOpen, loadTags]);

  // 使用乐观更新的 mutation hooks
  const { mutate: updateTag } = useUpdateTag(
    // 乐观更新：立即更新标签名称
    useCallback((tagId: string, newName: string) => {
      setTags((prevTags) =>
        prevTags.map((tag) => (tag.id === tagId ? { ...tag, name: newName } : tag))
      );
    }, []),
    // 回滚：恢复旧名称
    useCallback((tagId: string, oldName: string) => {
      setTags((prevTags) =>
        prevTags.map((tag) => (tag.id === tagId ? { ...tag, name: oldName } : tag))
      );
    }, [])
  );

  const { mutate: deleteTag } = useDeleteTag(
    // 乐观更新：立即从列表中移除
    useCallback((tagId: string) => {
      setTags((prevTags) => prevTags.filter((tag) => tag.id !== tagId));
    }, []),
    // 回滚：恢复标签到列表
    useCallback((tag: GameplayTag) => {
      setTags((prevTags) => {
        const newTags = [...prevTags, tag];
        newTags.sort((a, b) => a.name.localeCompare(b.name));
        return newTags;
      });
    }, [])
  );

  const { mutate: createTag, isPending: isCreatingTagMutation } = useCreateTag(
    // 乐观更新：立即添加到列表
    useCallback((tag: GameplayTag) => {
      setTags((prevTags) => {
        const newTags = [...prevTags, tag];
        newTags.sort((a, b) => a.name.localeCompare(b.name));
        return newTags;
      });
    }, []),
    // 回滚：移除临时标签
    useCallback((tempTagId: string) => {
      setTags((prevTags) => prevTags.filter((tag) => tag.id !== tempTagId));
    }, [])
  );

  // --- Actions ---
  const handleEditTag = (tag: GameplayTag) => {
    setEditingTag(tag);
    setEditValue(tag.name);
  };

  const handleSaveEdit = () => {
    if (!editingTag) return;
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === editingTag.name) {
      setEditingTag(null);
      clearEditDraft();
      return;
    }

    // 使用乐观更新的 mutation（传入 oldName 用于回滚）
    updateTag(
      { tagId: editingTag.id, newName: trimmedValue, oldName: editingTag.name },
      {
        onSuccess: () => {
          setEditingTag(null);
          clearEditDraft();
          // 静默刷新以确保数据同步
          loadTags().catch(console.error);
        },
        onError: (error) => {
          setAlertState({
            isOpen: true,
            title: "更新失败",
            intent: "destructive",
            children: error instanceof Error ? error.message : "未知错误",
            actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
          });
          // 错误时也刷新数据以恢复正确状态
          loadTags().catch(console.error);
        },
      }
    );
  };

  const confirmDelete = (tagId: string) => {
    setAlertState(null);
    
    // 保存要删除的标签用于回滚
    const tagToDelete = tags.find((t) => t.id === tagId);
    if (!tagToDelete) return;

    // 使用乐观更新的 mutation
    deleteTag({ tagId, tag: tagToDelete }, {
      onSuccess: () => {
        // 静默刷新以确保数据同步
        loadTags().catch(console.error);
      },
      onError: (error) => {
        setAlertState({
          isOpen: true,
          title: "删除失败",
          intent: "destructive",
          children: error instanceof Error ? error.message : "未知错误",
          actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
        });
        // 错误时也刷新数据以恢复正确状态
        loadTags().catch(console.error);
      },
    });
  };

  const handleDeleteTag = (tagId: string) => {
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

  // handleOpenMenu 和 setMenuButtonRef 已移除，改用 ContextMenu 组件内部管理

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
  const isCreating = isCreatingTagMutation;

  const handleCreateTag = () => {
    if (!canCreate || isCreating) return;
    
      // 使用乐观更新的 mutation
      createTag(trimmedQuery, {
        onSuccess: (createdTag) => {
          setSearchQuery("");
        // 用真实标签替换临时标签
        setTags((prevTags) => {
          const filtered = prevTags.filter((tag) => tag.id.startsWith('temp-'));
          const newTags = [...filtered, createdTag];
          newTags.sort((a, b) => a.name.localeCompare(b.name));
          return newTags;
        });
        // 静默刷新以确保数据同步
        loadTags().catch(console.error);
      },
      onError: (error) => {
        setAlertState({
          isOpen: true,
          title: "创建失败",
          intent: "destructive",
          children: error instanceof Error ? error.message : "未知错误",
          actions: [{ id: "ok", label: "好的", variant: "primary", onClick: () => setAlertState(null) }],
        });
        // 错误时也刷新数据以恢复正确状态
        loadTags().catch(console.error);
      },
    });
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && canCreate) {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <>
      <FunctionalModal
        isOpen={isOpen}
        onClose={onClose}
        title="Tag Library"
        onBackdropClick={onClose}
        contentRef={contentRef}
        glassCardStyle={{
          padding: "var(--space-5)",
        }}
        contentStyle={{
          paddingRight: "var(--space-2)",
          marginTop: "var(--space-4)",
        }}
      >
        {/* Search Input */}
        <div className="mb-4">
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
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
                  style={{
                    opacity: isCreating ? 'var(--opacity-loading)' : 1,
                    cursor: isCreating ? "wait" : "pointer",
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
                onCancelEdit={() => { 
                  setEditingTag(null); 
                  clearEditDraft();
                }}
                onEditTag={handleEditTag}
                onDeleteTag={() => handleDeleteTag(tag.id)}
              />
            ))
          )}
        </div>
      </FunctionalModal>

      <AlertModal
        isOpen={!!alertState?.isOpen}
        onClose={() => setAlertState(null)}
        title={alertState?.title || "提示"}
        intent={alertState?.intent || "info"}
        actions={alertState?.actions || []}
      >
        {alertState?.children}
      </AlertModal>
    </>
  );
}
