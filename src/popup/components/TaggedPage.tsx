import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Tag } from "./Tag";
import { PageIcon } from "./PageIcon";
import { EditPageDialog } from "./EditPageDialog";
import { Tooltip } from "./Tooltip";
import {
  Search,
  Inbox,
  Trash2,
  Copy,
  Pencil,
  Settings,
  TrendingUp,
  Bookmark,
  Tag as TagIcon,
} from "lucide-react";
import { AnimatedFlipList } from "./AnimatedFlipList";
import { useLongPress } from "../utils/useLongPress";
import { TaggedPage as TaggedPageType } from "../../shared/types/gameplayTag";
import { useUpdatePageDetails } from "../hooks/mutations/usePageMutations";
import { useAppContext } from "../context/AppContext";
import { getTransition, DURATION } from "../../design-tokens/animation"; // [Refactor] 引入物理引擎
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

// [Refactor] 使用 Token 替换硬编码的 color-mix
// 原: color: "color-mix(in srgb, var(--c-content) 50%, var(--c-bg))" -> var(--color-text-secondary)
const StatItem = ({ icon, value }: { icon: React.ReactNode; value: number }) => (
  <div
    className="flex items-center gap-1"
    style={{
      fontVariantNumeric: "tabular-nums",
      userSelect: "none",
      WebkitUserSelect: "none",
      MozUserSelect: "none",
      msUserSelect: "none",
      pointerEvents: "auto",
    }}
  >
    {React.cloneElement(icon as any, {
      className: "icon-xs stat-item-icon",
      strokeWidth: 2,
      style: {
        color: "var(--color-text-secondary)", // Tokenized
        transition: "color var(--transition-fast) var(--ease-smooth)",
      },
    })}
    <span
      className="stat-item-value"
      style={{
        font: "var(--font-tag)",
        letterSpacing: "var(--letter-spacing-tag)",
        color: "var(--color-text-tertiary)", // Tokenized (approx 70% mix)
        transition: "color var(--transition-fast) var(--ease-smooth)",
      }}
    >
      {value}
    </span>
  </div>
);

interface TaggedPageProps {
  className?: string;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onOpenTagLibrary: () => void;
}

interface PageCardProps {
  page: TaggedPageType;
  searchTags: string[];
  onEditPage: (page: TaggedPageType) => void;
  onCopyUrl: (url: string) => void;
  onRemovePage: (pageId: string) => void;
  tagIdToName: Map<string, string>;
}

