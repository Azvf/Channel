import { X } from "lucide-react";
import { motion } from "framer-motion";
import { LAYOUT_TRANSITION } from "../utils/motion";

interface TagProps {
  label: string;
  onRemove?: () => void;
  className?: string;
  variant?: 'default' | 'subtle';
}

export function Tag({ label, onRemove, className = "", variant = 'default' }: TagProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'subtle':
        return {
          background: 'var(--bg-surface-glass-subtle)',
          color: 'var(--color-text-tertiary)',
        };
      case 'default':
      default:
        return {
          background: 'var(--bg-surface-glass)',
          color: 'var(--color-text-primary)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <motion.div
      className={`inline-flex ${className}`}
      layout
      initial={{ opacity: 0, scale: 0.8, width: 0 }} 
      animate={{ opacity: 1, scale: 1, width: "auto" }}
      exit={{ 
        opacity: 0, 
        scale: 0.5, 
        width: 0,
        transition: { duration: 0.15, ease: "easeInOut" }
      }}
      transition={{
        layout: LAYOUT_TRANSITION,
        opacity: { duration: 0.2 },
      }}
    >
      <div 
        className="liquidGlass-wrapper relative group cursor-text"
        style={{
          borderRadius: 'var(--radius-full)',
          ...variantStyles
        }}
      >
        <div className="tag-content flex items-center gap-2">
          <span 
            className="whitespace-nowrap px-2.5 py-1"
            style={{
              color: variantStyles.color,
              font: 'var(--font-tag)',
              letterSpacing: 'var(--letter-spacing-tag)',
              userSelect: 'none'
            }}
          >
            {label}
          </span>
          
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="transition-all rounded-full p-0.5 mr-1.5 hover-destructive"
              aria-label="Remove tag"
              style={{
                color: 'var(--color-text-secondary)', 
                background: 'transparent',
                flexShrink: 0,
                cursor: 'pointer'
              }}
            >
              <X 
                className="icon-xs transition-opacity opacity-40 group-hover:opacity-100" 
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
