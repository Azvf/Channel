import { useState } from 'react';
import { Bookmark } from "lucide-react";

interface PageIconProps {
  url: string;
}

/**
 * 这是一个纯粹的渲染组件，只负责显示网站的 favicon。
 * 它内部管理 favicon 的加载和错误回退，
 * 但不包含任何 hover、timer 或 portal 逻辑。
 */
export function PageIcon({ url }: PageIconProps) {
  const [faviconError, setFaviconError] = useState(false);

  const getFaviconUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      // 使用 Google 的 favicon 服务, 请求 32px 图标
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      // 如果 URL 无效，返回空字符串以触发 onError
      return "";
    }
  };

  // 只有在 faviconError 为 false 时才尝试加载
  const faviconUrl = !faviconError ? getFaviconUrl(url) : "";

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{
          // [Refactor] 使用语义化图标 Token，替换 '20px'
          width: 'var(--icon-size-md)', 
          height: 'var(--icon-size-md)', 
          borderRadius: 'var(--radius-md)',
          // [Refactor] Tokenized Surface
          background: 'var(--bg-surface-glass-subtle)',
          border: '1px solid var(--border-glass-moderate)' // 修正为1px以符合整体风格
        }}
      >
        {!faviconError && faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            style={{ 
              width: 'var(--icon-size-sm)', 
              height: 'var(--icon-size-sm)',
              objectFit: 'contain' 
            }}
            onError={() => setFaviconError(true)}
          />
        ) : (
          <Bookmark
            style={{
              width: 'var(--icon-size-xs)',
              height: 'var(--icon-size-xs)',
              strokeWidth: 1.5,
              // [Refactor] Tokenized Placeholder Color
              color: 'var(--color-text-quaternary)'
            }}
          />
        )}
      </div>
    </div>
  );
}

