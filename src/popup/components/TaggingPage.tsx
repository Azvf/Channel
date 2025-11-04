// src/popup/components/TaggingPage.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GlassInput } from "./GlassInput";
import { Tag } from "./Tag";
import { Checkbox } from "./ui/checkbox";
import { Plus, RefreshCw } from "lucide-react";
import { TaggedPage, GameplayTag } from "../../types/gameplayTag";
import { currentPageService } from "../../services/popup/currentPageService";
import type { PageSettingsHook } from "../../popup/utils/usePageSettings";
import { AnimatedHeightWrapper } from "./AnimatedHeightWrapper";
import { AnimatedFlipList } from "./AnimatedFlipList";

interface TaggingPageProps {
  className?: string;
  pageSettings: PageSettingsHook;
}

export function TaggingPage({ className = "", pageSettings }: TaggingPageProps) {
  const [currentPage, setCurrentPage] = useState<TaggedPage | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [allTags, setAllTags] = useState<GameplayTag[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const { settings, updateSyncVideoTimestamp } = pageSettings;
  const syncVideoTimestamp = settings.syncVideoTimestamp;

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

  const handleAddTag = async (tagName?: string) => {
    const tagValue = tagName ?? tagInput;
    if (typeof tagValue !== 'string') {
      console.error('handleAddTag: tagName must be a string', { tagName, tagInput });
      return;
    }
    const trimmedTag = tagValue.trim();
    if (!trimmedTag || !currentPage) return;

    try {
      const tag = await currentPageService.createTagAndAddToPage(trimmedTag, currentPage.id);
      if (!allTags.find(t => t.id === tag.id)) {
        setAllTags(prev => [...prev, tag]);
      }
      setTagInput("");
      loadCurrentPage();
    } catch (error) {
      console.error('添加标签失败:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!currentPage) return;

    try {
      await currentPageService.removeTagFromPage(currentPage.id, tagId);
      loadCurrentPage();
    } catch (error) {
      console.error('移除标签失败:', error);
    }
  };

  const handleSyncVideoTimestampChange = (checked: boolean) => {
    updateSyncVideoTimestamp(checked);
  };

  return (
    <div className={`pb-12 ${className}`}>
      {/* --- 
        单个统一的 GlassCard，包含所有内容 
        --- */}
      <motion.div layout>
        <GlassCard className="p-4">
          {/* 动画高度包装器包裹所有内容 */}
          <AnimatedHeightWrapper 
            innerClassName="space-y-4" // [1] 减小垂直间距 (20px -> 16px)
            wrapperProps={{
              style: { willChange: 'height' } 
            }}
          >
            {/* --- 
              SECTION 1: 核心操作 - 添加标签标题
              --- */}
            <motion.div layout="position">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
                  <span 
                    style={{ 
                      color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
                      fontFamily: '"DM Sans", sans-serif',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}
                  >
                    Add Tags
                  </span>
                </div>
                {/* 刷新按钮移到主操作区 */}
                {(error || loading) && (
                  <button
                    onClick={loadCurrentPage}
                    disabled={loading}
                    className="p-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)'
                    }}
                    title="刷新"
                  >
                    <RefreshCw 
                      className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                      strokeWidth={1.5}
                      style={{ color: 'var(--c-action)' }}
                    />
                  </button>
                )}
              </div>
            </motion.div>

            {/* --- 
              SECTION 0: 可编辑标题 
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
                    fontFamily: '"DM Sans", sans-serif',
                    color: 'var(--c-content)',
                    fontWeight: 600,
                    fontSize: '1.1rem', // [2] 增大标题字号
                    letterSpacing: '-0.015em', // [2] 优化字间距
                    lineHeight: 1.35, // [2] 减小行高
                    maxHeight: '2.7rem', // [2] 匹配 2 行 * 1.35
                    overflow: 'auto',
                    minHeight: '2.7rem', // [2] 匹配 2 行 * 1.35
                    padding: '0.5rem 0', // [3] 减小垂直 padding
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
                    padding: '0.5rem 0', // [3] 减小垂直 padding
                    minHeight: '2.7rem', // [2] 匹配
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
                      fontFamily: '"DM Sans", sans-serif',
                      color: 'var(--c-content)',
                      fontWeight: 600,
                      fontSize: '1.1rem', // [2] 增大标题字号
                      letterSpacing: '-0.015em', // [2] 优化字间距
                      lineHeight: 1.35, // [2] 减小行高
                      cursor: loading || error || !currentPage ? 'default' : 'text',
                      maxHeight: '2.7rem', // [2] 匹配 2 行
                      overflow: 'hidden', // [4] 优化多行显示
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
              输入框 
              --- */}
            <motion.div layout="position">
              <GlassInput
                value={tagInput}
                onChange={setTagInput}
                onSelect={handleAddTag}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Enter a tag..."
                suggestions={suggestions}
                excludeTags={currentPage ? currentPage.tags.map(tagId => allTags.find(t => t.id === tagId)?.name).filter((name): name is string => !!name) : []}
                autoFocus={true}
                disabled={loading || !!error} // 加载或出错时禁用
              />
            </motion.div>

            {/* --- 
              SECTION 2: 当前标签 (操作反馈) 
              --- */}
            {currentPage && currentPage.tags.length > 0 && (
              <AnimatedFlipList
                items={currentPage.tags.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as (GameplayTag & { id: string })[]}
                renderItem={(tag) => (
                  <Tag label={tag.name} onRemove={() => handleRemoveTag(tag.id)} />
                )}
                className="flex flex-wrap items-start"
                style={{
                  gap: '0.625rem', // [5] 减小 Tag 之间的间距 (14px -> 10px)
                  alignContent: 'flex-start',
                  rowGap: '0.625rem' // [4] 移除多余的 margin
                }}
              />
            )}

            {/* --- 
              SECTION 3: 页面信息 (上下文) 
              --- */}
            <motion.div layout="position">
              {/* URL */}
              <p 
                style={{ 
                  color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))', // [6] 提高对比度
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8rem', // [6] 增大 URL 字号
                  fontWeight: 400, // [6] 增加 URL 字重
                  letterSpacing: '0.01em',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-all',
                  lineHeight: 1.4
                } as React.CSSProperties}
              >
                {error ? '请检查浏览器控制台获取详细信息' : currentPage?.url || ''}
              </p>
            </motion.div>

            {/* --- 
              SECTION 4: 设置 (次要) 
              --- */}
            <motion.div
              layout="position" // 分割线
              style={{
                height: '1px',
                backgroundColor: 'color-mix(in srgb, var(--c-glass) 20%, transparent)' // [4] 移除多余的 margin
              }}
            />

            <motion.div 
              layout="position" // Checkbox
              className="flex flex-wrap gap-x-6 gap-y-2.5"
            >
              <label
                htmlFor="sync-video-timestamp"
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{
                  color: 'color-mix(in srgb, var(--c-content) 75%, var(--c-bg))',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                  transition: 'color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--c-content)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 75%, var(--c-bg))';
                }}
              >
                <Checkbox
                  id="sync-video-timestamp"
                  checked={syncVideoTimestamp}
                  onCheckedChange={handleSyncVideoTimestampChange}
                />
                <span>同步视频时间戳到 URL</span>
              </label>
            </motion.div>
            
          </AnimatedHeightWrapper>
        </GlassCard>
      </motion.div>
    </div>
  );
}