import { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Tag } from "./Tag";
import { ExternalLink, Calendar, Search } from "lucide-react";
import type { TaggedPage, GameplayTag } from "../../types/gameplayTag";
import { currentPageService } from "../../services/popup/currentPageService";

interface TaggedPageProps {
  className?: string;
}

export function TaggedPage({ className = "" }: TaggedPageProps) {
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [pages, setPages] = useState<TaggedPage[]>([]);
  const [allTags, setAllTags] = useState<GameplayTag[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 加载所有页面和标签
  useEffect(() => {
    loadAllPages();
    loadAllTags();
  }, []);

  // 加载所有标签建议
  useEffect(() => {
    if (allTags.length > 0) {
      setSuggestions(allTags.map(tag => tag.name));
    }
  }, [allTags]);

  const loadAllPages = async () => {
    try {
      const pages = await currentPageService.getAllTaggedPages();
      setPages(pages);
    } catch (error) {
      console.error('获取所有页面失败:', error);
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

  // Filter pages based on search tags
  const filteredPages =
    searchTags.length > 0
      ? pages.filter((page) => {
          const pageTagNames = page.tags.map(tagId => {
            const tag = allTags.find(t => t.id === tagId);
            return tag ? tag.name : '';
          });
          return searchTags.every((searchTag) => pageTagNames.includes(searchTag));
        })
      : pages;

  return (
    <div className={`space-y-6 pb-12 ${className}`}>
      {/* Search Section */}
      <div>
        <GlassCard className="p-8">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
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
                  Search by Tags
                </span>
              </div>
              
              {searchTags.length > 0 && (
                <button
                  onClick={() => setSearchTags([])}
                  className="glass-button"
                  style={{ 
                    fontSize: '0.8rem',
                    padding: '0.4em 0.9em'
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <TagInput
              tags={searchTags}
              onTagsChange={setSearchTags}
              placeholder="Enter tags to search..."
              suggestions={suggestions}
            />

            {/* Results count */}
            <div className="pt-1">
              <span 
                style={{ 
                  color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))', 
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  letterSpacing: '0.01em'
                }}
              >
                {searchTags.length > 0
                  ? `${filteredPages.length} page${filteredPages.length !== 1 ? 's' : ''} found`
                  : `Showing all ${pages.length} pages`}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Results Section */}
      <div>
        <GlassCard className="p-8">
          <div className="space-y-5">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ background: 'var(--c-action)' }}
                />
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
                  Results
                </span>
              </div>
              <span 
                className="px-3 py-1.5 rounded-full"
                style={{ 
                  color: 'var(--c-content)',
                  background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                {filteredPages.length}/{pages.length}
              </span>
            </div>

            {filteredPages.length > 0 && (
              <div className="space-y-3">
                {filteredPages.map((page) => (
                  <div 
                    key={page.id} 
                    className="relative group p-6 rounded-2xl transition-all border"
                    style={{ 
                      background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
                      borderColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                      e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 30%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div className="space-y-4">
                      {/* Title and Link */}
                      <div className="space-y-2.5">
                        <h3 
                          style={{ 
                            fontFamily: '"DM Sans", sans-serif',
                            color: 'var(--c-content)',
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.4
                          }}
                        >
                          {page.title}
                        </h3>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 group/link transition-all"
                          style={{ 
                            color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))',
                            fontFamily: '"DM Sans", sans-serif',
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            letterSpacing: '0.01em',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--c-action)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))';
                          }}
                        >
                          <span className="truncate max-w-[300px] md:max-w-[500px]">
                            {page.url}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                        </a>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {page.tags.map((tagId) => {
                          const tag = allTags.find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <div key={tagId}>
                              {searchTags.includes(tag.name) ? (
                                <Tag label={tag.name} />
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                                  style={{ 
                                    color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
                                    background: 'color-mix(in srgb, var(--c-glass) 10%, transparent)',
                                    fontFamily: '"DM Sans", sans-serif',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    letterSpacing: '0.01em',
                                    border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)'
                                  }}
                                >
                                  {tag.name}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Last visited */}
                      <div 
                        className="flex items-center gap-2 pt-3 border-t"
                        style={{ 
                          color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))',
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          letterSpacing: '0.01em',
                          borderColor: 'color-mix(in srgb, var(--c-glass) 20%, transparent)'
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Last updated {new Date(page.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
