/**
 * DropdownLayout Component
 * 下拉布局复合组件
 * 
 * 目的：提供声明式的布局结构（Body + Footer），利用 Flexbox 实现自适应布局
 */

import React from 'react';
import { cn } from '@/popup/utils/cn';
import { GlassCard } from '../GlassCard';

/**
 * DropdownLayout 主组件
 * 
 * 通过 CSS 变量传递配置，避免硬编码像素计算
 */
interface DropdownLayoutProps {
  children: React.ReactNode;
  className?: string;
  /** 最大可见行数（3 或 4） */
  maxRows?: 3 | 4;
  style?: React.CSSProperties;
  /** GlassCard 的其他属性 */
  depthLevel?: number;
  id?: string;
  role?: string;
  'data-sticky-dropdown'?: boolean;
}

export const DropdownLayout: React.FC<DropdownLayoutProps> = ({ 
  children, 
  className,
  maxRows = 3,
  style,
  depthLevel = 1,
  id,
  role,
  'data-sticky-dropdown': dataStickyDropdown,
}) => {
  return (
    <GlassCard
      depthLevel={depthLevel}
      className={cn("flex flex-col overflow-hidden", className)}
      style={{
        // 通过 CSS 变量传递行数配置，CSS 负责计算高度
        '--visible-rows': maxRows,
        // 保持原有的样式
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-elevation-high)',
        border: 'var(--border-width-base) solid var(--border-glass-subtle)',
        ...style
      } as React.CSSProperties}
      id={id}
      role={role}
      data-sticky-dropdown={dataStickyDropdown}
    >
      <div className="tag-input-dropdown-container">
        {children}
      </div>
    </GlassCard>
  );
};

/**
 * DropdownBody 滚动区域组件
 * 
 * 可滚动的内容区域，利用布局边界优化性能
 */
export const DropdownBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="tag-input-dropdown-scrollable">
    {children}
  </div>
);

/**
 * DropdownFooter 固定底部组件
 * 
 * 固定在底部的操作区域，不参与滚动
 */
export const DropdownFooter: React.FC<{ 
  children: React.ReactNode;
  showSeparator?: boolean;
}> = ({ children, showSeparator = false }) => (
  <div className="tag-input-dropdown-fixed">
    {showSeparator && (
      <div className="tag-input-dropdown-separator" />
    )}
    {children}
  </div>
);

