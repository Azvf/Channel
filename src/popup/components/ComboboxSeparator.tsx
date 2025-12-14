/**
 * ComboboxSeparator Component
 * 分割线组件
 * 
 * 目的：在匹配项和 Create 选项之间添加分割线
 */


export interface ComboboxSeparatorProps {
  /** 自定义类名 */
  className?: string;
}

/**
 * ComboboxSeparator 组件
 * 
 * 在选项列表中显示分割线，用于区分匹配项和 Create 选项
 */
export function ComboboxSeparator({ className = '' }: ComboboxSeparatorProps) {
  return (
    <div
      className={`combobox-separator ${className}`}
      role="separator"
      aria-orientation="horizontal"
      style={{
        height: 'var(--border-width-base)',
        margin: 'var(--space-1_5) 0',
        background: 'var(--border-glass-subtle)',
        border: 'none',
      }}
    />
  );
}

