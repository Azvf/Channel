import React from 'react';

interface SettingsSectionTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SettingsSectionTitle({ children, className = '', style }: SettingsSectionTitleProps) {
  return (
    <div
      className={`settings-section-title ${className}`}
      style={{
        font: 'var(--font-section-title)',
        letterSpacing: 'var(--letter-spacing-section-title)',
        textTransform: 'uppercase',
        color: 'var(--color-text-secondary)',
        // [Refactor] Tokenized Margins
        marginTop: 'var(--space-6)',
        marginBottom: 'var(--space-2)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

