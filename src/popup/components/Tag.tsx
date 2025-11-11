import { X } from "lucide-react";
import { motion } from "framer-motion";
import { LAYOUT_TRANSITION } from "../utils/motion";

interface TagProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function Tag({ label, onRemove, className = "" }: TagProps) {
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
          borderRadius: '99em' // 覆盖默认的 1.4em，保持 tag 的圆形外观
        }}
      >
        {/* [修复] 移除 "liquidGlass-content"，它带来了 `width: 100%` 的副作用 */}
        <div className="tag-content flex items-center gap-2 group">
          <span 
            className="whitespace-nowrap px-2.5 py-1"
            style={{
              color: 'var(--color-text-primary)',
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
    </motion.div>
  );
}
