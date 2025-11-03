import { useState, useEffect, useRef } from "react";
import { GlassCard } from "./GlassCard";
import { GlassInput } from "./GlassInput";
import { Tag } from "./Tag";
import { Checkbox } from "./ui/checkbox";
import { Plus, FileText, RefreshCw } from "lucide-react";
import { TaggedPage, GameplayTag } from "../../types/gameplayTag";
import { currentPageService } from "../../services/popup/currentPageService";
import type { PageSettingsHook } from "../../popup/utils/usePageSettings";
import { AnimatedHeightWrapper } from "./AnimatedHeightWrapper";

interface TaggingPageProps {
  className?: string;
  // 使用统一的页面设置管理接口，而不是直接传入设置值
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

  // 使用统一的页面设置管理接口
  // pageSettings 在 App 组件层面统一管理，切换页面时不会重新初始化，避免闪烁
  const { settings, updateSyncVideoTimestamp } = pageSettings;
  const syncVideoTimestamp = settings.syncVideoTimestamp;

  // Animation states - 只保留进入动画
  const [enteringTagIds, setEnteringTagIds] = useState<Set<string>>(new Set());
  const prevTagIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef(true);

  // 加载当前页面信息和所有标签
  useEffect(() => {
    loadCurrentPage();
    loadAllTags();
  }, []);

  // 处理视频时间戳同步设置变更（使用统一的更新接口）
  const handleSyncVideoTimestampChange = async (checked: boolean) => {
    try {
      await updateSyncVideoTimestamp(checked);
    } catch (error) {
      console.error('更新视频时间戳同步设置失败:', error);
    }
  };

  // 加载所有标签建议
  useEffect(() => {
    if (allTags.length > 0) {
      setSuggestions(allTags.map(tag => tag.name));
    }
  }, [allTags]);

