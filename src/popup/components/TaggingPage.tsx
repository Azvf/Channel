import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Plus, RefreshCw, TrendingUp } from "lucide-react";

import { queryKeys } from "../../lib/queryKeys";
import type { TaggedPage } from "../../shared/types/gameplayTag";
import { currentPageService } from "../../services/popup/currentPageService";

import { useAppContext } from "../context/AppContext";
import { useUpdatePageTitle, useUpdatePageTags } from "../hooks/mutations/usePageMutations";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { EditableTitle } from "./TaggingPage/EditableTitle";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";

import { isTitleUrl } from '@/shared/utils/titleUtils';
import { STORAGE_KEYS } from '@/services/storageService';

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

  const [currentUrl, setCurrentUrl] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const currentUrlRef = useRef<string | undefined>(undefined);
  const refreshPageRef = useRef<(() => void) | null>(null);
  const currentPageRef = useRef<TaggedPage | undefined>(undefined);

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

  // 保存 currentPage 引用，避免在 storage 监听器的依赖项中包含它
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

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

  // 监听 storage 变化，实现跨上下文的乐观更新
  // 当 background 自动更新 title 时，立即更新 React Query 缓存
  useEffect(() => {
    if (!currentUrl) {
      return;
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: chrome.storage.AreaName
    ) => {
      // 只处理 local storage 的变化
      if (areaName !== 'local') {
        return;
      }

      // 检查 PAGES 是否发生变化
      const pagesChange = changes[STORAGE_KEYS.PAGES];
      if (!pagesChange || !pagesChange.newValue) {
        return;
      }

      // 从新的 pages 数据中查找当前页面
      const allPages = pagesChange.newValue as Record<string, TaggedPage>;
      // 使用 ref 获取最新的 currentPage，避免闭包问题
      const currentPageId = currentPageRef.current?.id;
      const currentPageTitle = currentPageRef.current?.title;
      const currentUrlValue = currentUrlRef.current;
      
      if (currentPageId && allPages[currentPageId] && currentUrlValue) {
        const updatedPage = allPages[currentPageId];
        
        // 如果 title 发生了变化，乐观更新缓存
        if (updatedPage.title !== currentPageTitle) {
          queryClient.setQueryData(queryKeys.currentPage(currentUrlValue), updatedPage);
          console.log('[TaggingPage] 检测到 title 自动更新，已乐观更新缓存:', updatedPage.title);
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
    // 移除 currentPage 从依赖项中，使用 ref 来获取最新值，避免频繁重新注册监听器
  }, [currentUrl, queryClient]);

  // 当 title 是 URL 样式时，定期 refetch 以获取更新后的 title
  useEffect(() => {
    // 优化条件判断：确保有 currentUrl 且 currentPage 存在
    // 如果 currentPage 不存在但 currentUrl 存在，说明正在加载，也应该等待
    if (!currentUrl) {
      return;
    }

    // 如果 currentPage 不存在，等待它加载完成
    if (!currentPage) {
      return;
    }

    // 如果 title 不是 URL 样式，不需要 refetch
    if (!isTitleUrl(currentPage.title, currentPage.url)) {
      return;
    }

    // 如果 title 是 URL 样式，设置定时器定期 refetch（最多尝试 3 次，每次间隔 1.5 秒）
    // 增加尝试次数和间隔，给页面更多加载时间
    let attemptCount = 0;
    const maxAttempts = 3; // 最多尝试 3 次
    const interval = 1500; // 从 1 秒增加到 1.5 秒

    const refetchInterval = setInterval(() => {
      attemptCount++;
      
      // 检查当前页面的 title 是否还是 URL
      const currentPageData = queryClient.getQueryData<TaggedPage>(
        queryKeys.currentPage(currentUrl)
      );
      
      // 如果页面数据不存在，说明可能正在重新加载，继续等待
      if (!currentPageData) {
        // 如果达到最大尝试次数，停止定时器
        if (attemptCount >= maxAttempts) {
          clearInterval(refetchInterval);
          return;
        }
        // 继续等待，不触发 refetch（避免在加载过程中重复请求）
        return;
      }
      
      // 如果 title 已经更新为非 URL，停止定时器
      if (!isTitleUrl(currentPageData.title, currentPageData.url)) {
        console.log('[TaggingPage] Title 已更新为非 URL，停止 refetch:', currentPageData.title);
        clearInterval(refetchInterval);
        return;
      }

      // 如果达到最大尝试次数，停止定时器
      if (attemptCount >= maxAttempts) {
        console.log('[TaggingPage] 达到最大尝试次数，停止 refetch');
        clearInterval(refetchInterval);
        return;
      }

      // 触发 refetch
      console.log(`[TaggingPage] 触发 refetch 以获取真实 title (尝试 ${attemptCount}/${maxAttempts})`);
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

  const handleTitleSave = (newTitle: string) => {
    if (!currentPage) return;

    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== currentPage.title) {
      updateTitle(trimmed);
    }
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
  const isUrlTitle = useMemo(() => isTitleUrl(currentPage?.title, currentPage?.url), [currentPage?.title, currentPage?.url]);

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
                    /* 正常状态：显示 URL */
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

            {/* Title Section (使用新组件) */}
            <motion.div
              layout="position" // [关键] 必须有 layout="position" 才能参与流体布局
              className="relative z-20" // [关键] 提高层级，防止阴影或扩展时被遮挡
            >
              <EditableTitle
                title={currentPage?.title || ""}
                isUrl={isUrlTitle}
                isLoading={loading}
                onSave={handleTitleSave}
              />
            </motion.div>

            {/* Tag Input Section */}
            <motion.div
              layout="position" // [关键] 当上面的 Title 变高时，这个组件会自动滑下去
              className="relative z-10"
            >
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
