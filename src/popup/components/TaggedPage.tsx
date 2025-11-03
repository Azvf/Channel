import { useState } from "react";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Tag } from "./Tag";
import { PagePreview } from "./PagePreview";
import { EditPageDialog } from "./EditPageDialog";
import { Search, Inbox, Pencil, Layers } from "lucide-react";

const MOCK_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Design",
  "Tutorial",
  "Documentation",
  "Frontend",
  "Backend",
  "API",
  "Performance",
  "Security",
];

const MOCK_PAGES = [
  {
    id: 1,
    title: "React Hooks Complete Guide",
    url: "https://react.dev/react-hooks-guide",
    tags: ["React", "Tutorial", "Frontend"],
    screenshot: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop",
  },
  {
    id: 2,
    title: "TypeScript Type System Deep Dive",
    url: "https://www.typescriptlang.org/typescript-types",
    tags: ["TypeScript", "Tutorial", "Frontend"],
    screenshot: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Design System Best Practices",
    url: "https://www.designsystems.com/design-system",
    tags: ["Design", "Frontend", "UI"],
    screenshot: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop",
  },
  {
    id: 4,
    title: "React Performance Optimization",
    url: "https://react.dev/react-performance",
    tags: ["React", "Frontend", "Performance"],
    screenshot: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
  },
  {
    id: 5,
    title: "API Design Guidelines",
    url: "https://www.apidesign.com/api-design",
    tags: ["API", "Backend", "Documentation"],
    screenshot: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop",
  },
  {
    id: 6,
    title: "Frontend Security Best Practices",
    url: "https://www.security.dev/frontend-security",
    tags: ["Frontend", "Security", "Tutorial"],
    screenshot: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop",
  },
  {
    id: 7,
    title: "CSS Grid Layout Mastery",
    url: "https://cssgrid.io/css-grid",
    tags: ["CSS", "Frontend", "Tutorial"],
    screenshot: "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=400&h=300&fit=crop",
  },
  {
    id: 8,
    title: "Node.js Best Practices",
    url: "https://nodejs.org/nodejs-practices",
    tags: ["Node.js", "Backend", "Performance"],
    screenshot: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop",
  },
  {
    id: 9,
    title: "Git Workflow Strategies",
    url: "https://git-scm.com/git-workflow",
    tags: ["Git", "Documentation", "Tutorial"],
    screenshot: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&h=300&fit=crop",
  },
  {
    id: 10,
    title: "Web Accessibility Guide",
    url: "https://www.a11y.dev/a11y-guide",
    tags: ["Accessibility", "Frontend", "UI"],
    screenshot: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=300&fit=crop",
  },
];

interface TaggedPageProps {
  className?: string;
}

