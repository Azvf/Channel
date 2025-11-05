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
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
        marginTop: '1.5rem',
        marginBottom: '0.5rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

