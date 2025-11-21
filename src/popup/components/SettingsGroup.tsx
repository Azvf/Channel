import React from 'react';

interface SettingsGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsGroup({ children, className = '' }: SettingsGroupProps) {
  return (
    <div
      className={`settings-group ${className}`}
      style={{
        // [Refactor] Tokenized Shape & Surface
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-glass-subtle)',
        background: 'var(--bg-surface-glass-subtle)',
        
        // [Refactor] Tokenized Layout
        padding: 'var(--space-2)', // 8px
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)', // 4px
      }}
    >
      {children}
    </div>
  );
}

