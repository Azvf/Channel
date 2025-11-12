import React from 'react';

// 让 Props 继承 HTMLAttributes，支持所有标准的 div 属性
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function GlassCard({ 
  children, 
  className = "", 
  style = {}, 
  disabled = false,
  onClick,
  ...rest // 接收所有剩余属性（包括 onMouseEnter 等）
}: GlassCardProps) {
  const combinedClassName = `liquidGlass-wrapper ${className}`.trim();
  const finalClassName = disabled ? `${combinedClassName} glasscard-disabled` : combinedClassName;

  const handleClick: React.MouseEventHandler<HTMLDivElement> | undefined = disabled
    ? (event) => {
        event.preventDefault();
        event.stopPropagation();
      }
    : onClick;

  return (
    <div 
      className={finalClassName} 
      style={style}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      {...rest} // 将剩余属性（包括 onMouseEnter 等）传递给这个 div
    >
      <div className="liquidGlass-content">
        {children}
      </div>
    </div>
  );
}
