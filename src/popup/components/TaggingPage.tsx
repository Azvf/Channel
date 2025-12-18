import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Plus, RefreshCw, TrendingUp } from "lucide-react";

import { queryKeys } from "../../lib/queryKeys";
import type { TaggedPage } from "../../shared/types/gameplayTag";

import { useAppContext } from "../context/AppContext";
import { useUpdatePageTitle, useUpdatePageTags } from "../hooks/mutations/usePageMutations";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { EditableTitle } from "./TaggingPage/EditableTitle";
import { Card, CardContent } from "./ui/card";
import { TagInput } from "./TagInput";

import { isTitleUrl } from '@/shared/utils/titleUtils';
import { createLogger } from '@/shared/utils/logger';
import { useCurrentUrl } from '../hooks/headless/useCurrentUrl';

const logger = createLogger('TaggingPage');
import { usePageCache } from '../hooks/headless/usePageCache';
import { useDebouncedRefetch } from '../hooks/headless/useDebouncedRefetch';
import { useTitleRefetch } from '../hooks/headless/useTitleRefetch';
import { useStorageSync } from '../hooks/headless/useStorageSync';
import { useUrlSynchronization } from '../hooks/headless/useUrlSynchronization';
import { useDraftState } from '../hooks/headless/useDraftState';

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

  const queryClient = useQueryClient();
  const refreshPageRef = useRef<(() => void) | null>(null);
  const currentPageRef = useRef<TaggedPage | undefined>(undefined);
  const wasHiddenRef = useRef(false);
  const isMountedRef = useRef(true); // 跟踪组件是否已挂载

  // 使用 URL 管理 Hook
  const {
    currentUrl,
    currentUrlRef,
    setCurrentUrl,
    fetchCurrentUrl,
    isUrlMatch: isUrlMatchFn,
  } = useCurrentUrl(isMountedRef, refreshPageRef);

  // 使用页面缓存管理 Hook
  const { queryFn, mutatePage, getCachedPage } = usePageCache(currentUrlRef);

  // fetchCurrentUrl 已由 useCurrentUrl Hook 提供

  // 使用防抖 Refetch Hook
  const { debouncedRefetch } = useDebouncedRefetch(refreshPageRef, currentUrlRef, isMountedRef);

  // 初始化：首次获取 URL 和监听 popup 可见性变化
  useEffect(() => {
    // 首次获取 URL
    fetchCurrentUrl(true, false);

    // 监听 popup 可见性变化，只在从隐藏变为可见时刷新（不包括首次打开）
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) {
        return;
      }
      
      if (document.hidden) {
        wasHiddenRef.current = true;
      } else {
        if (wasHiddenRef.current && isMountedRef.current) {
          wasHiddenRef.current = false;
          fetchCurrentUrl(false, true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCurrentUrl]);

  // [核心修改] 使用 TanStack Query 替代 useCachedResource
  // 这里的 queryKey 包含了当前URL，确保不同页面有不同的缓存
  // 切换 Tab 回来时，会立即从内存读取，isPending 保持为 false
  // [优化] 实现 Stale-While-Revalidate 模式：优先从 Chrome Storage 读取，后台同步
  // queryFn 由 usePageCache Hook 提供
  const {
    data: currentPage,
    isPending: pageLoading,
    error: pageError,
    refetch: refreshPage,
  } = useQuery<TaggedPage>({
    queryKey: queryKeys.currentPage(currentUrl),
    queryFn, // 使用 usePageCache 提供的 queryFn
    enabled: !!currentUrl && isMountedRef.current, // 只有在获取到URL且组件已挂载时才执行查询
    staleTime: 30 * 1000, // 30秒内认为数据是新鲜的，直接从缓存读取，不触发网络请求
    gcTime: 5 * 60 * 1000, // 5分钟垃圾回收时间，保持缓存但允许立即刷新
    retry: (failureCount, error) => {
      // 如果是 popup 关闭导致的错误，不重试
      if (error instanceof Error && error.message.includes('Popup')) {
        return false;
      }
      // 其他错误最多重试 1 次
      return failureCount < 1;
    },
    retryOnMount: false, // 组件挂载时不自动重试
    // [SSOT] 使用 placeholderData 从缓存中读取初始数据，提升用户体验
    // 修复：验证 URL 是否匹配，避免显示错误页面的数据
    placeholderData: (previousData) => {
      // [SSOT] 如果 currentUrl 为 undefined（初始状态），不返回任何缓存数据
      // 确保只有在 URL 确定后才使用缓存
      if (!currentUrl) {
        return undefined;
      }

      // 如果缓存中有数据，验证 URL 是否匹配
      if (previousData) {
        if (isUrlMatchFn(previousData.url, currentUrl)) {
          return previousData;
        }
        // URL 不匹配，返回 undefined，显示加载状态
        logger.debug('[SSOT] placeholderData: URL 不匹配，返回 undefined', {
          cachedUrl: previousData.url,
          currentUrl,
        });
        return undefined;
      }
      // 尝试从 queryClient 中获取缓存数据
      const cachedData = getCachedPage(currentUrl);
      // 验证 URL 是否匹配
      if (cachedData && isUrlMatchFn(cachedData.url, currentUrl)) {
        return cachedData;
      }
      // URL 不匹配或缓存不存在，返回 undefined
      if (cachedData) {
        logger.debug('[SSOT] placeholderData: 缓存数据 URL 不匹配，返回 undefined', {
          cachedUrl: cachedData.url,
          currentUrl,
        });
      }
      return undefined;
    },
  });

  // 保存 refs，避免在监听器的依赖项中包含它们
  // 使用 useMemo 而不是 useEffect，减少不必要的副作用
  useMemo(() => {
    refreshPageRef.current = refreshPage;
  }, [refreshPage]);
  
  useMemo(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // 使用 URL 同步 Hook
  useUrlSynchronization({
    currentPage,
    currentUrlRef,
    setCurrentUrl,
    isMountedRef,
  });

  // debouncedRefetch 已由 useDebouncedRefetch Hook 提供

  // 当 currentUrl 变化时，使用防抖函数触发 refetch
  // 优化：useQuery 会根据 staleTime 自动处理缓存，这里只在必要时触发
  useEffect(() => {
    if (currentUrl && isMountedRef.current) {
      // 检查缓存是否存在
      const cachedData = queryClient.getQueryData<TaggedPage>(
        queryKeys.currentPage(currentUrl)
      );
      
      // 如果缓存不存在，使用防抖函数触发 refetch
      // 如果缓存存在，useQuery 会自动使用缓存（根据 staleTime）
      if (!cachedData) {
        debouncedRefetch();
      } else {
        logger.debug('currentUrl 变化: 缓存已存在，跳过 refetch，使用缓存数据');
      }
    }
    
    return () => {
      // 清理函数中不需要做任何事情，防抖函数内部会处理清理
    };
  }, [currentUrl, debouncedRefetch, queryClient]);

  // 组件卸载时清理所有异步操作
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // 清理所有 refs，避免内存泄漏
      refreshPageRef.current = null;
    };
  }, []);

  // 监听currentPage.title变化，用于定位Title变化问题
  useEffect(() => {
    if (currentPage) {
      logger.debug('[TaggingPage] currentPage.title变化:', {
        pageId: currentPage.id,
        title: currentPage.title,
        url: currentPage.url,
        isTemporary: currentPage.id.startsWith('temp_'),
      });
    }
  }, [currentPage?.title, currentPage?.id]);

  // currentPageRef 的更新已合并到上面的 useMemo 中

  // 使用 Storage 同步 Hook
  useStorageSync(currentUrl, currentPageRef, currentUrlRef, setCurrentUrl, isMountedRef);

  // 使用 Title Refetch Hook
  useTitleRefetch(currentPage, currentUrl, refreshPage, isMountedRef);

  // --- Draft 状态管理 ---
  // 标题编辑草稿
  const {
    value: draftTitle,
    setValue: setDraftTitle,
    isRestored: isTitleRestored,
    isDirty: isTitleDirty,
  } = useDraftState({
    key: `draft.view_page.${currentUrl}.title`,
    initialValue: currentPage?.title || "",
    enable: !!currentUrl,
    debounceMs: 300,
  });

  // 标签输入草稿
  const {
    value: tagInputValue,
    setValue: setTagInputValue,
  } = useDraftState({
    key: `draft.view_page.${currentUrl}.tag_input`,
    initialValue: "",
    enable: !!currentUrl,
  });


  // Server 数据同步逻辑：当 Server 数据更新且未恢复草稿且用户未修改时，同步 Draft
  useEffect(() => {
    // 只有当：
    // 1. Server 数据存在
    // 2. Draft 没有从 Storage 恢复（说明是全新的）
    // 3. 用户还没有修改过 Draft（关键！防止覆盖用户输入）
    if (currentPage?.title && !isTitleRestored && !isTitleDirty) {
      setDraftTitle(currentPage.title);
    }
  }, [currentPage?.title, isTitleRestored, isTitleDirty, setDraftTitle]);

  // 1. 初始化 Mutation Hooks
  const { mutate: updateTitle } = useUpdatePageTitle(currentPage ?? null, mutatePage);
  const { mutate: updateTags, isPending: isUpdatingTags } = useUpdatePageTags(
    currentPage ?? null,
    mutatePage,
    (newPage) => {
      // 刷新全局数据
      refreshAllData();
      // 如果页面被删除（newPage 为 null），清空当前页面状态
      if (newPage === null) {
        mutatePage(null);
        // 重新获取当前 URL，可能会获取到新的页面或返回 undefined
        fetchCurrentUrl(false, false).catch(console.error);
      }
    },
    () => {
      // 页面被删除时的乐观更新回调
      // 立即清空当前页面状态
      mutatePage(null);
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
    
    // 标签添加成功后，清除输入草稿（可选：根据 UX 需求决定是否保留）
    // 这里选择清除，因为标签已经添加成功，输入框应该清空
    if (tagsToAdd.length > 0) {
      setTagInputValue("");
    }
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
        <Card className="p-4">
          <CardContent className="p-0">
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
                draftValue={draftTitle}
                onDraftChange={setDraftTitle}
                isRestored={isTitleRestored}
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
                inputValue={tagInputValue}
                onInputValueChange={setTagInputValue}
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
                    <span style={{ 
                      font: "var(--font-footnote)", 
                      letterSpacing: "var(--letter-spacing-footnote)",
                      color: "var(--color-text-secondary)" 
                    }}>
                      Today:
                    </span>
                    <span style={{ 
                      font: "var(--font-tag)", 
                      letterSpacing: "var(--letter-spacing-tag)",
                      color: "var(--color-text-primary)", 
                      fontVariantNumeric: "tabular-nums" 
                    }}>
                      {stats.todayCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Current tagging streak">
                    <TrendingUp
                      className="icon-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                      strokeWidth={2}
                    />
                    <span style={{ 
                      font: "var(--font-footnote)", 
                      letterSpacing: "var(--letter-spacing-footnote)",
                      color: "var(--color-text-secondary)" 
                    }}>
                      Streak:
                    </span>
                    <span style={{ 
                      font: "var(--font-tag)", 
                      letterSpacing: "var(--letter-spacing-tag)",
                      color: "var(--color-text-primary)", 
                      fontVariantNumeric: "tabular-nums" 
                    }}>
                      {stats.streak} days
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
