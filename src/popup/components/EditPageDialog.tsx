import { useState, useEffect } from "react";
import { GlassInput } from "./GlassInput";
import { TagInput } from "./TagInput";
import { GlassButton } from "./GlassButton";
import { X, Save } from "lucide-react";

interface EditPageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  page: {
    id: number;
    title: string;
    url: string;
    tags: string[];
    screenshot: string;
  };
  onSave: (updatedPage: {
    id: number;
    title: string;
    url: string;
    tags: string[];
    screenshot: string;
  }) => void;
}

export function EditPageDialog({ isOpen, onClose, page, onSave }: EditPageDialogProps) {
  const [editedTitle, setEditedTitle] = useState(page.title);
  const [editedTags, setEditedTags] = useState<string[]>(page.tags);

  // Reset form when page changes or dialog opens
  useEffect(() => {
    setEditedTitle(page.title);
    setEditedTags(page.tags);
  }, [page, isOpen]);

  const handleSave = () => {
    onSave({
      ...page,
      title: editedTitle.trim() || page.title,
      tags: editedTags,
    });
    onClose();
  };

  const handleCancel = () => {
    setEditedTitle(page.title);
    setEditedTags(page.tags);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200]"
        style={{
          background: 'color-mix(in srgb, var(--c-glass) 40%, transparent)',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 200ms ease-out'
        }}
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div
        className="fixed z-[201] rounded-2xl border overflow-hidden"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 48px)',
          maxWidth: '320px',
          background: 'color-mix(in srgb, var(--c-bg) 96%, transparent)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderColor: 'color-mix(in srgb, var(--c-glass) 45%, transparent)',
          boxShadow: `
            0 0 0 1px color-mix(in srgb, var(--c-glass) 12%, transparent),
            0 2px 4px -1px color-mix(in srgb, var(--c-glass) 10%, transparent),
            0 4px 8px -2px color-mix(in srgb, var(--c-glass) 15%, transparent),
            0 8px 16px -4px color-mix(in srgb, var(--c-glass) 20%, transparent),
            0 16px 32px -8px color-mix(in srgb, var(--c-glass) 25%, transparent),
            0 32px 64px -16px color-mix(in srgb, var(--c-glass) 30%, transparent)
          `,
          animation: 'dialogSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            borderBottom: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
          }}
        >
          <h2
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--c-content)',
              letterSpacing: '-0.02em',
              margin: 0
            }}
          >
            Edit Page
          </h2>

          <button
            onClick={handleCancel}
            className="rounded-lg p-2 transition-all"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)',
              color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 35%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 20%, transparent)';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3.5 space-y-3.5">
          {/* URL Display (Read-only) */}
          <div>
            <label
              className="block mb-1.5"
              style={{
                fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            URL
          </label>
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))',
              fontWeight: 500,
              wordBreak: 'break-all'
            }}
          >
              {page.url}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label
              className="block mb-1.5"
              style={{
                fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            Title
          </label>
            <GlassInput
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Enter page title"
            />
          </div>

          {/* Tags Input */}
          <div>
            <label
              className="block mb-1.5"
              style={{
                fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            Tags
          </label>
            <TagInput
              tags={editedTags}
              onTagsChange={setEditedTags}
              placeholder="Add or remove tags"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center justify-end gap-2"
          style={{
            borderTop: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
          }}
        >
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)',
              color: 'var(--c-content)',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 35%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 25%, transparent)';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
            style={{
              background: 'color-mix(in srgb, var(--c-action) 100%, transparent)',
              border: '1.5px solid color-mix(in srgb, var(--c-action) 100%, transparent)',
              color: 'var(--c-bg)',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              boxShadow: '0 2px 8px -2px color-mix(in srgb, var(--c-action) 40%, transparent)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 85%, var(--c-bg))';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px -2px color-mix(in srgb, var(--c-action) 50%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 100%, transparent)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px -2px color-mix(in srgb, var(--c-action) 40%, transparent)';
            }}
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes dialogSlideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -48%) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}
      </style>
    </>
  );
}
