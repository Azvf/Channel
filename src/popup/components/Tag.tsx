import { X, Pencil } from "lucide-react";
import { ContextMenu } from "./ContextMenu";

interface TagProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function Tag({ label, onRemove, className = "" }: TagProps) {
  
  // Context Menu Items
  const menuItems = [
    {
      label: "Edit Tag",
      icon: <Pencil />,
      onClick: () => {
        // Placeholder: Implement edit logic
        console.log("Edit tag:", label); 
      },
    },
  ];

  return (
    <ContextMenu menuItems={menuItems} className={`inline-flex ${className}`}>
      <div 
        className="liquidGlass-wrapper relative"
        style={{
          borderRadius: '99em' // 覆盖默认的 1.4em，保持 tag 的圆形外观
        }}
      >
        <div className="liquidGlass-content flex items-center gap-2 group">
          <span 
            className="whitespace-nowrap px-2.5 py-1"
            style={{
              color: 'var(--c-content)',
              fontSize: '0.75rem',
              fontWeight: 500,
              userSelect: 'none'
            }}
          >
            {label}
          </span>
          
          {onRemove && (
            <button
              onClick={onRemove}
              className="transition-all rounded-full p-0.5 mr-1.5 
                         hover:bg-[color-mix(in_srgb,var(--c-dark)_15%,transparent)] 
                         hover:text-[var(--c-content)]"
              aria-label="Remove tag"
              style={{
                color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
                background: 'transparent',
                flexShrink: 0
              }}
            >
              <X 
                className="w-3 h-3" 
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>
    </ContextMenu>
  );
}
