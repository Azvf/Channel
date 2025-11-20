import React from 'react';

interface SocialLoginButtonProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export function SocialLoginButton({ icon, label, disabled, onClick }: SocialLoginButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-default"
      style={{
        background: 'color-mix(in srgb, var(--c-glass) 20%, transparent)',
        border: '1px solid color-mix(in srgb, var(--c-light) 15%, transparent)',
        fontSize: '0.85rem',
        fontWeight: 500,
        color: 'var(--c-content)',
        cursor: disabled ? 'default' : 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

