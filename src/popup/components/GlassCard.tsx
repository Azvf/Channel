import React from 'react';

// 让 Props 继承 HTMLAttributes，支持所有标准的 div 属性
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassCard({ 
  children, 
  className = "", 
  style = {}, 
  ...rest // 接收所有剩余属性（包括 onClick, onMouseEnter 等）
}: GlassCardProps) {
  return (
    <div 
      className={`liquidGlass-wrapper ${className}`} 
      style={style}
      {...rest} // 将剩余属性（包括 onClick）传递给这个 div
    >
      <div className="liquidGlass-content">
        {children}
      </div>
    </div>
  );
}
