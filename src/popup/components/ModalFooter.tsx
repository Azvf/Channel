import React from 'react';

interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div
      className="flex items-center justify-end flex-shrink-0"
      style={{
        // [Refactor] Standard Spacing & Border
        padding: 'var(--space-3) var(--space-4)',
        gap: 'var(--space-2)',
        borderTop: '1px solid var(--border-glass-subtle)'
      }}
    >
      {children}
    </div>
  );
}
