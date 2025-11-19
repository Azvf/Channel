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
          borderRadius: '99em'
        }}
      >
        {/* 调整 padding-right (pr-1 -> pr-1.5) 给删除按钮更多呼吸空间 */}
        <div className="tag-content flex items-center gap-0.5 pl-2.5 pr-1.5 py-1 group">
          <span 
            className="whitespace-nowrap mr-0.5"
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
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              // [修改] 使用无背景的 .hover-destructive-icon
              className="hover-destructive-icon w-5 h-5"
              aria-label={`Remove ${label}`}
              style={{
                flexShrink: 0,
                // 微调 margin 以视觉居中
                marginRight: '-2px' 
              }}
            >
              <X 
                className="w-3 h-3" 
                strokeWidth={2.5} 
              />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
