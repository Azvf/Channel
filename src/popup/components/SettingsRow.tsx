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
      className={`settings-row ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '44px',
        padding: '0.625rem 0.75rem',
        borderRadius: '0.5rem',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        transition: 'background-color var(--transition-fast) var(--ease-smooth)',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onMouseEnter={(e) => {
        if (onClick && !disabled) {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--c-glass) 12%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick && !disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      {/* 左侧：图标 + 标签 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
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
              color: 'color-mix(in srgb, var(--c-content) 70%, transparent)',
            }}
          >
            {icon}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem',
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'var(--c-content)',
              userSelect: 'none',
            }}
          >
            {label}
          </span>
          {value && (
            <span
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 400,
                color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
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
          marginLeft: '0.75rem',
        }}
        onClick={(e) => {
          // 阻止点击事件冒泡到行，让控件自己处理点击
          // 对于 Checkbox 等控件，它们会在内部处理自己的点击
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          // 阻止 mousedown 事件冒泡，确保控件能正常响应
          e.stopPropagation();
        }}
      >
        {control}
      </div>
    </div>
  );

  return rowContent;
}

