interface GlassButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary";
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function GlassButton({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled = false,
  icon
}: GlassButtonProps) {
  const isPrimary = variant === "primary";
  const hasChildren = children !== null && children !== undefined && children !== "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`glass-button disabled:opacity-50 disabled:cursor-not-allowed relative ${className} ${isPrimary ? 'primary' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: hasChildren ? 'flex-start' : 'center',
        gap: hasChildren ? '0.5rem' : '0',
        whiteSpace: 'nowrap'
      }}
    >
      {icon}
      {hasChildren && (
        <span 
          style={{ 
            fontSize: '0.85rem',
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}
        >
          {children}
        </span>
      )}
    </button>
  );
}
