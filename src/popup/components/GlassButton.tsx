import React from 'react';

interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "default" | "primary" | "destructive";
  icon?: React.ReactNode;
}

export function GlassButton({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled = false,
  icon,
  style,
  type,
  ...rest
}: GlassButtonProps) {
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";
  const hasChildren = children !== null && children !== undefined && children !== "";
  const buttonType = type ?? "button";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={buttonType}
      className={`glass-button disabled:opacity-50 disabled:cursor-not-allowed relative ${className} ${isPrimary ? 'primary' : ''} ${isDestructive ? 'destructive' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: hasChildren ? 'flex-start' : 'center',
        gap: hasChildren ? '0.5rem' : '0',
        whiteSpace: 'nowrap',
        ...style
      }}
      {...rest}
    >
      {icon}
      {hasChildren && (
        <span
          style={{
            font: 'var(--font-body)',
            letterSpacing: 'var(--letter-spacing-body)',
            fontWeight: 500,
          }}
        >
          {children}
        </span>
      )}
    </button>
  );
}
