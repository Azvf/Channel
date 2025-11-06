import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { TagInput } from "./TagInput";
import { Tag } from "./Tag";
import { PagePreview } from "./PagePreview";
import { EditPageDialog } from "./EditPageDialog";
import { Search, Inbox, MoreHorizontal, Trash2, Copy, Pencil } from "lucide-react";
import { AnimatedFlipList } from "./AnimatedFlipList";

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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

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

  const handleOpenMenu = (e: React.MouseEvent, page: typeof MOCK_PAGES[0]) => {
    e.stopPropagation();
    const button = e.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    // 在按钮下方显示菜单
    setMenuPosition({ 
      x: rect.right - 150, // 菜单宽度约150px，右对齐
      y: rect.bottom + 8 // 在按钮下方8px
    });
    setOpenMenuId(page.id);
  };

  const handleCloseMenu = () => {
    setOpenMenuId(null);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    if (openMenuId === null) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // 检查点击是否在菜单外部
      const menuElement = document.querySelector('[data-menu-id]');
      const buttonElement = menuButtonRefs.current.get(openMenuId);
      
      if (menuElement && !menuElement.contains(target) && 
          buttonElement && !buttonElement.contains(target)) {
        handleCloseMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Unified Card: Search + Results */}
      <div>
        <GlassCard className="p-4">
          <div className="space-y-4">
            {/* Search Section */}
            <div className="space-y-4">
              {/* Section Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
                  <span 
                    style={{ 
                      color: 'var(--color-text-module-title)',
                      font: 'var(--font-module-title)',
                      letterSpacing: 'var(--letter-spacing-module-title)',
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
                    color: 'var(--color-text-secondary)',
                    font: 'var(--font-footnote)',
                    letterSpacing: 'var(--letter-spacing-footnote)',
                  }}
                >
                  {searchTags.length > 0 ? 'Filtered results' : 'All pages'}
                </span>
                <div 
                  className="px-2.5 py-1 rounded-lg"
                  style={{ 
                    color: 'var(--c-content)',
                    background: 'color-mix(in srgb, var(--c-glass) 16%, transparent)',
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
                <AnimatedFlipList
                  items={filteredPages}
                  as="div"
                  className="space-y-3"
                  renderItem={(page) => {
                    return (
                      <div 
                        className="rounded-2xl transition-all relative
                                   hover:bg-[color-mix(in_srgb,var(--c-glass)_15%,transparent)]
                                   hover:border-[color-mix(in_srgb,var(--c-glass)_28%,transparent)]"
                        style={{
                          background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--c-glass) 15%, transparent)',
                          padding: '0.8rem 1.1rem',
                          cursor: 'default'
                        }}
                        onMouseEnter={() => setHoveredCardId(page.id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                      >
                        {/* More Button - Hover Area in top right */}
                        <div 
                          className="absolute top-0 right-0 group/more"
                          style={{
                            width: '120px',
                            height: '80px',
                            pointerEvents: 'none'
                          }}
                        >
                          <button
                            ref={(el) => {
                              if (el) {
                                menuButtonRefs.current.set(page.id, el);
                              } else {
                                menuButtonRefs.current.delete(page.id);
                              }
                            }}
                            onClick={(e) => handleOpenMenu(e, page)}
                            className="absolute top-3 right-3 rounded-xl p-2.5 opacity-0 
                                       group-hover/more:opacity-100 transition-all
                                       hover:bg-[color-mix(in_srgb,var(--c-action)_20%,transparent)]
                                       hover:border-[color-mix(in_srgb,var(--c-action)_45%,transparent)]
                                       hover:text-[var(--c-action)]
                                       hover:scale-105"
                            style={{
                              background: 'color-mix(in srgb, var(--c-glass) 18%, transparent)',
                              backdropFilter: 'blur(8px)',
                              border: '1.5px solid color-mix(in srgb, var(--c-glass) 28%, transparent)',
                              color: 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))',
                              cursor: 'pointer',
                              pointerEvents: 'auto'
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
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
                              {/* [7] 语义从 h3 提升为 h2 */}
                              <h2
                                className="hover:text-[var(--c-action)] transition-colors"
                                style={{ 
                                  color: 'var(--color-text-primary)',
                                  font: 'var(--font-page-title)',
                                  letterSpacing: 'var(--letter-spacing-page-title)',
                                  margin: 0
                                }}
                              >
                                {page.title}
                              </h2>
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
                                  color: 'var(--color-text-secondary)',
                                  font: 'var(--font-caption)',
                                  letterSpacing: 'var(--letter-spacing-caption)',
                                  margin: 0
                                }}
                              >
                                {page.url}
                              </p>
                            </div>

                            {/* Tags - WITH LIQUID GLASS MATCHING EFFECT */}
                            <div className="flex flex-wrap gap-2.5"> {/* [9] 匹配 TaggingPage Tag 间距 (6px -> 10px) */}
                              <AnimatePresence mode="popLayout">
                                {page.tags.map((tag, tagIndex) => {
                                  const uniqueId = `${page.id}-${tag}-${tagIndex}`;
                                  const isMatched = searchTags.includes(tag);
                                  
                                  return (
                                    <motion.div
                                      key={uniqueId}
                                      layout
                                      initial={{ opacity: 0, scale: 0.8, y: 5 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                                      transition={{
                                        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                                        default: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                                      }}
                                      className="inline-flex"
                                    >
                                      {isMatched ? (
                                        <Tag label={tag} />
                                      ) : (
                                        <span 
                                          className="inline-flex items-center px-2.5 py-1 rounded-lg"
                                          style={{ 
                                            color: 'var(--color-text-secondary)',
                                            font: 'var(--font-tag)',
                                            letterSpacing: 'var(--letter-spacing-tag)',
                                            background: 'color-mix(in srgb, var(--c-glass) 10%, transparent)',
                                            border: '1px solid color-mix(in srgb, var(--c-glass) 18%, transparent)',
                                            transition: 'all 200ms ease'
                                          }}
                                        >
                                          {tag}
                                        </span>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            </div>
                        </div>
                      </div>
                    );
                  }}
                />
              ) : (
                // Empty State
                <div 
                  className="text-center py-12 rounded-3xl border-2 border-dashed"
                  style={{ 
                    color: 'color-mix(in srgb, var(--c-content) 40%, var(--c-bg))',
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
                        font: 'var(--font-list-item)',
                        color: 'var(--color-text-tertiary)',
                        margin: 0
                      }}>
                        {searchTags.length > 0
                          ? "No pages found"
                          : "No pages yet"}
                      </p>
                      <p style={{ 
                        font: 'var(--font-caption)',
                        letterSpacing: 'var(--letter-spacing-caption)',
                        color: 'var(--color-text-tertiary)',
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

      {/* Floating Menu */}
      {createPortal(
        <AnimatePresence>
          {openMenuId !== null && (() => {
            const page = pages.find(p => p.id === openMenuId);
            if (!page) return null;

            return (
              <div
                className="fixed inset-0"
                style={{ zIndex: 'var(--z-context-menu-layer)' }}
                onClick={handleCloseMenu}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="fixed liquidGlass-wrapper"
                  data-menu-id={openMenuId}
                  style={{
                    zIndex: 'calc(var(--z-context-menu-layer) + 1)',
                    top: menuPosition.y,
                    left: menuPosition.x,
                    minWidth: '150px',
                    borderRadius: '0.8em',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="liquidGlass-content p-1">
                    <ul className="list-none m-0 p-0">
                      <li>
                        <button
                          onClick={() => {
                            handleEditPage(page);
                            handleCloseMenu();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all"
                          style={{
                            color: 'var(--c-content)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 15%, transparent)';
                            e.currentTarget.style.color = 'var(--c-action)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--c-content)';
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(page.url).catch(console.error);
                            handleCloseMenu();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all"
                          style={{
                            color: 'var(--c-content)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 15%, transparent)';
                            e.currentTarget.style.color = 'var(--c-action)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--c-content)';
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setPages(prev => prev.filter(p => p.id !== page.id));
                            handleCloseMenu();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all"
                          style={{
                            color: 'var(--c-content)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 15%, transparent)';
                            e.currentTarget.style.color = 'var(--c-action)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--c-content)';
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
