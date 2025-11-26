import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Pencil, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { currentPageService } from "../../services/popup/currentPageService";
import type { TaggedPage } from "../../shared/types/gameplayTag";
import { useAppContext } from "../context/AppContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryKeys";
import { useUpdatePageTitle, useUpdatePageTags } from "../hooks/mutations/usePageMutations";

/**
 * 检测 title 是否为 URL 样式
 */
function isTitleUrl(title: string | undefined): boolean {
  if (!title) return false;
  return title.startsWith('http://') || title.startsWith('https://');
}

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

  // [修复] 获取当前活动标签页的URL，用于区分不同页面的缓存
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const currentUrlRef = useRef<string | undefined>(undefined);
  const refreshPageRef = useRef<(() => void) | null>(null);

  // 获取当前活动标签页的URL（优化：确保获取最新URL）
  useEffect(() => {
    const fetchCurrentUrl = async (forceRefresh = false) => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0 && tabs[0].url && !tabs[0].url.startsWith('about:')) {
          const url = tabs[0].url;
          const oldUrl = currentUrlRef.current;
          
          // 如果URL发生变化，清除旧缓存
          if (oldUrl && url !== oldUrl) {
            queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
          }
          
          // 更新URL引用和状态
          const urlChanged = url !== currentUrlRef.current;
          currentUrlRef.current = url;
          
          // 只有在URL变化或强制刷新时才更新状态
          if (urlChanged || forceRefresh) {
            setCurrentUrl(url);
            
            // URL变化后立即触发重新获取数据
            if (urlChanged && refreshPageRef.current) {
              // 使用 setTimeout 确保 queryKey 已经更新
              setTimeout(() => {
                refreshPageRef.current?.();
              }, 0);
            }
          }
        }
      } catch (error) {
        console.error('获取当前标签页URL失败:', error);
      }
    };

    // 组件挂载时立即获取URL
    fetchCurrentUrl(true);

    // 监听标签页URL变化
    const handleTabUpdate = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // 只处理当前活动标签页的URL变化
      if (changeInfo.url && tab.active && tab.url && !tab.url.startsWith('about:')) {
        const newUrl = tab.url;
        const oldUrl = currentUrlRef.current;
        
        // 如果URL发生变化，清除旧缓存并更新URL
        if (oldUrl && newUrl !== oldUrl) {
          queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
        }
        
        // 更新URL引用和状态
        const urlChanged = newUrl !== currentUrlRef.current;
        currentUrlRef.current = newUrl;
        
        if (urlChanged) {
          setCurrentUrl(newUrl);
          
          // URL变化后立即触发重新获取数据
          if (refreshPageRef.current) {
            // 使用 setTimeout 确保 queryKey 已经更新
            setTimeout(() => {
              refreshPageRef.current?.();
            }, 0);
          }
        }
      }
    };

    // 监听标签页激活事件（切换标签页时）
    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && !tab.url.startsWith('about:')) {
          const newUrl = tab.url;
          const oldUrl = currentUrlRef.current;
          
          // 如果URL发生变化，清除旧缓存并更新URL
          if (oldUrl && newUrl !== oldUrl) {
            queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
          }
          
          // 更新URL引用和状态
          const urlChanged = newUrl !== currentUrlRef.current;
          currentUrlRef.current = newUrl;
          
          if (urlChanged) {
            setCurrentUrl(newUrl);
            
            // URL变化后立即触发重新获取数据
            if (refreshPageRef.current) {
              // 使用 setTimeout 确保 queryKey 已经更新
              setTimeout(() => {
                refreshPageRef.current?.();
              }, 0);
            }
          }
        }
      } catch (error) {
        console.error('获取激活标签页URL失败:', error);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, [queryClient]);

  // 监听 popup 可见性变化，确保 popup 重新打开时刷新数据
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // 当 popup 变为可见时（重新打开），刷新当前URL和数据
      if (!document.hidden) {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs && tabs.length > 0 && tabs[0].url && !tabs[0].url.startsWith('about:')) {
            const url = tabs[0].url;
            const oldUrl = currentUrlRef.current;
            
            // 如果URL发生变化，清除旧缓存
            if (oldUrl && url !== oldUrl) {
              queryClient.removeQueries({ queryKey: queryKeys.currentPage(oldUrl) });
            }
            
            // 更新URL引用和状态
            const urlChanged = url !== currentUrlRef.current;
            currentUrlRef.current = url;
            
            if (urlChanged) {
              setCurrentUrl(url);
              
              // 立即触发重新获取数据
              if (refreshPageRef.current) {
                setTimeout(() => {
                  refreshPageRef.current?.();
                }, 0);
              }
            } else if (refreshPageRef.current) {
              // 即使URL没变，也刷新数据以确保显示最新信息
              refreshPageRef.current();
            }
          }
        } catch (error) {
          console.error('刷新当前标签页URL失败:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 组件挂载时也执行一次检查（处理首次打开的情况）
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  // [核心修改] 使用 TanStack Query 替代 useCachedResource
  // 这里的 queryKey 包含了当前URL，确保不同页面有不同的缓存
  // 切换 Tab 回来时，会立即从内存读取，isPending 保持为 false
  const {
    data: currentPage,
    isPending: pageLoading,
    error: pageError,
    refetch: refreshPage,
  } = useQuery<TaggedPage>({
    queryKey: queryKeys.currentPage(currentUrl),
    queryFn: () => currentPageService.getCurrentPage(),
    enabled: !!currentUrl, // 只有在获取到URL后才执行查询
    staleTime: 0, // 设置为0，确保每次URL变化时都重新获取最新数据
    gcTime: 5 * 60 * 1000, // 5分钟垃圾回收时间，保持缓存但允许立即刷新
  });

  // 保存 refetch 函数引用，供 URL 变化时使用
  useEffect(() => {
    refreshPageRef.current = refreshPage;
  }, [refreshPage]);

  // 当 currentUrl 变化时，确保立即重新获取数据
  useEffect(() => {
    if (currentUrl && refreshPageRef.current) {
      // 使用 setTimeout 确保 queryKey 已经更新到新的 URL
      const timeoutId = setTimeout(() => {
        refreshPageRef.current?.();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentUrl]);

  // 兼容性：提供 mutate 方法用于乐观更新
  const mutatePage = (newPage: TaggedPage) => {
    queryClient.setQueryData(queryKeys.currentPage(currentUrl), newPage);
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  // 当缓存数据更新时，同步更新标题输入框
  useEffect(() => {
    if (currentPage) {
      setTitleValue(currentPage.title);
    }
  }, [currentPage]);

  // 当 title 是 URL 样式时，定期 refetch 以获取更新后的 title
  useEffect(() => {
    if (!currentPage || !currentUrl || !isTitleUrl(currentPage.title)) {
      return;
    }

    // 如果 title 是 URL 样式，设置定时器定期 refetch（最多尝试 5 次，每次间隔 1 秒）
    let attemptCount = 0;
    const maxAttempts = 5;
    const interval = 1000; // 1 秒

    const refetchInterval = setInterval(() => {
      attemptCount++;
      
      // 检查当前页面的 title 是否还是 URL
      const currentPageData = queryClient.getQueryData<TaggedPage>(
        queryKeys.currentPage(currentUrl)
      );
      
      if (currentPageData && !isTitleUrl(currentPageData.title)) {
        // title 已经更新，停止定时器
        clearInterval(refetchInterval);
        return;
      }

      // 如果达到最大尝试次数，停止定时器
      if (attemptCount >= maxAttempts) {
        clearInterval(refetchInterval);
        return;
      }

      // 触发 refetch
      refreshPage();
    }, interval);

    return () => {
      clearInterval(refetchInterval);
    };
  }, [currentPage, currentUrl, queryClient, refreshPage]);

  // 1. 初始化 Mutation Hooks
  const { mutate: updateTitle } = useUpdatePageTitle(currentPage ?? null, mutatePage);
  const { mutate: updateTags, isPending: isUpdatingTags } = useUpdatePageTags(
    currentPage ?? null,
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
                  <Plus className="icon-sm" strokeWidth={1.5} style={{ color: "var(--c-action)" }} />
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
                      <RefreshCw className="icon-base" strokeWidth={1.5} style={{ color: "var(--c-action)" }} />
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
                      e.currentTarget.style.backgroundColor = "var(--bg-surface-glass-hover)";
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
                    {loading ? (
                      "Loading..."
                    ) : error ? (
                      `Error: ${error}`
                    ) : currentPage ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{currentPage.title || "No page loaded"}</span>
                        {isTitleUrl(currentPage.title) && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            style={{ display: 'inline-flex' }}
                          >
                            <Loader2 
                              className="icon-xs" 
                              style={{ 
                                color: "var(--color-text-tertiary)"
                              }} 
                            />
                          </motion.div>
                        )}
                      </span>
                    ) : (
                      "No page loaded"
                    )}
                  </h2>

                  {!loading && !error && currentPage && (
                    <div
                      className="absolute right-1 top-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        top: "calc(0.25rem + 2px)",
                        right: "4px",
                        color: "var(--color-text-tertiary)",
                        pointerEvents: "none",
                      }}
                    >
                      <Pencil className="icon-xs" strokeWidth={2} />
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
                    borderTop: "1px solid var(--border-glass-subtle)",
                  }}
                >
                  <div className="flex items-center gap-1.5" title="Today's tagged items">
                    <Calendar
                      className="icon-sm"
                      style={{ color: "var(--color-text-secondary)" }}
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
                      className="icon-sm"
                      style={{ color: "var(--color-text-secondary)" }}
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