  // 检测标签变化并设置进入动画状态（已移除退出动画）
  useEffect(() => {
    if (!currentPage) {
      prevTagIdsRef.current = new Set();
      setEnteringTagIds(new Set());
      return;
    }

    // 跳过初始加载，避免所有tags都播放动画
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevTagIdsRef.current = new Set(currentPage.tags);
      setEnteringTagIds(new Set());
      return;
    }

    const currentTagIds = new Set(currentPage.tags);
    const prevTagIds = prevTagIdsRef.current;
    
    // 如果prevTagIds为空，说明是重置状态，直接更新
    if (prevTagIds.size === 0) {
      prevTagIdsRef.current = new Set(currentTagIds);
      setEnteringTagIds(new Set());
      return;
    }

    const entering = new Set<string>();

    // 找出新添加的tags（只在当前列表中，不在之前的列表中）
    currentTagIds.forEach(tagId => {
      if (!prevTagIds.has(tagId)) {
        entering.add(tagId);
      }
    });

    if (entering.size > 0) {
      setEnteringTagIds(prev => {
        const next = new Set(prev);
        entering.forEach(id => next.add(id));
        return next;
      });
      // 动画完成后清除标记
      setTimeout(() => {
        setEnteringTagIds(prev => {
          const next = new Set(prev);
          entering.forEach(id => next.delete(id));
          return next;
        });
      }, 300);
    }

    // 更新prevTagIdsRef为当前的tags列表
    prevTagIdsRef.current = new Set(currentTagIds);
  }, [currentPage?.tags.length, currentPage?.tags.join(',')]);

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
    // 如果提供了tagName（来自下拉框选择），使用它；否则使用input中的值
    // 确保 tagName 和 tagInput 都是字符串类型
    const tagValue = tagName ?? tagInput;
    if (typeof tagValue !== 'string') {
      console.error('handleAddTag: tagName must be a string', { tagName, tagInput });
      return;
    }
    const trimmedTag = tagValue.trim();
    if (!trimmedTag || !currentPage) return;

    try {
      const tag = await currentPageService.createTagAndAddToPage(trimmedTag, currentPage.id);
      // 如果标签不在列表中，添加到列表
      if (!allTags.find(t => t.id === tag.id)) {
        setAllTags(prev => [...prev, tag]);
      }
      setTagInput("");
      loadCurrentPage(); // 重新加载当前页面以获取最新标签
    } catch (error) {
      console.error('添加标签失败:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!currentPage) return;

    try {
      await currentPageService.removeTagFromPage(currentPage.id, tagId);
      loadCurrentPage(); // 重新加载当前页面
    } catch (error) {
      console.error('移除标签失败:', error);
    }
  };


  return (
    <div className={`space-y-6 pb-12 ${className}`}>
      {/* Add Tag Section */}
      <div>
        <GlassCard className="p-8">
          <AnimatedHeightWrapper innerClassName="space-y-5">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
                <span 
                  style={{ 
                    color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
                    fontFamily: '"DM Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  Add Tags
                </span>
              </div>
              
              {/* Current Page Info */}
              {currentPage && (
                <div className="flex items-center gap-2 max-w-[50%]">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} 
                    style={{ color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))' }} 
                  />
                  <span 
                    className="truncate"
                    style={{ 
                      color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      letterSpacing: '0.01em'
                    }}
                    title={currentPage.title}
                  >
                    {currentPage.title}
                  </span>
                </div>
              )}
            </div>

            {/* Input */}
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
            />

            {/* Tags Display */}
            {currentPage && currentPage.tags.length > 0 ? (
              <div 
                className="flex flex-wrap items-start"
                style={{
                  gap: '0.875rem 0.875rem',
                  alignContent: 'flex-start',
                  rowGap: '0.875rem',
                  marginTop: '0.75rem'
                }}
              >
                {currentPage.tags.map((tagId) => {
                  const tag = allTags.find(t => t.id === tagId);
                  if (!tag) return null;
                  const isEntering = enteringTagIds.has(tagId);
                  return (
                    <div
                      key={tagId}
                      className={isEntering ? 'tag-enter' : ''}
                    >
                      <Tag label={tag.name} onRemove={() => handleRemoveTag(tagId)} />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Settings 分割线 */}
            <div
              style={{
                height: '1px',
                backgroundColor: 'color-mix(in srgb, var(--c-glass) 20%, transparent)',
                marginTop: currentPage && currentPage.tags.length > 0 ? '1rem' : '1.75rem',
                marginBottom: '0.75rem'
              }}
            />

            {/* Settings Checkbox */}
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              <label
                htmlFor="sync-video-timestamp"
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{
                  color: 'color-mix(in srgb, var(--c-content) 75%, var(--c-bg))',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8rem',
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
            </div>
          </AnimatedHeightWrapper>
        </GlassCard>
      </div>

      {/* Current Page Info */}
      <div>
        <GlassCard className="p-8">
          <div className="space-y-4">
            {/* Section label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
                <span 
                  style={{ 
                    color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
                    fontFamily: '"DM Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  Current Page
                </span>
              </div>
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

            <div className="space-y-2.5">
              {/* Title container - 使用固定容器，两个状态都绝对定位，完全重叠 */}
              <div className="relative" style={{ minHeight: '3.5rem', width: '100%' }}>
                {/* 可编辑状态 - 完全透明，无样式，与 URL 样式一致 */}
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
                    fontSize: '1.2rem',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.4,
                    maxHeight: '3.5rem',
                    overflow: 'auto',
                    minHeight: '3.5rem',
                    padding: '0.75rem 0',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    margin: 0,
                    boxShadow: 'none',
                    boxSizing: 'border-box'
                  }}
                  onBlur={() => handleTitleChange(titleValue)}
                  autoFocus={editingTitle}
                />

                {/* 不可编辑状态 - 使用相同的布局和 padding，绝对定位避免布局变化 */}
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
                    padding: '0.75rem 0',
                    minHeight: '3.5rem',
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
                      fontSize: '1.2rem',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.4,
                      cursor: loading || error || !currentPage ? 'default' : 'text',
                      maxHeight: '3.5rem',
                      overflow: 'hidden',
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
              <p 
                style={{ 
                  color: 'color-mix(in srgb, var(--c-content) 40%, var(--c-bg))',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.7rem',
                  fontWeight: 300,
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
              </div>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}