export function TaggedPage({ className = "" }: TaggedPageProps) {
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [pages, setPages] = useState(MOCK_PAGES);
  const [editingPage, setEditingPage] = useState<typeof MOCK_PAGES[0] | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

  // Filter pages based on search tags
  const filteredPages =
    searchTags.length > 0
      ? pages.filter((page) => searchTags.every((tag) => page.tags.includes(tag)))
      : pages;

  const handleEditPage = (page: typeof MOCK_PAGES[0]) => {
    setEditingPage(page);
    setIsEditDialogOpen(true);
  };

  const handleSavePage = (updatedPage: typeof MOCK_PAGES[0]) => {
    setPages(pages.map(p => p.id === updatedPage.id ? updatedPage : p));
  };

  return (
    <div className={`space-y-6 pb-12 ${className}`}>
      {/* Unified Card: Search + Results */}
      <div>
        <GlassCard className="p-8">
          <div className="space-y-5">
            {/* Search Section */}
            <div className="space-y-5">
              {/* Section Label */}
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
                
                <button
                  onClick={() => setSearchTags([])}
                  className="glass-button"
                  style={{ 
                    fontSize: '0.8rem',
                    padding: '0.4em 0.9em',
                    opacity: searchTags.length > 0 ? 1 : 0,
                    visibility: searchTags.length > 0 ? 'visible' : 'hidden',
                    pointerEvents: searchTags.length > 0 ? 'auto' : 'none',
                    transition: 'opacity 200ms ease, visibility 200ms ease'
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* Search Input */}
              <TagInput
                tags={searchTags}
                onTagsChange={setSearchTags}
                placeholder="Enter tags to filter pages..."
                suggestions={MOCK_SUGGESTIONS}
              />

              {/* Results Summary */}
              <div className="flex items-center justify-between pt-1">
                <span 
                  style={{ 
                    color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))', 
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.8rem',
                    fontWeight: 400,
                    letterSpacing: '0.005em'
                  }}
                >
                  {searchTags.length > 0 ? 'Filtered results' : 'All pages'}
                </span>
                <div 
                  className="px-2.5 py-1 rounded-lg"
                  style={{ 
                    color: 'var(--c-content)',
                    background: 'color-mix(in srgb, var(--c-glass) 16%, transparent)',
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    border: '1px solid color-mix(in srgb, var(--c-glass) 24%, transparent)',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {filteredPages.length}/{MOCK_PAGES.length}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div 
              style={{ 
                height: '1px',
                background: 'color-mix(in srgb, var(--c-glass) 20%, transparent)',
                margin: '0.75rem 0'
              }} 
            />

            {/* Results Section */}
            <div>
              {filteredPages.length > 0 ? (
                <div className="space-y-3">
                  {filteredPages.map((page) => (
                    <div 
                      key={page.id}
                      className="rounded-2xl transition-all relative"
                      style={{
                        background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--c-glass) 15%, transparent)',
                        padding: '1.25rem 1.5rem',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        setHoveredCardId(page.id);
                        e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 28%, transparent)';
                      }}
                      onMouseLeave={(e) => {
                        setHoveredCardId(null);
                        e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                      }}
                    >
                      {/* Edit Button Hover Area - Larger hover zone in top right */}
                      <div 
                        className="absolute top-0 right-0 group/edit"
                        style={{
                          width: '120px',
                          height: '80px',
                          pointerEvents: 'none'
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPage(page);
                          }}
                          className="absolute top-3 right-3 rounded-xl p-2.5 opacity-0 group-hover/edit:opacity-100 transition-all"
                          style={{
                            background: 'color-mix(in srgb, var(--c-glass) 18%, transparent)',
                            backdropFilter: 'blur(8px)',
                            border: '1.5px solid color-mix(in srgb, var(--c-glass) 28%, transparent)',
                            color: 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))',
                            cursor: 'pointer',
                            pointerEvents: 'auto'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 20%, transparent)';
                            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-action) 45%, transparent)';
                            e.currentTarget.style.color = 'var(--c-action)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 18%, transparent)';
                            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 28%, transparent)';
                            e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Content - No Padding, Edit Button is Absolute */}
                      <div className="space-y-3.5">
                        {/* Title - Full Width, No Icons */}
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          style={{ textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3 
                            style={{ 
                              fontFamily: '"DM Sans", sans-serif',
                              color: 'var(--c-content)',
                              fontWeight: 600,
                              fontSize: '1.05rem',
                              letterSpacing: '-0.015em',
                              lineHeight: 1.4,
                              transition: 'color 200ms ease',
                              margin: 0
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--c-action)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--c-content)';
                            }}
                          >
                            {page.title}
                          </h3>
                        </a>

                        {/* Icon + URL Row */}
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0">
                            <PagePreview 
                              url={page.url}
                              screenshot={page.screenshot}
                              title={page.title}
                              forceClose={hoveredCardId !== page.id}
                            />
                          </div>
                          <p 
                            className="truncate flex-1"
                            style={{ 
                              color: 'color-mix(in srgb, var(--c-content) 48%, var(--c-bg))',
                              fontFamily: '"DM Sans", sans-serif',
                              fontSize: '0.8rem',
                              fontWeight: 400,
                              letterSpacing: '0.005em',
                              margin: 0
                            }}
                          >
                            {page.url}
                          </p>
                        </div>

                        {/* Tags - WITH LIQUID GLASS MATCHING EFFECT */}
                        <div className="flex flex-wrap gap-1.5">
                          {page.tags.map((tag, tagIndex) => (
                            searchTags.includes(tag) ? (
                              // Matched tag - Full liquid glass effect
                              <Tag key={tagIndex} label={tag} />
                            ) : (
                              // Regular tag - Simple style
                              <span 
                                key={tagIndex}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg"
                                style={{ 
                                  color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))',
                                  background: 'color-mix(in srgb, var(--c-glass) 10%, transparent)',
                                  fontFamily: '"DM Sans", sans-serif',
                                  fontSize: '0.7rem',
                                  fontWeight: 500,
                                  letterSpacing: '0.01em',
                                  border: '1px solid color-mix(in srgb, var(--c-glass) 18%, transparent)',
                                  transition: 'all 200ms ease'
                                }}
                              >
                                {tag}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty State
                <div 
                  className="text-center py-12 rounded-3xl border-2 border-dashed"
                  style={{ 
                    color: 'color-mix(in srgb, var(--c-content) 40%, var(--c-bg))',
                    fontFamily: '"DM Sans", sans-serif',
                    borderColor: 'color-mix(in srgb, var(--c-glass) 30%, transparent)'
                  }}
                >
                  <div className="space-y-4">
                    <div 
                      className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center"
                    >
                      <Inbox 
                        className="w-8 h-8" 
                        strokeWidth={1.5}
                        style={{ 
                          color: 'color-mix(in srgb, var(--c-content) 35%, var(--c-bg))'
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p style={{ 
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        margin: 0
                      }}>
                        {searchTags.length > 0
                          ? "No pages found"
                          : "No pages yet"}
                      </p>
                      <p style={{ 
                        fontSize: '0.8rem',
                        fontWeight: 400,
                        letterSpacing: '0.01em',
                        margin: 0
                      }}>
                        {searchTags.length > 0
                          ? "Try different tags or clear your filters"
                          : "Start tagging pages to see them here"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Edit Dialog */}
      {editingPage && (
        <EditPageDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          page={editingPage}
          onSave={handleSavePage}
        />
      )}
    </div>
  );
}
