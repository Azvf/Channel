import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Pencil, TrendingUp, Calendar } from "lucide-react";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { currentPageService } from "../../services/popup/currentPageService";
import type { TaggedPage } from "../../types/gameplayTag";
import { useAppContext } from "../context/AppContext";
import { useCachedResource } from "../../hooks/useCachedResource";
import { useUpdatePageTitle, useUpdatePageTags } from "../hooks/mutations/usePageMutations";

interface TaggingPageProps {
  className?: string;
}

export function TaggingPage({ className = "" }: TaggingPageProps) {
  const {
    allTags,
    stats,
    loading: appLoading, // 全局 loading (通常只在 App 启动时为 true)
    error: appError,
    refreshAllData, // 添加刷新函数
  } = useAppContext();

  // [核心修改] 使用 useCachedResource 替代 useEffect + useState
  // 这里的 key 'current_page_view' 确保了数据缓存在内存中
  // 切换 Tab 回来时，会立即从内存读取，isLoading 保持为 false
  const {
    data: currentPage,
    isLoading: pageLoading,
    error: pageError,
    mutate: mutatePage,
    refresh: refreshPage,
  } = useCachedResource<TaggedPage>({
    key: 'current_page_view', 
    fetcher: () => currentPageService.getCurrentPage(),
    ttl: 5 * 60 * 1000, // 5分钟缓存，这期间切换 Tab 都是瞬时的
  });

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  // 当缓存数据更新时，同步更新标题输入框
  useEffect(() => {
    if (currentPage) {
      setTitleValue(currentPage.title);
    }
  }, [currentPage]);

  // 1. 初始化 Mutation Hooks
  const { mutate: updateTitle } = useUpdatePageTitle(currentPage, mutatePage);
  const { mutate: updateTags, isLoading: isUpdatingTags } = useUpdatePageTags(
    currentPage,
    mutatePage,
    () => {
      // 刷新全局数据
      refreshAllData();
    }
  );

  // 2. 事件处理变得极其简单
  const handleTitleChange = (newTitle: string) => {
    if (!currentPage) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || trimmedTitle === currentPage.title) {
      setTitleValue(currentPage.title);
      setEditingTitle(false);
      return;
    }

    // 之前这里需要 try-catch, loading state, revert logic...
    // 现在只需要一行：
    updateTitle(trimmedTitle);
    setEditingTitle(false);
  };

  const handleTagsChange = async (newTagNames: string[]) => {
    if (!currentPage) return;

    const currentTagNames = currentPage.tags
      .map((tagId) => allTags.find((t) => t.id === tagId)?.name)
      .filter(Boolean) as string[];

    const addedTagNames = newTagNames.filter((name) => !currentTagNames.includes(name));
    const removedTagNames = currentTagNames.filter((name) => !newTagNames.includes(name));

    const tagsToAdd = Array.from(new Set(addedTagNames.map(n => n.trim()).filter(Boolean)));
    const tagsToRemove = Array.from(new Set(removedTagNames.map(n => n.trim()).filter(Boolean)));

    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) return;

    // 标签瞬间更新，无视网络延迟
    await updateTags({ tagsToAdd, tagsToRemove });
  };

  const suggestions = useMemo(() => allTags.map((tag) => tag.name), [allTags]);

  const currentPageTagNames = useMemo(() => {
    if (!currentPage) return [];
    return currentPage.tags
      .map((tagId) => allTags.find((t) => t.id === tagId)?.name)
      .filter(Boolean) as string[];
  }, [currentPage, allTags]);

  // 只有在没有任何数据（首次加载）时才显示 loading
  const loading = (appLoading || pageLoading) && !currentPage;
  const error = appError || (pageError ? String(pageError) : null);

  return (
    <div className={className}>
      <motion.div layout>
        <GlassCard className="p-4">
          <motion.div
            layout
            transition={LAYOUT_TRANSITION}
            className="space-y-4"
            style={{ willChange: "height", overflow: "visible" }}
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

                {/* 右上角状态区域 */}
                <div className="flex items-center justify-end gap-3 ml-auto" style={{ flex: "1 1 0", minWidth: 0 }}>
                  {error ? (
                    /* 错误状态：显示重试按钮 */
                    <button
                      onClick={() => refreshPage()}
                      className="p-2 rounded-lg transition-all flex-shrink-0 hover:bg-[var(--hover-bg-glass)]"
                      title="重试"
                    >
                      <RefreshCw className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--c-action)" }} />
                    </button>
                  ) : currentPage?.url ? (
                    /* 正常状态：仅显示 URL，移除 Loading Icon 及其占位 */
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
                      }}
                      title={currentPage.url}
                    >
                      {currentPage.url}
                    </p>
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
                  autoFocus
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
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
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
                disabled={!!loading || !!error || isUpdatingTags}
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
                    <span style={{ font: "var(--font-footnote)", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                      Today:
                    </span>
                    <span style={{ font: "var(--font-footnote)", color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {stats.todayCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Current tagging streak">
                    <TrendingUp
                      className="w-3.5 h-3.5"
                      style={{ color: "color-mix(in srgb, var(--c-content) 50%, var(--c-bg))" }}
                      strokeWidth={2}
                    />
                    <span style={{ font: "var(--font-footnote)", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                      Streak:
                    </span>
                    <span style={{ font: "var(--font-footnote)", color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
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
