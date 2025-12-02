// React import not needed in React 17+
import { X } from 'lucide-react';
import { IconButton } from './ui/buttons';

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

      <IconButton
        onClick={onClose}
        variant="destructive"
        icon={<X className="icon-base" />}
        aria-label="Close"
      />
    </div>
  );
}
