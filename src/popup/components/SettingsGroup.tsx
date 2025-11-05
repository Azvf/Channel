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
        borderRadius: '0.75rem',
        border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)',
        background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      {children}
    </div>
  );
}

