import { useState, useEffect, useRef } from "react";
// (V4 关键) 1. 导入 createPortal
import { createPortal } from "react-dom";

interface PagePreviewProps {
  url: string;
  screenshot: string;
  title: string;
  forceClose?: boolean;
}

// (V4) 增加宽度和边距常量
const PREVIEW_WIDTH = 360; // 保持 360px 宽度
const VIEWPORT_MARGIN = 20; // 统一的屏幕边距
const ICON_GAP = 12; // 图标与卡片的间距

export function PagePreview({ url, screenshot, title, forceClose = false }: PagePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const faviconRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  // 强制关闭
  useEffect(() => {
    if (forceClose) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setShowPreview(false);
    }
  }, [forceClose]);

  // (V5) 核心定位逻辑 (Proximity First, Center Fallback)
  useEffect(() => {
    if (showPreview && faviconRef.current && previewCardRef.current) {
      
      const iconRect = faviconRef.current.getBoundingClientRect();
      const previewRect = previewCardRef.current.getBoundingClientRect();

      // (健壮性) 测量必须有效
      if (previewRect.height === 0 || previewRect.width === 0) {
        return;
      }

      const { height: previewHeight } = previewRect;
      const previewWidth = PREVIEW_WIDTH; // 使用常量
      
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // --- 1. (V4) 水平定位 (Proximity First) ---
      const leftRight = iconRect.right + ICON_GAP;
      const leftLeft = iconRect.left - previewWidth - ICON_GAP;

      const fitsRight = (leftRight + previewWidth) < (viewportWidth - VIEWPORT_MARGIN);
      const fitsLeft = (leftLeft > VIEWPORT_MARGIN);

      let left = 0;
      if (fitsRight) {
        // 优先级1: 放在右侧
        left = leftRight;
      } else if (fitsLeft) {
        // 优先级2: 放在左侧
        left = leftLeft;
      } else {
        // 优先级3: 放在视口中心
        left = (viewportWidth / 2) - (previewWidth / 2);
        // 并再次钳制 (以防视口过窄)
        left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - previewWidth - VIEWPORT_MARGIN));
      }

      // --- 2. (V5 核心修复) 垂直定位 (Proximity First, Center Fallback) ---
      
      // 优先级1: 尝试将卡片中线与图标中线对齐
      const idealTop = iconRect.top + (iconRect.height / 2) - (previewHeight / 2);
      
      // 检查这个理想位置是否*完全*适合屏幕 (在边距内)
      const fitsVertically = (idealTop > VIEWPORT_MARGIN) && 
                             (idealTop + previewHeight < viewportHeight - VIEWPORT_MARGIN);

      let top = 0;
      if (fitsVertically) {
        // P1 成功: 位置完美，直接使用
        top = idealTop;
      } else {
        // P1 失败: (图标太靠上或太靠下)
        // 放弃 P1，回退到 P2：视口绝对居中
        top = (viewportHeight / 2) - (previewHeight / 2);
        
        // 仍然要对 P2 进行钳制，以防视口比卡片还小
        top = Math.max(VIEWPORT_MARGIN, top);
        top = Math.min(top, viewportHeight - previewHeight - VIEWPORT_MARGIN);
      }
      
      setPreviewPosition({ top, left });
    }
  }, [showPreview]); // 依赖 showPreview

  // --- 剩余代码 (不变) ---

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return "";
    }
  };

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const faviconUrl = getFaviconUrl(url);

  // 悬浮卡 (Tooltip) JSX
  const tooltipElement = showPreview && (
    <div
      ref={previewCardRef}
      className="fixed pointer-events-none"
      style={{
        zIndex: 300, // 确保在最顶层 (高于 201 的弹窗)
        left: `${previewPosition.left}px`,
        top: `${previewPosition.top}px`,
        animation: 'fadeInScale 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        // (V4) 应用新宽度
        width: `${PREVIEW_WIDTH}px`, 
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)` // 确保不超过视口
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
  );

  return (
    <>
      {/* 1. 徽章 (Icon) 留在原处 */}
      <div 
        className="relative inline-flex items-center justify-center flex-shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={faviconRef}
      >
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
      </div>

      {/* 2. 将悬浮卡传送到 body */}
      {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}

      {/* 动画样式 */}
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
    </>
  );
}