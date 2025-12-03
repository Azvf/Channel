import React from 'react';

interface SettingsRowProps {
  icon?: React.ReactNode;
  label: string;
  control: React.ReactNode;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SettingsRow({
  icon,
  label,
  control,
  value,
  onClick,
  disabled = false,
  className = '',
  style,
}: SettingsRowProps) {
  return (
    <div
      className={`settings-row ${className} ${onClick && !disabled ? 'hover-glass' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        // [Refactor] Tokenized Layout
        minHeight: 'var(--row-min-height)',
        padding: 'var(--space-2_5) var(--space-3)', // 10px 12px
        borderRadius: 'var(--radius-md)',
        gap: 'var(--space-3)', 
        
        cursor: onClick && !disabled ? 'pointer' : 'default',
        // [Refactor] 使用标准透明度 Token
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        background: 'transparent',
        ...style
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
              font: 'var(--font-body)',
              color: 'var(--color-text-primary)',
              userSelect: 'none',
            }}
          >
            {label}
          </span>
          {value && (
            <span
              style={{
                font: 'var(--font-caption)',
                letterSpacing: 'var(--letter-spacing-caption)',
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
}

