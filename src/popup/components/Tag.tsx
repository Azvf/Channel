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
      transition={{
        layout: LAYOUT_TRANSITION,
      }}
    >
      <div 
        className="liquidGlass-wrapper relative"
        style={{
          borderRadius: 'var(--radius-full)', // [Refactor] Tokenized
          ...variantStyles
        }}
      >
        {/* [修复] 移除 "liquidGlass-content"，它带来了 `width: 100%` 的副作用 */}
        <div className="tag-content flex items-center gap-2 group">
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
              onClick={onRemove}
              className="transition-all rounded-full p-0.5 mr-1.5 hover-destructive"
              aria-label="Remove tag"
              style={{
                // [Refactor] 使用标准次级文本色，hover 颜色由 hover-destructive 类控制
                color: 'var(--color-text-secondary)', 
                background: 'transparent',
                flexShrink: 0
              }}
            >
              <X 
                className="icon-xs" 
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
