import React from 'react';
import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div
      className="px-4 py-3 flex items-center justify-between flex-shrink-0"
      style={{
        borderBottom: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
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
        className="rounded-lg p-2 transition-all hover-destructive"
        style={{
          background: 'transparent',
          border: '1px solid transparent',
          color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
          cursor: 'pointer'
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