export function TaggedPage({
  className = "",
  onOpenSettings,
  onOpenStats,
  onOpenTagLibrary,
}: TaggedPageProps) {
  const {
    allPages,
    allTags,
    stats,
    loading: appLoading,
    error: appError,
    refreshAllData,
  } = useAppContext();

  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingPage, setEditingPage] = useState<TaggedPageType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [removedPageIds, setRemovedPageIds] = useState<Set<string>>(new Set<string>());

  const removePageFromView = useCallback((pageId: string) => {
    setRemovedPageIds((prev) => {
      if (prev.has(pageId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(pageId);
      return next;
    });
  }, []);

  useEffect(() => {
    setRemovedPageIds(new Set<string>());
  }, [allPages]);

  const tagIdToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of allTags) {
      map.set(tag.id, tag.name);
    }
    return map;
  }, [allTags]);

  const tagNameToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of allTags) {
      map.set(tag.name, tag.id);
    }
    return map;
  }, [allTags]);

  const suggestions = useMemo(() => allTags.map((tag) => tag.name), [allTags]);

  // 本地状态用于乐观更新 allPages
  const [optimisticPages, setOptimisticPages] = useState<TaggedPageType[] | null>(null);
  
  // 合并本地乐观更新和 AppContext 的 allPages
  const displayPages = optimisticPages ?? allPages;

  const visiblePages = useMemo(
    () => displayPages.filter((page) => !removedPageIds.has(page.id)),
    [displayPages, removedPageIds],
  );

  const filteredPages = useMemo(() => {
    if (searchTags.length === 0) {
      return visiblePages;
    }

    return visiblePages.filter((page) =>
      searchTags.every((tagName) => {
        const tagId = tagNameToId.get(tagName);
        return tagId ? page.tags.includes(tagId) : false;
      }),
    );
  }, [visiblePages, searchTags, tagNameToId]);

  // [Performance] 懒加载配置：初始只渲染前 50 个卡片，滚动时自动加载更多
  // 策略：使用 Intersection Observer 监听底部哨兵元素，提前 200px 开始加载
  const INITIAL_LOAD_COUNT = 50;
  const LOAD_MORE_BATCH_SIZE = 50;
  const LOAD_MORE_THRESHOLD = 200;

  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 计算要显示的项目（只包含前 visibleCount 个）
  const displayedPages = useMemo(() => {
    return filteredPages.slice(0, visibleCount);
  }, [filteredPages, visibleCount]);

  // 搜索时重置懒加载状态
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD_COUNT);
  }, [searchTags]);

  // 数据变化时自动调整（如果总数减少，确保 visibleCount 不超过总数）
  useEffect(() => {
    if (filteredPages.length < visibleCount) {
      setVisibleCount(Math.min(INITIAL_LOAD_COUNT, filteredPages.length));
    }
  }, [filteredPages.length, visibleCount]);

  // Intersection Observer：监听底部哨兵元素，自动加载更多
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || displayedPages.length >= filteredPages.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !appLoading) {
          setVisibleCount((prev) => {
            const next = prev + LOAD_MORE_BATCH_SIZE;
            return Math.min(next, filteredPages.length);
          });
        }
      },
      {
        root: null,
        rootMargin: `${LOAD_MORE_THRESHOLD}px`,
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [displayedPages.length, filteredPages.length, appLoading]);

  const loading = appLoading;
  const error = appError || actionError;

  const handleEditPage = (page: TaggedPageType) => {
    setEditingPage(page);
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingPage(null);
  };

  // 保存原始页面用于回滚
  const originalPageRef = useRef<TaggedPageType | null>(null);

  // 使用乐观更新的 mutation hook
  const { mutate: updatePageDetails, isPending: isUpdatingPage } = useUpdatePageDetails(
    editingPage,
    // 乐观更新：立即更新显示的页面列表
    useCallback((updatedPage: TaggedPageType) => {
      if (!editingPage) return;
      
      // 更新本地状态中的页面列表（只更新标题，标签在 handleSavePage 中处理）
      setOptimisticPages((prevPages) => {
        const basePages = prevPages ?? allPages;
        return basePages.map((p) =>
          p.id === editingPage.id
            ? {
                ...p,
                title: updatedPage.title,
              }
            : p
        );
      });
    }, [editingPage, allPages]),
    // 回滚：恢复原始页面
    useCallback((originalPage: TaggedPageType) => {
      setOptimisticPages((prevPages) => {
        const basePages = prevPages ?? allPages;
        return basePages.map((p) => (p.id === originalPage.id ? originalPage : p));
      });
      
      setEditingPage(originalPage);
    }, [allPages])
  );

  // 当 allPages 从 AppContext 更新时，清除乐观更新状态
  useEffect(() => {
    if (optimisticPages && !isUpdatingPage) {
      // 延迟清除，确保数据已同步
      const timer = setTimeout(() => {
        setOptimisticPages(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allPages, isUpdatingPage]);

  const handleSavePage = useCallback(
    ({ title, tagNames }: { title: string; tagNames: string[] }) => {
      if (!editingPage) return;

      // 保存原始页面用于回滚
      originalPageRef.current = { ...editingPage };

      const trimmedTitle = title.trim();
      const nextTitle = trimmedTitle.length > 0 ? trimmedTitle : editingPage.title;

      const currentTagNames = editingPage.tags
        .map((tagId) => tagIdToName.get(tagId))
        .filter(Boolean) as string[];

      const addedTags = tagNames.filter((name) => !currentTagNames.includes(name));
      const removedTags = currentTagNames.filter((name) => !tagNames.includes(name));

      // 计算新的标签 ID 列表（用于乐观更新）
      const newTagIds = tagNames.map((name) => tagNameToId.get(name)).filter(Boolean) as string[];
      
      // 乐观更新：立即更新显示的页面列表
      setOptimisticPages((prevPages) => {
        const basePages = prevPages ?? allPages;
        return basePages.map((p) =>
          p.id === editingPage.id
            ? {
                ...p,
                title: nextTitle,
                tags: newTagIds,
              }
            : p
        );
      });

      // 同时更新 editingPage 状态
      setEditingPage((prev) => {
        if (!prev || prev.id !== editingPage.id) return prev;
        return {
          ...prev,
          title: nextTitle,
          tags: newTagIds,
        };
      });

      // 使用乐观更新的 mutation
      updatePageDetails(
        {
          title: nextTitle,
          tagsToAdd: addedTags,
          tagsToRemove: removedTags,
        },
        {
          onSuccess: () => {
            setActionError(null);
            closeEditDialog();
            // 静默刷新以确保数据同步（不显示 loading）
            refreshAllData().catch(console.error);
          },
          onError: (err) => {
            console.error("更新页面失败:", err);
            const message = err instanceof Error ? err.message : "更新页面失败";
            setActionError(message);
            
            // 回滚乐观更新
            if (originalPageRef.current) {
              setOptimisticPages((prevPages) => {
                const basePages = prevPages ?? allPages;
                return basePages.map((p) => 
                  p.id === originalPageRef.current!.id ? originalPageRef.current! : p
                );
              });
              setEditingPage(originalPageRef.current);
            }
            
            // 错误时也刷新数据以恢复正确状态
            refreshAllData().catch(console.error);
          },
        }
      );
    },
    [editingPage, tagIdToName, tagNameToId, updatePageDetails, refreshAllData, allPages],
  );

  // 菜单管理已移除，改用 ContextMenu 组件内部管理

  const editingPageTagNames = useMemo(() => {
    if (!editingPage) return [];
    return editingPage.tags
      .map((tagId) => tagIdToName.get(tagId))
      .filter(Boolean) as string[];
  }, [editingPage, tagIdToName]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 保留原有 style 块，但使用 token 优化颜色和动画时间 */}
      <style>
        {`
          .hud-button {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: var(--space-1); /* 0.25rem -> 4px */
            margin: -var(--space-1);
            border-radius: var(--radius-md);
            transition: background-color var(--transition-fast) var(--ease-smooth);
          }

          .hud-button:hover {
            background-color: var(--bg-action-subtle); /* Tokenized Hover */
          }

          .hud-button:hover .stat-item-icon,
          .hud-button:hover .stat-item-value,
          .hud-button-settings:hover {
            color: var(--color-text-action) !important; /* Tokenized Color */
          }

          .hud-button-settings {
            padding: 0.375rem;
            border-radius: var(--radius-md);
            color: var(--color-text-tertiary);
            transition:
              color var(--transition-fast) var(--ease-smooth),
              transform var(--transition-fast) var(--ease-smooth),
              background-color var(--transition-fast) var(--ease-smooth);
          }

          .hud-button-settings:hover {
            transform: scale(1.1);
          }
        `}
      </style>

      <div>
        <GlassCard className="p-4">
          <div className="space-y-4">
            {/* Header - 保持原样布局 */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onOpenStats}
                title="View Activity"
                className="hud-button flex items-center gap-3"
              >
                <StatItem icon={<TrendingUp />} value={stats.streak} />
                <StatItem icon={<Bookmark />} value={visiblePages.length} />
                <StatItem icon={<TagIcon />} value={allTags.length} />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenTagLibrary}
                  title="Tag Library"
                  className="hud-button hud-button-settings"
                >
                  <TagIcon className="icon-sm" strokeWidth={2} />
                </button>
                <button
                  onClick={onOpenSettings}
                  title="Settings"
                  className="hud-button hud-button-settings"
                >
                  <Settings className="icon-sm" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Divider - Tokenized */}
            <div
              style={{
                height: "1px",
                background: "var(--border-glass-subtle)", // Tokenized
                margin: "var(--space-3) 0",
              }}
            />

            {/* Search Section - 保持原样布局 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search
                    className="icon-sm"
                    strokeWidth={1.5}
                    style={{ color: "var(--c-action)" }}
                  />
                  <span
                    style={{
                      color: "var(--color-text-module-title)", // Tokenized
                      font: "var(--font-module-title)",
                      letterSpacing: "var(--letter-spacing-module-title)",
                      textTransform: "uppercase",
                    }}
                  >
                    Search by Tags
                  </span>
                </div>

                <button
                  onClick={() => setSearchTags([])}
                  className="glass-button"
                  style={{
                    // [Refactor] 使用标准字体 Token
                    font: "var(--font-caption)",
                    letterSpacing: "var(--letter-spacing-caption)",
                    padding: "0.4em 0.9em",
                    opacity: searchTags.length > 0 ? 1 : 0,
                    visibility: searchTags.length > 0 ? "visible" : "hidden",
                    pointerEvents: searchTags.length > 0 ? "auto" : "none",
                     // [Refactor] 使用统一的物理引擎
                     transition: getTransition(DURATION.FAST),
                  }}
                  disabled={loading}
                >
                  Clear All
                </button>
              </div>

              <TagInput
                tags={searchTags}
                onTagsChange={setSearchTags}
                placeholder="Enter tags to filter pages..."
                suggestions={suggestions}
                allowCreation={false}
                disabled={loading}
              />

              <div className="flex items-center justify-between pt-1">
                <span
                  style={{
                    color: "var(--color-text-secondary)", // Tokenized
                    font: "var(--font-footnote)",
                    letterSpacing: "var(--letter-spacing-footnote)",
                  }}
                >
                  {searchTags.length > 0 ? "Filtered results" : "All pages"}
                </span>
                <div
                  className="px-2.5 py-1 rounded-lg"
                  style={{
                    color: "var(--color-text-primary)",
                    background: "var(--bg-surface-glass-hover)", // Tokenized: 16% mix
                    // [Refactor] 使用标准字体 Token
                    font: "var(--font-small)",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    border: "1px solid var(--border-glass-moderate)", // Tokenized
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {filteredPages.length}/{visiblePages.length}
                </div>
              </div>
            </div>

            {/* Divider - Tokenized */}
            <div
              style={{
                height: "1px",
                background: "var(--border-glass-subtle)",
                margin: "var(--space-3) 0",
              }}
            />

            {/* List Section */}
            <div>
              {loading ? (
                <div
                  className="text-center py-12 rounded-3xl"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Loading...
                </div>
              ) : error ? (
                <div
                  className="text-center py-12 rounded-3xl border border-dashed"
                  style={{
                    color: "var(--color-text-tertiary)",
                    borderColor: "var(--border-glass-strong)",
                  }}
                >
                  <p style={{ margin: 0 }}>加载失败：{error}</p>
                </div>
              ) : filteredPages.length > 0 ? (
                <>
                  <AnimatedFlipList
                    items={displayedPages}
                    as="div"
                    className="space-y-3"
                    renderItem={(page) => (
                      <PageCard
                        key={page.id}
                        page={page}
                        searchTags={searchTags}
                        onEditPage={handleEditPage}
                        onCopyUrl={(url) => navigator.clipboard.writeText(url).catch(console.error)}
                        onRemovePage={removePageFromView}
                        tagIdToName={tagIdToName}
                      />
                    )}
                  />
                  {/* 底部哨兵元素：用于触发懒加载 */}
                  {displayedPages.length < filteredPages.length && (
                    <div
                      ref={loadMoreRef}
                      style={{
                        height: "1px",
                        width: "100%",
                      }}
                      aria-hidden="true"
                    />
                  )}
                </>
              ) : (
                <div
                  className="text-center py-12 rounded-3xl border-2 border-dashed"
                  style={{
                    color: "var(--color-text-tertiary)",
                    borderColor: "var(--border-glass-strong)",
                  }}
                >
                  <div className="space-y-4">
                    <div className="icon-xl mx-auto rounded-3xl flex items-center justify-center" style={{ width: 'var(--icon-size-xl)', height: 'var(--icon-size-xl)' }}>
                      <Inbox
                        className="icon-lg"
                        strokeWidth={1.5}
                        style={{
                          color: "var(--color-text-quaternary)",
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p
                        style={{
                          font: "var(--font-list-item)",
                          color: "var(--color-text-tertiary)",
                          margin: 0,
                        }}
                      >
                        {searchTags.length > 0 ? "No pages found" : "No pages yet"}
                      </p>
                      <p
                        style={{
                          font: "var(--font-caption)",
                          letterSpacing: "var(--letter-spacing-caption)",
                          color: "var(--color-text-tertiary)",
                          margin: 0,
                        }}
                      >
                        {searchTags.length > 0
                          ? "Try different tags or clear your filters"
                          : "Start tagging pages to see them here"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Modals and Context Menus */}
      {editingPage && (
        <EditPageDialog
          isOpen={isEditDialogOpen}
          onClose={closeEditDialog}
          page={editingPage}
          initialTagNames={editingPageTagNames}
          onSave={handleSavePage}
          allSuggestions={suggestions}
        />
      )}

    </div>
  );
}

function PageCard({
  page,
  searchTags,
  onEditPage,
  onCopyUrl,
  onRemovePage,
  tagIdToName,
}: PageCardProps) {
  const menuItems: ContextMenuItem[] = [
    {
      label: 'Edit',
      onClick: () => onEditPage(page),
      icon: <Pencil />,
    },
    {
      label: 'Copy URL',
      onClick: () => onCopyUrl(page.url),
      icon: <Copy />,
    },
    {
      label: 'Delete',
      onClick: () => onRemovePage(page.id),
      icon: <Trash2 />,
      variant: 'destructive',
    },
  ];

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      // 长按触发编辑（与右键菜单的编辑功能一致）
      onEditPage(page);
    },
    delay: 500,
  });

  const { onMouseDown, onMouseUp, onMouseLeave, onTouchStart, onTouchEnd, onTouchCancel } =
    longPressHandlers;

  return (
    <ContextMenu menuItems={menuItems}>
      <div
        data-testid={`page-card-${page.id}`}
        className="rounded-2xl transition-all relative hover-glass"
        style={{
          // [Refactor] 这里的 color-mix (8%) 对应 --bg-surface-glass-subtle
          background: "var(--bg-surface-glass-subtle)",
          // [Refactor] 这里的 color-mix (15%) 对应 --border-glass-subtle
          border: "1px solid var(--border-glass-subtle)",
          padding: "0.8rem 1.1rem",
          cursor: "default",
        }}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >

      <div className="space-y-3.5">
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          style={{ textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            className="hover:text-[var(--c-action)] transition-colors"
            style={{
              color: "var(--color-text-primary)",
              font: "var(--font-page-title)",
              letterSpacing: "var(--letter-spacing-page-title)",
              margin: 0,
            }}
          >
            {page.title}
          </h2>
        </a>

        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0">
            <PageIcon url={page.url} />
          </div>

          <Tooltip content={page.url} delay={600} side="bottom">
            <p
              className="truncate flex-1"
              style={{
                color: "var(--color-text-secondary)",
                font: "var(--font-caption)",
                letterSpacing: "var(--letter-spacing-caption)",
                margin: 0,
              }}
            >
              {page.url}
            </p>
          </Tooltip>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {page.tags.map((tagId) => {
            const tagName = tagIdToName.get(tagId) ?? tagId;
            const isHighlighted = searchTags.includes(tagName);

            return isHighlighted ? (
              <Tag key={tagId} label={tagName} />
            ) : (
              <span
                key={tagId}
                className="inline-flex items-center px-2.5 py-1 rounded-lg"
                style={{
                  color: "var(--color-text-secondary)",
                  font: "var(--font-tag)",
                  letterSpacing: "var(--letter-spacing-tag)",
                  // [Refactor] 标签背景: 10% -> --bg-surface-glass
                  background: "var(--bg-surface-glass)",
                  // [Refactor] 标签边框: 18% -> --border-glass-moderate
                  border: "1px solid var(--border-glass-moderate)",
                     // [Refactor] 使用统一的物理引擎
                     transition: getTransition(DURATION.FAST),
                }}
              >
                {tagName}
              </span>
            );
          })}
        </div>
      </div>
    </div>
    </ContextMenu>
  );
}
