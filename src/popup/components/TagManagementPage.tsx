import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ContextMenu } from "./ContextMenu";
import { useLongPress } from "../utils/useLongPress";
import { currentPageService } from "../../services/popup/currentPageService";
import { GameplayTag } from "../../types/gameplayTag";

interface TagRowProps {
  tag: GameplayTag;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTag: (tag: GameplayTag) => void;
  onDeleteTag: (tagId: string) => void;
  onOpenMenu: (e: React.MouseEvent | React.TouchEvent, tagId: string) => void;
  getTagUsageCount: (tagId: string) => number;
  menuButtonRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

function TagRow({
  tag,
  isEditing,
  editValue,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onEditTag,
  onDeleteTag,
  onOpenMenu,
  getTagUsageCount,
  menuButtonRefs
}: TagRowProps) {
  const longPressHandlers = useLongPress({
    onLongPress: (e) => onOpenMenu(e, tag.id),
    delay: 500
  });

  if (isEditing) {
    return (
      <GlassCard className="p-3">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSaveEdit();
            } else if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
          autoFocus
          className="w-full bg-transparent outline-none"
          style={{
            color: 'var(--c-content)',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        />
      </GlassCard>
    );
  }

  return (
    <ContextMenu
      menuItems={[
        {
          label: "Edit",
          icon: <Pencil />,
          onClick: () => onEditTag(tag),
        },
        {
          label: "Delete",
          icon: <Trash2 />,
          onClick: () => onDeleteTag(tag.id),
        },
      ]}
    >
      <div
        ref={(el) => {
          if (el) {
            menuButtonRefs.current.set(tag.id, el);
          } else {
            menuButtonRefs.current.delete(tag.id);
          }
        }}
        {...longPressHandlers}
        className="liquidGlass-wrapper rounded-lg p-3 cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--c-glass)_15%,transparent)]"
        style={{
          border: '1px solid color-mix(in srgb, var(--c-glass) 15%, transparent)'
        }}
      >
        <div className="liquidGlass-content flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* 标签颜色指示器 */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor: tag.color || 'var(--c-action)'
              }}
            />
            {/* 标签名称 */}
            <span
              className="truncate"
              style={{
                color: 'var(--c-content)',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
            >
              {tag.name}
            </span>
          </div>
          {/* 使用计数 */}
          <span
            style={{
              color: 'color-mix(in srgb, var(--c-content) 50%, transparent)',
              fontSize: '0.75rem',
              fontWeight: 400
            }}
          >
            {getTagUsageCount(tag.id)} uses
          </span>
        </div>
      </div>
    </ContextMenu>
  );
}

interface TagManagementPageProps {
  onBack: () => void;
}

export function TagManagementPage({ onBack }: TagManagementPageProps) {
  const [tags, setTags] = useState<GameplayTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<GameplayTag | null>(null);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const allTags = await currentPageService.getAllTags();
      setTags(allTags);
    } catch (error) {
      console.error('加载标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTag = (tag: GameplayTag) => {
    setEditingTag(tag);
    setEditValue(tag.name);
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTag || !editValue.trim()) {
      setEditingTag(null);
      return;
    }

    try {
      // TODO: 实现更新标签的 API
      console.log('更新标签:', editingTag.id, editValue.trim());
      // await currentPageService.updateTag(editingTag.id, editValue.trim());
      await loadTags();
      setEditingTag(null);
      setEditValue("");
    } catch (error) {
      console.error('更新标签失败:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      // TODO: 实现删除标签的 API
      console.log('删除标签:', tagId);
      // await currentPageService.deleteTag(tagId);
      await loadTags();
      setMenuOpen(null);
    } catch (error) {
      console.error('删除标签失败:', error);
    }
  };

  const handleOpenMenu = (e: React.MouseEvent | React.TouchEvent, tagId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 150,
      y: rect.bottom + 8
    });
    setMenuOpen(tagId);
  };

  const handleCloseMenu = () => {
    setMenuOpen(null);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    if (menuOpen === null) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuElement = document.querySelector('[data-menu-tag-id]');
      const buttonElement = menuButtonRefs.current.get(menuOpen);
      
      if (menuElement && !menuElement.contains(target) && 
          buttonElement && !buttonElement.contains(target)) {
        handleCloseMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // 计算标签使用次数（需要从所有页面中统计）
  const getTagUsageCount = (tagId: string): number => {
    // TODO: 实现获取标签使用次数的逻辑
    return 0;
  };

  if (loading) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)'
            }}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
          </button>
          <h2 style={{ 
            color: 'var(--c-content)',
            fontSize: '1.1rem',
            fontWeight: 600,
            margin: 0
          }}>
            Tag Library
          </h2>
        </div>
        <div style={{ 
          color: 'color-mix(in srgb, var(--c-content) 50%, transparent)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{
            background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c-glass) 30%, transparent)'
          }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--c-action)' }} />
        </button>
        <h2 style={{ 
          color: 'var(--c-content)',
          fontSize: '1.1rem',
          fontWeight: 600,
          margin: 0
        }}>
          Tag Library
        </h2>
      </div>

      <div className="space-y-2">
        {tags.length === 0 ? (
          <div style={{ 
            color: 'color-mix(in srgb, var(--c-content) 40%, transparent)',
            textAlign: 'center',
            padding: '2rem'
          }}>
            No tags yet
          </div>
        ) : (
          tags.map((tag) => {
            const isEditing = editingTag?.id === tag.id;
            
            return (
              <TagRow
                key={tag.id}
                tag={tag}
                isEditing={isEditing}
                editValue={editValue}
                onEditValueChange={setEditValue}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => {
                  setEditingTag(null);
                  setEditValue("");
                }}
                onEditTag={handleEditTag}
                onDeleteTag={handleDeleteTag}
                onOpenMenu={handleOpenMenu}
                getTagUsageCount={getTagUsageCount}
                menuButtonRefs={menuButtonRefs}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

