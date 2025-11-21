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
        // [Refactor] 使用 Surface Glass
        background: 'var(--bg-surface-glass)',
        // [Refactor] 使用 Subtle Border
        border: '1px solid var(--border-glass-subtle)',
        // [Refactor] 使用标准字体 Token，移除冗余 fontSize
        font: 'var(--font-body)',
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        cursor: disabled ? 'default' : 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

