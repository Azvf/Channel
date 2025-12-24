// React import not needed in React 17+
import { X } from 'lucide-react';
import { IconButton } from './ui/buttons';
import { cn } from '../utils/cn';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  className?: string; // 支持外部微调
}

export function ModalHeader({ title, onClose, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        // 1. 布局基础
        "flex items-center justify-between flex-shrink-0",
        // 2. 空间与边框 (移除 inline style)
        "px-4 py-3 border-b border-[var(--border-glass-subtle)]",
        // 3. [关键修复] 提升层级，防止按钮点击态被玻璃层吞没
        "relative z-50", 
        // 4. [关键修复] 防止圆角截断：如果是卡片的第一个子元素，应该略微远离圆角区域，或者自身拥有圆角
        // 这里我们选择通过 items-center 自动居中，但在极小的卡片上可能需要 mt-1
        className
      )}
    >
      <h2
        className="m-0 text-[var(--color-text-primary)] font-[var(--font-header-title)] tracking-[var(--letter-spacing-header-title)] select-none"
      >
        {title}
      </h2>

      <div className="relative group">
         {/* 包装一层 div 确保按钮的定位上下文纯净 */}
        <IconButton
          onClick={onClose}
          variant="ghost" // 建议改用 ghost，在玻璃背景上更自然，destructive 有时太突兀
          className="hover:bg-black/5 active:bg-black/10 transition-colors" // 自定义微弱的 hover 效果
          icon={<X className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />}
          aria-label="Close"
        />
      </div>
    </div>
  );
}
