import React from 'react';

interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div
      className="px-4 py-3 flex items-center justify-end gap-2 flex-shrink-0"
      style={{
        borderTop: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
      }}
    >
      {children}
    </div>
  );
}
