interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassCard({ children, className = "", style = {} }: GlassCardProps) {
  return (
    <div className={`liquidGlass-wrapper ${className}`} style={style}>
      <div className="liquidGlass-content">
        {children}
      </div>
    </div>
  );
}
