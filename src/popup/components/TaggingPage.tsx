// src/popup/components/TaggingPage.tsx
import { useState, useEffect, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { LAYOUT_TRANSITION } from "../utils/motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Plus, RefreshCw } from "lucide-react";
import { TaggedPage, GameplayTag } from "../../types/gameplayTag";
import { currentPageService } from "../../services/popup/currentPageService";

interface TaggingPageProps {
  className?: string;
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

  useEffect(() => {
    loadCurrentPage();
    loadAllTags();
  }, []);

  useEffect(() => {
    if (allTags.length > 0) {
      setSuggestions(allTags.map(tag => tag.name));
    }
  }, [allTags]);

  const loadCurrentPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await currentPageService.getCurrentPage();
      setCurrentPage(page);
      setTitleValue(page.title);
      setEditingTitle(false);
      setError(null);
    } catch (error) {
      console.error('获取当前页面失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取当前页面失败';
      setError(errorMessage);
      setCurrentPage(null);
    } finally {
      setLoading(false);
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

  const loadAllTags = async () => {
    try {
      const tags = await currentPageService.getAllTags();
      setAllTags(tags);
    } catch (error) {
      console.error('获取所有标签失败:', error);
    }
  };

  const handleAddTag = async (tagName: string) => {
    const trimmedTag = tagName.trim();
    if (!trimmedTag || !currentPage) return;

    try {
      const tag = await currentPageService.createTagAndAddToPage(trimmedTag, currentPage.id);
      if (!allTags.find(t => t.id === tag.id)) {
        setAllTags(prev => [...prev, tag]);
      }
    } catch (error) {
      console.error('添加标签失败:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!currentPage) return;

    try {
      await currentPageService.removeTagFromPage(currentPage.id, tagId);
    } catch (error) {
      console.error('移除标签失败:', error);
    }
  };

  const handleTagsChange = async (newTagNames: string[]) => {
    if (!currentPage) return;

    const currentTagNames = currentPage.tags
      .map(tagId => allTags.find(t => t.id === tagId)?.name)
      .filter(Boolean) as string[];

    const addedTags = newTagNames.filter(name => !currentTagNames.includes(name));
    const removedTagNames = currentTagNames.filter(name => !newTagNames.includes(name));

    const promises: Promise<unknown>[] = [];

    removedTagNames.forEach(name => {
      const tag = allTags.find(t => t.name === name);
      if (tag) {
        promises.push(handleRemoveTag(tag.id));
      }
    });

    addedTags.forEach(name => {
      promises.push(handleAddTag(name));
    });

    if (promises.length === 0) {
      return;
    }

    setIsRefreshing(true);

    await Promise.all(promises);

    await loadCurrentPage();
    setIsRefreshing(false);
  };

  const currentPageTagNames = currentPage
    ? currentPage.tags
        .map(tagId => allTags.find(t => t.id === tagId)?.name)
        .filter(Boolean) as string[]
    : [];

  return (
    <div className={className}>
      {/* --- 
        单个统一的 GlassCard，包含所有内容 
        --- */}
      <motion.div layout>
        <GlassCard className="p-4">
          {/* 使用 framer-motion layout 处理高度动画 */}
          <motion.div
            layout // <-- 自动处理高度动画
            transition={LAYOUT_TRANSITION} // <-- 标准物理
            className="space-y-4"
            style={{ 
              willChange: 'height',
              overflow: 'visible', // 改为 visible 以显示阴影
              // 注意：如果内容溢出，需要在内部元素上单独处理
            }}
          >
            {/* --- 
              SECTION 1: 核心操作 - 添加标签标题 + URL
              --- */}
            <motion.div layout="position">
              <div className="flex items-center justify-between gap-3">
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
                {/* URL 显示在右侧 */}
                {currentPage?.url && (
                  <p 
                    style={{ 
                      color: 'var(--color-text-secondary)',
                      font: 'var(--font-caption)',
                      letterSpacing: 'var(--letter-spacing-caption)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                      margin: 0,
                      textAlign: 'right'
                    } as CSSProperties}
                    title={currentPage.url}
                  >
                    {currentPage.url}
                  </p>
                )}
                {/* 刷新按钮移到主操作区 */}
                {(error || loading || isRefreshing) && (
                  <button
                    onClick={loadCurrentPage}
                    disabled={loading || isRefreshing}
                    className="p-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-50 flex-shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)'
                    }}
                    title="刷新"
                  >
                    <RefreshCw 
                      className={`w-4 h-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`}
                      strokeWidth={1.5}
                      style={{ color: 'var(--c-action)' }}
                    />
                  </button>
                )}
              </div>
            </motion.div>

            {/* --- 
              SECTION 2: 可编辑标题 (主要)
              --- */}
            <motion.div layout="position">
              <div className="relative" style={{ minHeight: '2.7rem', width: '100%' }}>
                {/* 可编辑状态 */}
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
                  rows={2}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    opacity: editingTitle ? 1 : 0,
                    pointerEvents: editingTitle ? 'auto' : 'none',
                    zIndex: editingTitle ? 10 : 1,
                    transition: 'opacity 0.2s ease-in-out',
                    color: 'var(--color-text-primary)',
                    font: 'var(--font-page-title)',
                    letterSpacing: 'var(--letter-spacing-page-title)',
                    lineHeight: 1.35,
                    maxHeight: '2.7rem',
                    overflow: 'auto',
                    minHeight: '2.7rem',
                    padding: '0.25rem 0',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    margin: 0,
                    boxShadow: 'none',
                    boxSizing: 'border-box'
                  }}
                  onBlur={() => handleTitleChange(titleValue)}
                />
                {/* 不可编辑状态 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    opacity: editingTitle ? 0 : 1,
                    pointerEvents: editingTitle ? 'none' : 'auto',
                    zIndex: editingTitle ? 1 : 10,
                    transition: 'opacity 0.2s ease-in-out',
                    padding: '0.25rem 0',
                    minHeight: '2.7rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    boxSizing: 'border-box'
                  }}
                >
                  <h2 
                    onClick={() => {
                      if (!loading && !error && currentPage) {
                        setEditingTitle(true);
                      }
                    }}
                    style={{ 
                      color: 'var(--color-text-primary)',
                      font: 'var(--font-page-title)',
                      letterSpacing: 'var(--letter-spacing-page-title)',
                      lineHeight: 1.35,
                      cursor: loading || error || !currentPage ? 'default' : 'text',
                      maxHeight: '2.7rem',
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
                </div>
              </div>
            </motion.div>

            {/* --- 
              输入框 (修改)
              --- */}
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
            
          </motion.div>
        </GlassCard>
      </motion.div>
    </div>
  );
}