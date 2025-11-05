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
        marginTop: '1.5rem',
        marginBottom: '0.5rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

