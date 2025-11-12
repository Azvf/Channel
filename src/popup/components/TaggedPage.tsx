import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Tag } from "./Tag";
import { PageIcon } from "./PageIcon";
import { EditPageDialog } from "./EditPageDialog";
import {
  Search,
  Inbox,
  MoreHorizontal,
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
import { currentPageService } from "../../services/popup/currentPageService";
import { TaggedPage as TaggedPageType } from "../../types/gameplayTag";
import { useAppContext } from "../context/AppContext";

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
      className: "w-3 h-3 stat-item-icon",
      strokeWidth: 2,
      style: {
        color: "color-mix(in srgb, var(--c-content) 50%, var(--c-bg))",
        transition: "color 0.2s var(--ease-smooth)",
      },
    })}
    <span
      className="stat-item-value"
      style={{
        font: "var(--font-tag)",
        letterSpacing: "var(--letter-spacing-tag)",
        color: "color-mix(in srgb, var(--c-content) 70%, var(--c-bg))",
        transition: "color 0.2s var(--ease-smooth)",
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
  onMenuButtonClick: (e: React.MouseEvent, page: TaggedPageType) => void;
  registerMenuButton: (pageId: string, button: HTMLButtonElement | null) => void;
  openMenuFromButtonRef: (pageId: string) => void;
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

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
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

  const visiblePages = useMemo(
    () => allPages.filter((page) => !removedPageIds.has(page.id)),
    [allPages, removedPageIds],
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

  const handleSavePage = useCallback(
    async ({ title, tagNames }: { title: string; tagNames: string[] }) => {
      if (!editingPage) return;

      const trimmedTitle = title.trim();
      const nextTitle = trimmedTitle.length > 0 ? trimmedTitle : editingPage.title;

      const currentTagNames = editingPage.tags
        .map((tagId) => tagIdToName.get(tagId))
        .filter(Boolean) as string[];

      const addedTags = tagNames.filter((name) => !currentTagNames.includes(name));
      const removedTags = currentTagNames.filter((name) => !tagNames.includes(name));

      try {
        await currentPageService.updatePageDetails(editingPage.id, {
          title: nextTitle,
          tagsToAdd: addedTags,
          tagsToRemove: removedTags,
        });

        await refreshAllData();
        setActionError(null);
        closeEditDialog();
      } catch (err) {
        console.error("更新页面失败:", err);
        const message = err instanceof Error ? err.message : "更新页面失败";
        setActionError(message);
        await refreshAllData();
      }
    },
    [editingPage, refreshAllData, tagIdToName, closeEditDialog],
  );

  const registerMenuButton = (pageId: string, button: HTMLButtonElement | null) => {
    if (button) {
      menuButtonRefs.current.set(pageId, button);
    } else {
      menuButtonRefs.current.delete(pageId);
    }
  };

  const openMenuAtRect = (rect: DOMRect, pageId: string) => {
    setMenuPosition({
      x: rect.right - 150,
      y: rect.bottom + 8,
    });
    setOpenMenuId(pageId);
  };

  const handleOpenMenu = (e: React.MouseEvent, page: TaggedPageType) => {
    e.stopPropagation();
    const button = e.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    openMenuAtRect(rect, page.id);
  };

  const openMenuFromButtonRef = (pageId: string) => {
    const button = menuButtonRefs.current.get(pageId);
    if (!button) return;
    const rect = button.getBoundingClientRect();
    openMenuAtRect(rect, pageId);
  };

  const handleCloseMenu = () => {
    setOpenMenuId(null);
  };

  useEffect(() => {
    if (openMenuId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuElement = document.querySelector("[data-menu-id]");
      const buttonElement = menuButtonRefs.current.get(openMenuId);

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
  }, [openMenuId]);

  const editingPageTagNames = useMemo(() => {
    if (!editingPage) return [];
    return editingPage.tags
      .map((tagId) => tagIdToName.get(tagId))
      .filter(Boolean) as string[];
  }, [editingPage, tagIdToName]);

  return (
    <div className={`space-y-4 ${className}`}>
      <style>
        {`
          .hud-button {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0.25rem;
            margin: -0.25rem;
            border-radius: 0.5rem;
            transition: background-color 0.2s var(--ease-smooth);
          }

          .hud-button:hover {
            background-color: var(--hover-bg-action);
          }

          .hud-button:hover .stat-item-icon,
          .hud-button:hover .stat-item-value,
          .hud-button-settings:hover {
            color: var(--hover-color-action) !important;
          }

          .hud-button-settings {
            padding: 0.375rem;
            border-radius: 0.5rem;
            color: color-mix(in srgb, var(--c-content) 65%, var(--c-bg));
            transition:
              color 0.2s var(--ease-smooth),
              transform 0.2s var(--ease-smooth),
              background-color 0.2s var(--ease-smooth);
          }

          .hud-button-settings:hover {
            transform: scale(1.1);
          }
        `}
      </style>

      <div>
        <GlassCard className="p-4">
          <div className="space-y-4">
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
                  <TagIcon className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={onOpenSettings}
                  title="Settings"
                  className="hud-button hud-button-settings"
                >
                  <Settings className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                background: "color-mix(in srgb, var(--c-glass) 20%, transparent)",
                margin: "0.75rem 0",
              }}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search
                    className="w-3.5 h-3.5"
                    strokeWidth={1.5}
                    style={{ color: "var(--c-action)" }}
                  />
                  <span
                    style={{
                      color: "var(--color-text-module-title)",
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
                    fontSize: "0.8rem",
                    padding: "0.4em 0.9em",
                    opacity: searchTags.length > 0 ? 1 : 0,
                    visibility: searchTags.length > 0 ? "visible" : "hidden",
                    pointerEvents: searchTags.length > 0 ? "auto" : "none",
                    transition: "opacity 200ms ease, visibility 200ms ease",
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
                    color: "var(--color-text-secondary)",
                    font: "var(--font-footnote)",
                    letterSpacing: "var(--letter-spacing-footnote)",
                  }}
                >
                  {searchTags.length > 0 ? "Filtered results" : "All pages"}
                </span>
                <div
                  className="px-2.5 py-1 rounded-lg"
                  style={{
                    color: "var(--c-content)",
                    background: "color-mix(in srgb, var(--c-glass) 16%, transparent)",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    border: "1px solid color-mix(in srgb, var(--c-glass) 24%, transparent)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {filteredPages.length}/{visiblePages.length}
                </div>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                background: "color-mix(in srgb, var(--c-glass) 20%, transparent)",
                margin: "0.75rem 0",
              }}
            />

            <div>
              {loading ? (
                <div
                  className="text-center py-12 rounded-3xl"
                  style={{ color: "color-mix(in srgb, var(--c-content) 55%, var(--c-bg))" }}
                >
                  Loading...
                </div>
              ) : error ? (
                <div
                  className="text-center py-12 rounded-3xl border border-dashed"
                  style={{
                    color: "color-mix(in srgb, var(--c-content) 60%, var(--c-bg))",
                    borderColor: "color-mix(in srgb, var(--c-glass) 30%, transparent)",
                  }}
                >
                  <p style={{ margin: 0 }}>加载失败：{error}</p>
                </div>
              ) : filteredPages.length > 0 ? (
                <AnimatedFlipList
                  items={filteredPages}
                  as="div"
                  className="space-y-3"
                  renderItem={(page) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      searchTags={searchTags}
                      onMenuButtonClick={handleOpenMenu}
                      registerMenuButton={registerMenuButton}
                      openMenuFromButtonRef={openMenuFromButtonRef}
                      tagIdToName={tagIdToName}
                    />
                  )}
                />
              ) : (
                <div
                  className="text-center py-12 rounded-3xl border-2 border-dashed"
                  style={{
                    color: "color-mix(in srgb, var(--c-content) 40%, var(--c-bg))",
                    borderColor: "color-mix(in srgb, var(--c-glass) 30%, transparent)",
                  }}
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center">
                      <Inbox
                        className="w-8 h-8"
                        strokeWidth={1.5}
                        style={{
                          color: "color-mix(in srgb, var(--c-content) 35%, var(--c-bg))",
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

      {createPortal(
        <AnimatePresence>
          {openMenuId !== null && (() => {
            const page = visiblePages.find((p) => p.id === openMenuId);
            if (!page) return null;

            return (
              <div
                className="fixed inset-0"
                style={{ zIndex: "var(--z-context-menu-layer)" }}
                onClick={handleCloseMenu}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed liquidGlass-wrapper"
                  data-menu-id={openMenuId}
                  style={{
                    zIndex: "calc(var(--z-context-menu-layer) + 1)",
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
                            handleEditPage(page);
                            handleCloseMenu();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all hover-action"
                          style={{
                            color: "var(--c-content)",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            background: "transparent",
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(page.url).catch(console.error);
                            handleCloseMenu();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all hover-action"
                          style={{
                            color: "var(--c-content)",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            background: "transparent",
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            removePageFromView(page.id);
                            handleCloseMenu();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all hover-destructive"
                          style={{
                            color: "color-mix(in srgb, var(--c-content) 60%, transparent)",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            background: "transparent",
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function PageCard({
  page,
  searchTags,
  onMenuButtonClick,
  registerMenuButton,
  openMenuFromButtonRef,
  tagIdToName,
}: PageCardProps) {
  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      e.preventDefault();
      openMenuFromButtonRef(page.id);
    },
    delay: 500,
  });

  const { onMouseDown, onMouseUp, onMouseLeave, onTouchStart, onTouchEnd, onTouchCancel } =
    longPressHandlers;

  return (
    <div
      data-testid={`page-card-${page.id}`}
      className="rounded-2xl transition-all relative hover-glass"
      style={{
        background: "color-mix(in srgb, var(--c-glass) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--c-glass) 15%, transparent)",
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
      <div
        className="absolute top-0 right-0 group/more"
        style={{
          width: "120px",
          height: "80px",
          pointerEvents: "none",
        }}
      >
        <button
          aria-label="更多操作"
          ref={(button) => registerMenuButton(page.id, button)}
          onClick={(e) => onMenuButtonClick(e, page)}
          className="absolute top-3 right-3 rounded-xl p-2.5 opacity-0
                     group-hover/more:opacity-100 transition-all
                     hover-action"
          style={{
            background: "color-mix(in srgb, var(--c-glass) 18%, transparent)",
            backdropFilter: "blur(8px)",
            border: "1.5px solid color-mix(in srgb, var(--c-glass) 28%, transparent)",
            color: "color-mix(in srgb, var(--c-content) 65%, var(--c-bg))",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

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
                  background: "color-mix(in srgb, var(--c-glass) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--c-glass) 18%, transparent)",
                  transition: "all 200ms ease",
                }}
              >
                {tagName}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
