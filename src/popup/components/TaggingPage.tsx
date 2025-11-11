import { useState, useEffect, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Plus, RefreshCw, Pencil, TrendingUp, Calendar } from "lucide-react";
import { TaggedPage, GameplayTag } from "../../types/gameplayTag";
import { currentPageService } from "../../services/popup/currentPageService";

interface TaggingPageProps {
  className?: string;
}

interface UserStats {
  todayCount: number;
  streak: number;
}

export function TaggingPage({ className = "" }: TaggingPageProps) {
  const [currentPage, setCurrentPage] = useState<TaggedPage | null>(null);
  const [allTags, setAllTags] = useState<GameplayTag[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [stats, setStats] = useState<UserStats>({ todayCount: 0, streak: 0 });

  useEffect(() => {
    // 统一加载所有初始数据
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // [修复] 步骤 1: 必须先单独 await 页面。
        // 这是一个“写”操作，它需要先完成，以确保页面被注册。
        const page = await currentPageService.getCurrentPage();

        // [修复] 步骤 2: 在页面注册成功后，再并行获取所有“读”操作。
        // 这解决了竞态条件，确保 getUserStats() 能读到最新的页面数据。
        const [tags, userStats] = await Promise.all([
          currentPageService.getAllTags(),
          currentPageService.getUserStats()
        ]);
        
        // 步骤 3: 安全地设置所有状态
        setCurrentPage(page);
        setTitleValue(page.title);
        setAllTags(tags);
        setSuggestions(tags.map(tag => tag.name));
        setStats(userStats); 
        
        setEditingTitle(false);
        setError(null);
      } catch (error) {
        // 捕获来自 getCurrentPage 或 Promise.all 的任何错误
        console.error('加载数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : '获取数据失败';
        setError(errorMessage);
        setCurrentPage(null);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []); // 仅在挂载时运行

  // [新增] 2. 创建一个单独的函数来加载页面（用于刷新）
  const loadCurrentPage = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const page = await currentPageService.getCurrentPage();
      setCurrentPage(page);
      setTitleValue(page.title);
      setEditingTitle(false);
      setError(null);
      if (isManualRefresh) {
        await loadStats();
      }
    } catch (error) {
      console.error('获取当前页面失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取当前页面失败';
      setError(errorMessage);
      setCurrentPage(null);
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
    }
  };
  
  // [新增] 3. 创建一个单独的函数来加载统计数据（用于即时反馈）
  const loadStats = async () => {
    try {
      const userStats = await currentPageService.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('刷新统计数据失败:', error);
      // 静默失败，不打扰用户
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
      await loadCurrentPage(); // 重新加载以获取最新数据
    } catch (error) {
      console.error('更新标题失败:', error);
      setTitleValue(currentPage.title); // 恢复原值
    } finally {
      setEditingTitle(false);
    }
  };

  const handleTagsChange = async (newTagNames: string[]) => {
    if (!currentPage) return;

    const currentTagNames = currentPage.tags
      .map(tagId => allTags.find(t => t.id === tagId)?.name)
      .filter(Boolean) as string[];

    const addedTagNames = newTagNames.filter(name => !currentTagNames.includes(name));
    const removedTagNames = currentTagNames.filter(name => !newTagNames.includes(name));

    const tagsToAdd = Array.from(
      new Set(
        addedTagNames
          .map(name => name.trim())
          .filter(name => name.length > 0),
      ),
    );

    const tagsToRemove = Array.from(
      new Set(
        removedTagNames
          .map(name => name.trim())
          .filter(name => name.length > 0),
      ),
    );

    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      return;
    }

    setIsRefreshing(true);

    try {
      const { newPage, newStats } = await currentPageService.updatePageTags(
        currentPage.id,
        {
          tagsToAdd,
          tagsToRemove,
        },
      );

      setCurrentPage(newPage);
      setTitleValue(newPage.title);
      setStats(newStats);

      const updatedTags = await currentPageService.getAllTags();
      setAllTags(updatedTags);
      setSuggestions(updatedTags.map(tag => tag.name));
      setError(null);
    } catch (error) {
      console.error('批量更新标签失败:', error);
      await loadCurrentPage();
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentPageTagNames = currentPage
    ? currentPage.tags
        .map(tagId => allTags.find(t => t.id === tagId)?.name)
        .filter(Boolean) as string[]
    : [];

  return (
    <div className={className}>
      {/* 单个统一的 GlassCard */}
      <motion.div layout>
        <GlassCard className="p-4">
          <motion.div
            layout
            transition={LAYOUT_TRANSITION}
            className="space-y-4" // 移除 pb-2，我们将用页脚填充
            style={{ 
              willChange: 'height',
              overflow: 'visible',
            }}
          >
            <motion.div layout="position">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
                  <span 
                    style={{ 
                      color: 'var(--color-text-module-title)',
                      font: 'var(--font-module-title)',
                      letterSpacing: 'var(--letter-spacing-module-title)',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Add Tags
                  </span>
                </div>

                {/* [修复 3] 右侧“空间复用”容器 */}

                <div 
                  className="flex items-center justify-end gap-3 ml-auto" 
                  style={{ flex: '1 1 0', minWidth: 0 }}
                >
                  
                  {/* [修复 4] 条件渲染：只在 'error' 时显示按钮 */}
                  
                  {error ? (
                    
                    // 状态 1: 错误（显示可点击的刷新按钮）
                    <button
                      onClick={() => loadCurrentPage(true)}
                      disabled={loading || isRefreshing}
                      className="p-2 rounded-lg transition-all flex-shrink-0" 
                      style={{
                        background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)',
                        opacity: 1,
                        pointerEvents: 'auto',
                        transition: 'opacity 150ms var(--ease-smooth)',
                      }}
                      title="刷新"
                    >
                      <RefreshCw 
                        // [修复] 旋转由 isRefreshing 控制
                        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                        strokeWidth={1.5}
                        style={{ color: 'var(--c-action)' }}
                      />
                    </button>
                    
                  ) : (currentPage?.url) ? (
                  
                    // 状态 2: 正常（显示 URL 和一个“条件可见”的 spinner）
                    <div className="flex items-center justify-end gap-2" style={{ minWidth: 0 }}>
                      
                      {/* [关键修复] Spinner 始终在 DOM 中，只改变 opacity */}
                      <RefreshCw 
                        className="w-4 h-4 animate-spin"
                        strokeWidth={1.5}
                        style={{ 
                          color: 'var(--c-action)',
                          flexShrink: 0,
                          // [关键] 使用 opacity 控制可见性，防止 Jank
                          opacity: isRefreshing ? 1 : 0, 
                          transition: 'opacity 150ms var(--ease-smooth)',
                          pointerEvents: 'none'
                        }}
                      />
                      
                      {/* [关键修复] URL 始终在 DOM 中 */}
                      <p 
                        style={{ 
                          color: 'var(--color-text-secondary)',
                          font: 'var(--font-caption)',
                          letterSpacing: 'var(--letter-spacing-caption)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                          minWidth: 0,
                          flexShrink: 1,
                          textAlign: 'right'
                        } as CSSProperties}
                        title={currentPage.url}
                      >
                        {currentPage.url}
                      </p>
                    </div>
                    
                  ) : (
                    // 状态 3: 既没有错误也没有 URL (例如：初始加载)
                    null
                  )}
                </div>
              </div>
            </motion.div>

            {/* SECTION 2: 可编辑标题 (In-Place Edit) */}
            <motion.div layout="position">
              {editingTitle ? (
                <textarea
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleTitleChange(titleValue);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setTitleValue(currentPage?.title || '');
                      setEditingTitle(false);
                    }
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    color: 'var(--color-text-primary)',
                    font: 'var(--font-page-title)',
                    letterSpacing: 'var(--letter-spacing-page-title)',
                    lineHeight: 1.35,
                    maxHeight: '3.47rem',
                    minHeight: '1.985rem',
                    padding: '0.25rem 0',
                    overflow: 'auto',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    resize: 'none',
                    margin: 0,
                    boxShadow: 'none',
                    boxSizing: 'border-box'
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
                    maxHeight: '3.47rem',
                    minHeight: '1.985rem',
                    width: '100%',
                    padding: '0.25rem 0',
                    boxSizing: 'border-box',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    cursor: loading || error || !currentPage ? 'default' : 'text',
                    transition: 'background-color 0.2s var(--ease-smooth)'
                  }}
                  onClick={() => {
                    if (!loading && !error && currentPage) {
                      setEditingTitle(true);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !error && currentPage) {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--c-glass) 10%, transparent)';
                      e.currentTarget.style.setProperty('--pseudo-display', 'none');
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.removeProperty('--pseudo-display');
                  }}
                >
                  <h2
                    style={{
                      color: 'var(--color-text-primary)',
                      font: 'var(--font-page-title)',
                      letterSpacing: 'var(--letter-spacing-page-title)',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as any,
                      wordBreak: 'break-word',
                      margin: 0,
                      width: '100%',
                      flex: '1 1 100%',
                      minWidth: 0
                    }}
                    title={currentPage ? '点击编辑标题' : undefined}
                  >
                    {loading
                      ? 'Loading...'
                      : error
                        ? `Error: ${error}`
                        : currentPage?.title || 'No page loaded'}
                  </h2>

                  {!loading && !error && currentPage && (
                    <div
                      className="absolute right-1 top-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        top: 'calc(0.25rem + 2px)',
                        right: '4px',
                        color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
                        pointerEvents: 'none'
                      }}
                    >
                      <Pencil className="w-3 h-3" strokeWidth={2} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* SECTION 3: 输入框 */}
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
            
            {/* [新增] 5. SECTION 4: 微型统计栏 (The Subtle Nudge) */}
            {!loading && !error && currentPage && (
              <motion.div layout="position">
                <div 
                  className="flex items-center justify-between gap-4 pt-3 mt-2"
                  style={{
                    borderTop: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-1.5" title="Today's tagged items">
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))' }} strokeWidth={2} />
                    <span style={{
                      font: 'var(--font-footnote)',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500,
                    }}>
                      Today:
                    </span>
                    <span style={{
                      font: 'var(--font-footnote)',
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {stats.todayCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Current tagging streak">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))' }} strokeWidth={2} />
                    <span style={{
                      font: 'var(--font-footnote)',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500,
                    }}>
                      Streak:
                    </span>
                    <span style={{
                      font: 'var(--font-footnote)',
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
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
