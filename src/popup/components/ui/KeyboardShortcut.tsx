import React, { useState } from 'react';
import { isMacPlatform } from '@/popup/utils/platform';

export interface KeyboardShortcutProps {
  /**
   * 快捷键字符串，格式如 "Meta+K" 或 "Ctrl+Shift+K"
   * 支持的修饰键：Meta (⌘), Ctrl, Alt (⌥), Shift (⇧)
   */
  shortcut: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * KeyboardShortcut 组件
 * 根据平台自动格式化快捷键显示
 * 
 * Mac: ⌘K, ⌥K, ⇧K
 * Windows: Ctrl+K, Alt+K, Shift+K
 */
export function KeyboardShortcut({ 
  shortcut, 
  className = '',
  style 
}: KeyboardShortcutProps) {
  const isMac = isMacPlatform();
  const [isHovered, setIsHovered] = useState(false);
  
  // 解析快捷键字符串
  const parts = shortcut.split('+').map(part => part.trim());
  
  // 修饰键映射
  const modifierMap: Record<string, { mac: string; windows: string }> = {
    Meta: { mac: '⌘', windows: 'Ctrl' },
    Ctrl: { mac: '⌃', windows: 'Ctrl' },
    Control: { mac: '⌃', windows: 'Ctrl' },
    Alt: { mac: '⌥', windows: 'Alt' },
    Shift: { mac: '⇧', windows: 'Shift' },
  };
  
  // 格式化每个部分
  const formattedParts = parts.map(part => {
    const key = part.charAt(0).toUpperCase() + part.slice(1);
    if (modifierMap[key]) {
      return isMac ? modifierMap[key].mac : modifierMap[key].windows;
    }
    // 普通按键，首字母大写
    return key.length === 1 ? key.toUpperCase() : key;
  });
  
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-0_5)',
        font: 'var(--font-caption)',
        letterSpacing: 'var(--letter-spacing-caption)',
        color: isHovered ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
        userSelect: 'none',
        opacity: isHovered ? 1 : 0.7,
        transition: 'opacity var(--transition-fast) var(--ease-smooth), color var(--transition-fast) var(--ease-smooth)',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Keyboard shortcut: ${shortcut}`}
    >
      {formattedParts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span style={{ opacity: isHovered ? 0.6 : 0.4 }}>+</span>
          )}
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '1.125rem',
              height: '1.125rem',
              padding: '0 calc(var(--space-1) * 0.75)',
              font: 'inherit',
              fontSize: '0.6875rem',
              lineHeight: 1,
              color: 'inherit',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              boxShadow: 'none',
            }}
          >
            {part}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

