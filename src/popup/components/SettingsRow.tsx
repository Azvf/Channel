import React from 'react';

interface SettingsRowProps {
  icon?: React.ReactNode;
  label: string;
  control: React.ReactNode;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SettingsRow({
  icon,
  label,
  control,
  value,
  onClick,
  disabled = false,
  className = '',
}: SettingsRowProps) {
  const rowContent = (
    <div
      className={`settings-row ${className} ${onClick && !disabled ? 'hover-glass' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        // [Design System] Layout Tokens
        minHeight: 'var(--row-min-height)',
        padding: 'var(--space-2_5) var(--space-3)', // 10px 12px
        borderRadius: 'var(--radius-md)',
        gap: 'var(--space-3)', // 确保左右布局有最小间距
        
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        background: 'transparent'
      }}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      {/* 左侧：图标 + 标签 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)', // 12px
          flex: 1,
          minWidth: 0,
        }}
      >
        {icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              // [Design System] Color Token
              color: 'var(--color-text-secondary)',
            }}
          >
            {icon}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-0_5)', // 2px - 标题和副标题的紧凑间距
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              font: 'var(--font-list-item)',
              color: 'var(--color-text-primary)',
              userSelect: 'none',
            }}
          >
            {label}
          </span>
          {value && (
            <span
              style={{
                font: 'var(--font-footnote)',
                letterSpacing: 'var(--letter-spacing-footnote)',
                color: 'var(--color-text-secondary)',
                userSelect: 'none',
              }}
            >
              {value}
            </span>
          )}
        </div>
      </div>

      {/* 右侧：控件 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0,
          marginLeft: 'var(--space-3)', // 12px
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {control}
      </div>
    </div>
  );

  return rowContent;
}

