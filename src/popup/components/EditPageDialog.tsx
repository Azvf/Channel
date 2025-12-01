import { useState, useEffect, useRef } from "react";
import { GlassInput } from "./GlassInput";
import { TagInput } from "./TagInput";
import { FunctionalModal } from "./FunctionalModal";
import { ModalFooter } from "./ModalFooter";
import { Save } from "lucide-react";
import { TaggedPage } from "../../shared/types/gameplayTag";
import { GlassButton } from "./GlassButton";
import { useModalScrollLock } from "../hooks/headless/useModalScrollLock";

interface EditPageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  page: TaggedPage;
  initialTagNames: string[];
  onSave: (payload: { title: string; tagNames: string[] }) => void | Promise<void>;
  allSuggestions?: string[];
}

// Helper for label style to ensure consistency without extra CSS classes
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-1)',
  font: 'var(--font-label)',
  letterSpacing: 'var(--letter-spacing-label)',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase'
};

export function EditPageDialog({
  isOpen,
  onClose,
  page,
  onSave,
  initialTagNames,
  allSuggestions = [],
}: EditPageDialogProps) {
  const [editedTitle, setEditedTitle] = useState(page.title);
  const [editedTags, setEditedTags] = useState<string[]>(initialTagNames);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when page changes or dialog opens
  useEffect(() => {
    setEditedTitle(page.title);
    setEditedTags(initialTagNames);
  }, [page, initialTagNames, isOpen]);

  // 预加载背景图片，避免闪烁
  useEffect(() => {
    if (!isOpen || !page.coverImage) {
      setBackgroundImageLoaded(false);
      return;
    }

    setBackgroundImageLoaded(false);
    const img = new Image();
    
    img.onload = () => {
      setBackgroundImageLoaded(true);
    };
    
    img.onerror = () => {
      // 图片加载失败，降级到默认背景
      setBackgroundImageLoaded(false);
    };
    
    img.src = page.coverImage;
  }, [isOpen, page.coverImage, page.id]);

  // 使用 Headless Hook 处理 Modal 滚动锁定
  useModalScrollLock({
    isOpen,
    modalRef,
    scrollableContentRef,
  });

  const handleSave = async () => {
    try {
      await Promise.resolve(
        onSave({
          title: editedTitle.trim() || page.title,
          tagNames: editedTags,
        }),
      );
    } catch (error) {
      console.error('保存页面失败:', error);
    }
  };

  const handleCancel = () => {
    setEditedTitle(page.title);
    setEditedTags(initialTagNames);
    onClose();
  };

  const footer = (
    <ModalFooter>
      <GlassButton onClick={handleCancel} variant="secondary">Cancel</GlassButton>
      <GlassButton 
        onClick={handleSave} 
        variant="primary" 
        icon={<Save className="icon-base" />}
      >
        Save
      </GlassButton>
    </ModalFooter>
  );

  return (
    <FunctionalModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Edit Page"
      footer={footer}
      modalRef={modalRef}
      contentRef={scrollableContentRef}
      contentStyle={{
        padding: 'var(--space-3) var(--space-3) var(--space-2)',
      }}
      backgroundImage={backgroundImageLoaded ? page.coverImage : undefined}
    >
      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label style={labelStyle}>Title</label>
          <GlassInput
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Enter page title"
            as="textarea"
            rows={2}
          />
        </div>

        {/* Tags Input */}
        <div>
          <label style={labelStyle}>Tags</label>
          <TagInput
            tags={editedTags}
            onTagsChange={setEditedTags}
            placeholder="Add or remove tags"
            suggestions={allSuggestions}
            excludeTags={editedTags}
            allowCreation={true}
            dropdownZIndex="var(--z-tooltip)"
          />
        </div>

        {/* URL Display */}
        <div>
          <label style={labelStyle}>URL</label>
          <div
            className="px-2.5 py-1.5 rounded-lg"
            style={{
              background: 'var(--bg-surface-glass-subtle)',
              border: '1px solid var(--border-glass-subtle)',
              font: 'var(--font-small)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 500,
              wordBreak: 'break-all',
              lineHeight: 1.4
            }}
          >
            {page.url}
          </div>
        </div>
      </div>
    </FunctionalModal>
  );
}
