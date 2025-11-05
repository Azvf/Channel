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
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--c-content)',
          letterSpacing: '-0.02em',
          margin: 0
        }}
      >
        {title}
      </h2>

      <button
        onClick={onClose}
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
  );
}
