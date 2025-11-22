import { memo } from "react";
import { Trash2 } from "lucide-react";
import { useLongPress } from "../../utils/useLongPress";
import type { GameplayTag } from "../../../shared/types/gameplayTag";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";

interface TagRowProps {
  tag: GameplayTag;
  isEditing: boolean;
  editValue: string;
  usageCount: number;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTag: (tag: GameplayTag) => void;
  onDeleteTag: (tagId: string) => void;
  onOpenMenu: (e: ReactMouseEvent | ReactTouchEvent, tagId: string) => void;
  // 用于定位菜单的 ref callback
  setMenuButtonRef: (id: string, el: HTMLElement | null) => void;
}

// 使用 memo 优化渲染性能，只有 props 变化时才重绘
export const TagRow = memo(function TagRow({
  tag,
  isEditing,
  editValue,
  usageCount,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onEditTag,
  onDeleteTag,
  onOpenMenu,
  setMenuButtonRef
}: TagRowProps) {
  const longPressHandlers = useLongPress({
    onLongPress: (e) => onOpenMenu(e, tag.id),
    delay: 500
  });

  if (isEditing) {
    return (
      <div
        className="group relative flex items-center justify-between gap-3 p-3 rounded-lg"
        style={{
          // [Refactor] 使用 Active Surface 和 Action Border
          background: "var(--bg-surface-glass-active)",
          border: "1px solid var(--border-action-subtle)",
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color || "var(--c-action)" }}
          ></div>
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSaveEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit();
              }
            }}
            autoFocus
            className="flex-1 w-full bg-transparent outline-none"
            style={{
              color: "var(--color-text-primary)",
              font: "var(--font-body)",
              fontWeight: 500,
              padding: 0,
              margin: 0,
            }}
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            style={{
              color: "var(--color-text-secondary)",
              font: "var(--font-footnote)",
              fontWeight: 400,
              opacity: 1,
            }}
          >
            {usageCount} uses
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={(el) => setMenuButtonRef(tag.id, el)}
      {...longPressHandlers}
      className="group relative flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-all hover-glass"
      style={{
        background: 'transparent',
        border: '1px solid transparent'
      }}
      onContextMenu={(e) => onOpenMenu(e, tag.id)}
      onClick={() => onEditTag(tag)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color || 'var(--c-action)' }}
        />
        <span
          className="truncate"
          style={{
            color: 'var(--color-text-primary)',
            font: 'var(--font-body)',
            fontWeight: 500
          }}
        >
          {tag.name}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="transition-opacity duration-150 group-hover:opacity-0"
          style={{
            color: 'var(--color-text-secondary)',
            font: 'var(--font-footnote)',
            fontWeight: 400
          }}
        >
          {usageCount} uses
        </span>

        <div className="absolute right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteTag(tag.id); }}
            className="p-1.5 rounded-md transition-all hover-destructive"
            style={{
              color: 'var(--color-text-secondary)',
              background: 'transparent'
            }}
            title="删除标签"
          >
            <Trash2 className="icon-base" />
          </button>
        </div>
      </div>
    </div>
  );
});

