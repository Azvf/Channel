import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Pencil, TrendingUp, Calendar } from "lucide-react";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { currentPageService } from "../../services/popup/currentPageService";
import type { TaggedPage } from "../../types/gameplayTag";
import { useAppContext } from "../context/AppContext";

interface TaggingPageProps {
  className?: string;
}

export function TaggingPage({ className = "" }: TaggingPageProps) {
  const {
    allTags,
    stats,
    loading: appLoading,
    error: appError,
    refreshAllData,
  } = useAppContext();

  const [currentPage, setCurrentPage] = useState<TaggedPage | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      setPageLoading(true);
      setPageError(null);
      try {
        const page = await currentPageService.getCurrentPage();
        if (!isMounted) return;
        setCurrentPage(page);
        setTitleValue(page.title);
        setEditingTitle(false);
      } catch (error) {
        if (!isMounted) return;
        console.error("加载当前页面失败:", error);
        const message = error instanceof Error ? error.message : "获取当前页面失败";
        setPageError(message);
        setCurrentPage(null);
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    };

    loadPageData().catch((error) => {
      console.error("初始化当前页面失败:", error);
      if (!isMounted) return;
      const message = error instanceof Error ? error.message : "获取当前页面失败";
      setPageError(message);
      setPageLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadCurrentPage = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
      setPageError(null);
    }

    try {
      const page = await currentPageService.getCurrentPage();
      setCurrentPage(page);
      setTitleValue(page.title);
      setEditingTitle(false);
      if (isManualRefresh) {
        await refreshAllData();
      }
      setPageError(null);
    } catch (error) {
      console.error("获取当前页面失败:", error);
      const message = error instanceof Error ? error.message : "获取当前页面失败";
      setPageError(message);
      setCurrentPage(null);
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!currentPage) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setTitleValue(currentPage.title);
      setEditingTitle(false);
      return;
    }

    try {
      await currentPageService.updatePageTitle(currentPage.id, trimmedTitle);
      setTitleValue(trimmedTitle);
      const page = await currentPageService.getCurrentPage();
      setCurrentPage(page);
      setPageError(null);
    } catch (error) {
      console.error("更新标题失败:", error);
      setTitleValue(currentPage.title);
      const message = error instanceof Error ? error.message : "更新标题失败";
      setPageError(message);
    } finally {
      setEditingTitle(false);
    }
  };

  const handleTagsChange = async (newTagNames: string[]) => {
    if (!currentPage) return;

    const currentTagNames = currentPage.tags
      .map((tagId) => allTags.find((t) => t.id === tagId)?.name)
      .filter(Boolean) as string[];

    const addedTagNames = newTagNames.filter((name) => !currentTagNames.includes(name));
    const removedTagNames = currentTagNames.filter((name) => !newTagNames.includes(name));

    const tagsToAdd = Array.from(
      new Set(
        addedTagNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0),
      ),
    );

    const tagsToRemove = Array.from(
      new Set(
        removedTagNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0),
      ),
    );

    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      return;
    }

    setIsRefreshing(true);

    try {
      const { newPage } = await currentPageService.updatePageTags(currentPage.id, {
        tagsToAdd,
        tagsToRemove,
      });

      setCurrentPage(newPage);
      setTitleValue(newPage.title);
      setPageError(null);
      await refreshAllData();
    } catch (error) {
      console.error("批量更新标签失败:", error);
      const message = error instanceof Error ? error.message : "更新标签失败";
      setPageError(message);
      try {
        await refreshAllData();
        const page = await currentPageService.getCurrentPage();
        setCurrentPage(page);
      } catch (err) {
        console.error("刷新数据失败:", err);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const suggestions = useMemo(() => allTags.map((tag) => tag.name), [allTags]);

  const currentPageTagNames = useMemo(() => {
    if (!currentPage) return [];
    return currentPage.tags
      .map((tagId) => allTags.find((t) => t.id === tagId)?.name)
      .filter(Boolean) as string[];
  }, [currentPage, allTags]);

  const loading = appLoading || pageLoading;
  const error = appError || pageError;

  return (
    <div className={className}>
      <motion.div layout>
        <GlassCard className="p-4">
          <motion.div
            layout
            transition={LAYOUT_TRANSITION}
            className="space-y-4"
            style={{
              willChange: "height",
              overflow: "visible",
            }}
          >
            <motion.div layout="position">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--c-action)" }} />
                  <span
                    style={{
                      color: "var(--color-text-module-title)",
                      font: "var(--font-module-title)",
                      letterSpacing: "var(--letter-spacing-module-title)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Add Tags
                  </span>
                </div>

                <div
                  className="flex items-center justify-end gap-3 ml-auto"
                  style={{ flex: "1 1 0", minWidth: 0 }}
                >
                  {error ? (
                    <button
                      onClick={() => loadCurrentPage(true)}
                      disabled={loading || isRefreshing}
                      className="p-2 rounded-lg transition-all flex-shrink-0"
                      style={{
                        background: "color-mix(in srgb, var(--c-glass) 15%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)",
                        opacity: 1,
                        pointerEvents: "auto",
                        transition: "opacity 150ms var(--ease-smooth)",
                      }}
                      title="刷新"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                        strokeWidth={1.5}
                        style={{ color: "var(--c-action)" }}
                      />
                    </button>
                  ) : currentPage?.url ? (
                    <div className="flex items-center justify-end gap-2" style={{ minWidth: 0 }}>
                      <RefreshCw
                        className="w-4 h-4 animate-spin"
                        strokeWidth={1.5}
                        style={{
                          color: "var(--c-action)",
                          flexShrink: 0,
                          opacity: isRefreshing ? 1 : 0,
                          transition: "opacity 150ms var(--ease-smooth)",
                          pointerEvents: "none",
                        }}
                      />

                      <p
                        style={{
                          color: "var(--color-text-secondary)",
                          font: "var(--font-caption)",
                          letterSpacing: "var(--letter-spacing-caption)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          margin: 0,
                          minWidth: 0,
                          flexShrink: 1,
                          textAlign: "right",
                        } as CSSProperties}
                        title={currentPage.url}
                      >
                        {currentPage.url}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>

            <motion.div layout="position">
              {editingTitle ? (
                <textarea
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleTitleChange(titleValue);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setTitleValue(currentPage?.title || "");
                      setEditingTitle(false);
                    }
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    color: "var(--color-text-primary)",
                    font: "var(--font-page-title)",
                    letterSpacing: "var(--letter-spacing-page-title)",
                    lineHeight: 1.35,
                    maxHeight: "3.47rem",
                    minHeight: "1.985rem",
                    padding: "0.25rem 0",
                    overflow: "auto",
                    background: "transparent",
                    border: "none",
                    borderRadius: "0.5rem",
                    outline: "none",
                    resize: "none",
                    margin: 0,
                    boxShadow: "none",
                    boxSizing: "border-box",
                  }}
                  onBlur={() => handleTitleChange(titleValue)}
                  ref={(node) => {
                    if (node && editingTitle && document.activeElement !== node) {
                      node.focus();
                      node.setSelectionRange(0, 0);
                      node.scrollTop = 0;
                      node.scrollLeft = 0;
                    }
                  }}
                />
              ) : (
                <div
                  className="group relative"
                  style={{
                    maxHeight: "3.47rem",
                    minHeight: "1.985rem",
                    width: "100%",
                    padding: "0.25rem 0",
                    boxSizing: "border-box",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "flex-start",
                    cursor: loading || error || !currentPage ? "default" : "text",
                    transition: "background-color 0.2s var(--ease-smooth)",
                  }}
                  onClick={() => {
                    if (!loading && !error && currentPage) {
                      setEditingTitle(true);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !error && currentPage) {
                      e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--c-glass) 10%, transparent)";
                      e.currentTarget.style.setProperty("--pseudo-display", "none");
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.removeProperty("--pseudo-display");
                  }}
                >
                  <h2
                    style={{
                      color: "var(--color-text-primary)",
                      font: "var(--font-page-title)",
                      letterSpacing: "var(--letter-spacing-page-title)",
                      lineHeight: 1.35,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as any,
                      wordBreak: "break-word",
                      margin: 0,
                      width: "100%",
                      flex: "1 1 100%",
                      minWidth: 0,
                    }}
                    title={currentPage ? "点击编辑标题" : undefined}
                  >
                    {loading
                      ? "Loading..."
                      : error
                        ? `Error: ${error}`
                        : currentPage?.title || "No page loaded"}
                  </h2>

                  {!loading && !error && currentPage && (
                    <div
                      className="absolute right-1 top-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        top: "calc(0.25rem + 2px)",
                        right: "4px",
                        color: "color-mix(in srgb, var(--c-content) 60%, transparent)",
                        pointerEvents: "none",
                      }}
                    >
                      <Pencil className="w-3 h-3" strokeWidth={2} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <motion.div layout="position">
              <TagInput
                tags={currentPageTagNames}
                onTagsChange={handleTagsChange}
                mode="list"
                placeholder="Enter a tag..."
                suggestions={suggestions}
                excludeTags={currentPageTagNames}
                autoFocus={true}
                disabled={loading || !!error}
              />
            </motion.div>

            {!loading && !error && currentPage && (
              <motion.div layout="position">
                <div
                  className="flex items-center justify-between gap-4 pt-3 mt-2"
                  style={{
                    borderTop: "1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-1.5" title="Today's tagged items">
                    <Calendar
                      className="w-3.5 h-3.5"
                      style={{ color: "color-mix(in srgb, var(--c-content) 50%, var(--c-bg))" }}
                      strokeWidth={2}
                    />
                    <span
                      style={{
                        font: "var(--font-footnote)",
                        color: "var(--color-text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      Today:
                    </span>
                    <span
                      style={{
                        font: "var(--font-footnote)",
                        color: "var(--color-text-primary)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {stats.todayCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Current tagging streak">
                    <TrendingUp
                      className="w-3.5 h-3.5"
                      style={{ color: "color-mix(in srgb, var(--c-content) 50%, var(--c-bg))" }}
                      strokeWidth={2}
                    />
                    <span
                      style={{
                        font: "var(--font-footnote)",
                        color: "var(--color-text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      Streak:
                    </span>
                    <span
                      style={{
                        font: "var(--font-footnote)",
                        color: "var(--color-text-primary)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {stats.streak} days
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

