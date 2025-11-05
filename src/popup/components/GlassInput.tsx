import React from "react";

interface GlassInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  as?: "input" | "textarea";
  rows?: number; // 用于textarea
}

export function GlassInput({ 
  value, 
  onChange, 
  onKeyDown,
  placeholder = "", 
  className = "",
  autoFocus = false,
  disabled = false,
  as = "input",
  rows = 2
}: GlassInputProps) {
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto focus on mount if autoFocus is true
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Use setTimeout to ensure the component is fully mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const commonProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onKeyDown,
    placeholder,
    disabled,
    className: `flex-1 min-w-0 px-4 py-2 bg-transparent outline-none relative ${className}`,
    style: { 
      zIndex: 'var(--z-content)',
      color: 'var(--c-content)',
      fontSize: '0.85rem',
      fontWeight: 400,
      letterSpacing: '0.01em',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
      resize: as === 'textarea' ? 'vertical' as const : undefined,
    } as React.CSSProperties,
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input container with glass effect */}
      <div className="liquidGlass-wrapper relative">
        {/* Content layer */}
        <div className={`liquidGlass-content flex items-${as === 'textarea' ? 'start' : 'center'}`}>
          {as === "textarea" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              rows={rows}
              {...commonProps}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              {...commonProps}
            />
          )}
        </div>
      </div>
    </div>
  );
}
