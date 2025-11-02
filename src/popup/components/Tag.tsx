import { X } from "lucide-react";

interface TagProps {
  label: string;
  onRemove?: () => void;
  variant?: "default" | "input";
  className?: string;
}

export function Tag({ label, onRemove, variant = "default", className = "" }: TagProps) {
  return (
    <div className={`inline-flex ${className}`}>
      <div 
        className="liquidGlass-wrapper relative"
        style={{
          borderRadius: '99em' // 覆盖默认的 1.4em，保持 tag 的圆形外观
        }}
      >
        <div className="liquidGlass-content flex items-center gap-2 group">
          <span 
            className="whitespace-nowrap px-4 py-2"
            style={{
              color: 'var(--c-content)',
              fontSize: '0.85rem',
              fontWeight: 500,
              fontFamily: '"DM Sans", sans-serif',
              userSelect: 'none'
            }}
          >
            {label}
          </span>
          
          {onRemove && (
            <button
              onClick={onRemove}
              className="transition-all rounded-full p-0.5 mr-2"
              aria-label="Remove tag"
              style={{
                color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
                background: 'transparent',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--c-dark) 15%, transparent)';
                e.currentTarget.style.color = 'var(--c-content)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 60%, transparent)';
              }}
            >
              <X 
                className="w-3.5 h-3.5" 
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
