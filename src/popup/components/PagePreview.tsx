import { useState, useEffect, useRef } from "react";

interface PagePreviewProps {
  url: string;
  screenshot: string;
  title: string;
  forceClose?: boolean;
}

export function PagePreview({ url, screenshot, title, forceClose = false }: PagePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const faviconRef = useRef<HTMLDivElement>(null);

  // Force close when parent requests
  useEffect(() => {
    if (forceClose) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setShowPreview(false);
    }
  }, [forceClose]);

  // Calculate preview position when showing
  useEffect(() => {
    if (showPreview && faviconRef.current) {
      const rect = faviconRef.current.getBoundingClientRect();
      const previewWidth = 280;
      const previewHeight = 230; // Approximate height
      const gap = 12; // Gap between favicon and preview
      
      // Center horizontally relative to icon
      // Position preview so it's centered on the icon
      const iconCenterX = rect.left + rect.width / 2;
      let left = iconCenterX - previewWidth / 2;
      
      // Adjust if preview goes off screen edges
      if (left < 20) {
        left = 20;
      } else if (left + previewWidth > window.innerWidth - 20) {
        left = window.innerWidth - previewWidth - 20;
      }
      
      // Position vertically - show above icon if space, otherwise below
      let top;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      if (spaceAbove >= previewHeight + gap) {
        // Show above icon
        top = rect.top - previewHeight - gap;
      } else if (spaceBelow >= previewHeight + gap) {
        // Show below icon
        top = rect.bottom + gap;
      } else {
        // Center vertically if not enough space on either side
        top = Math.max(20, (window.innerHeight - previewHeight) / 2);
      }
      
      // Ensure top is within bounds
      top = Math.max(20, Math.min(top, window.innerHeight - previewHeight - 20));
      
      setPreviewPosition({ top, left });
    }
  }, [showPreview]);

  // Extract domain for favicon
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return "";
    }
  };

  const handleMouseEnter = () => {
    // Set timer to show preview after 0.5 second
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear timer and hide preview
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowPreview(false);
  };

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const faviconUrl = getFaviconUrl(url);

  return (
    <div 
      className="relative inline-flex items-center justify-center flex-shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={faviconRef}
    >
      {/* Favicon */}
      <div 
        className="w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden transition-all"
        style={{
          background: 'color-mix(in srgb, var(--c-glass) 12%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--c-glass) 30%, transparent)'
        }}
      >
        {!faviconError && faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="w-4 h-4"
            onError={() => setFaviconError(true)}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div 
            className="w-3.5 h-3.5 rounded"
            style={{
              background: 'color-mix(in srgb, var(--c-action) 50%, transparent)'
            }}
          />
        )}
      </div>

      {/* Preview Tooltip - Positioned near favicon */}
      {showPreview && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: `${previewPosition.left}px`,
            top: `${previewPosition.top}px`,
            animation: 'fadeInScale 250ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            className="rounded-2xl overflow-hidden border"
            style={{
              background: 'color-mix(in srgb, var(--c-bg) 96%, transparent)',
              backdropFilter: 'blur(24px) saturate(180%)',
              borderColor: 'color-mix(in srgb, var(--c-glass) 45%, transparent)',
              boxShadow: `
                0 0 0 1px color-mix(in srgb, var(--c-glass) 12%, transparent),
                0 2px 4px -1px color-mix(in srgb, var(--c-glass) 10%, transparent),
                0 4px 8px -2px color-mix(in srgb, var(--c-glass) 15%, transparent),
                0 8px 16px -4px color-mix(in srgb, var(--c-glass) 20%, transparent),
                0 16px 32px -8px color-mix(in srgb, var(--c-glass) 25%, transparent),
                0 32px 64px -16px color-mix(in srgb, var(--c-glass) 30%, transparent)
              `,
              width: '280px',
              maxWidth: 'calc(100vw - 40px)'
            }}
          >
            {/* Screenshot */}
            <div 
              className="relative overflow-hidden"
              style={{
                aspectRatio: '4/3',
                background: 'color-mix(in srgb, var(--c-glass) 5%, transparent)'
              }}
            >
              <img
                src={screenshot}
                alt={`Preview of ${title}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div 
              className="px-3.5 py-2.5"
              style={{
                borderTop: '1px solid color-mix(in srgb, var(--c-glass) 25%, transparent)'
              }}
            >
              <p
                className="line-clamp-2"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--c-content)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.35,
                  marginBottom: '5px'
                }}
              >
                {title}
              </p>
              <p
                className="line-clamp-1"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.68rem',
                  fontWeight: 400,
                  color: 'color-mix(in srgb, var(--c-content) 55%, var(--c-bg))',
                  letterSpacing: '0.01em'
                }}
              >
                {url}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.92);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}
