/**
 * ShortcutBadge Component
 * 快捷键徽标组件
 * 
 * 目的：显示快捷键提示，模拟物理键帽样式（Desktop Only）
 */


export interface ShortcutBadgeProps {
  /** 快捷键键名数组（如 ['Shift', 'Enter']） */
  keys: string[];
  /** 自定义类名 */
  className?: string;
}

/**
 * ShortcutBadge 组件
 * 
 * 显示快捷键提示，使用物理键帽样式
 * 在移动端通过 CSS Media Query 自动隐藏
 */
export function ShortcutBadge({ keys, className = '' }: ShortcutBadgeProps) {
  if (keys.length === 0) {
    return null;
  }

  return (
    <div 
      className={`flex items-center gap-1 ${className}`}
      style={{
        // 使用 CSS 变量
        fontFamily: 'var(--font-family)',
      }}
    >
      {keys.map((key, index) => (
        <kbd
          key={`${key}-${index}`}
          className="shortcut-badge-key"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-0_5) var(--space-1)',
            background: 'transparent',
            border: 'var(--border-width-base) solid',
            borderColor: 'rgba(128, 128, 128, 0.3)',
            borderRadius: 'var(--radius-xs)',
            font: 'var(--font-micro)',
            fontSize: 'var(--font-micro-size)',
            fontWeight: 'var(--font-micro-weight)',
            color: 'var(--color-text-tertiary)',
            lineHeight: 1,
            minWidth: 'var(--space-4)',
            textAlign: 'center',
            // 移动端隐藏（通过 CSS Media Query）
            // 在 CSS 中定义 @media (hover: none) { .shortcut-badge-key { display: none; } }
          }}
        >
          {key === 'Enter' ? '↵' : key === 'Shift' ? 'Shift' : key}
        </kbd>
      ))}
    </div>
  );
}

