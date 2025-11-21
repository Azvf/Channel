// React import not needed in React 17+
import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{
        // [Refactor] Standard Spacing & Border
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border-glass-subtle)'
      }}
    >
      <h2
        style={{
          font: 'var(--font-header-title)',
          letterSpacing: 'var(--letter-spacing-header-title)',
          color: 'var(--color-text-primary)',
          margin: 0
        }}
      >
        {title}
      </h2>

      <button
        onClick={onClose}
        className="rounded-lg transition-all hover-destructive"
        style={{
          // [Refactor] Standard Button Sizing
          padding: 'var(--space-2)',
          background: 'transparent',
          border: '1px solid transparent',
          color: 'var(--color-text-tertiary)',
          cursor: 'pointer'
        }}
      >
        <X className="icon-base" />
      </button>
    </div>
  );
}
