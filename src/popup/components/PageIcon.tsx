import React, { useState } from 'react';
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
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
    >
      <div
        className="w-5 h-5 rounded-lg flex items-center justify-center overflow-hidden transition-all"
        style={{
          background: 'color-mix(in srgb, var(--c-glass) 12%, transparent)',
          border: '2px solid color-mix(in srgb, var(--c-glass) 30%, transparent)'
        }}
      >
        {!faviconError && faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="w-3.5 h-3.5"
            onError={() => setFaviconError(true)}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <Bookmark
            className="w-3 h-3"
            strokeWidth={1.5}
            style={{
              color: 'color-mix(in srgb, var(--c-content) 40%, var(--c-bg))'
            }}
          />
        )}
      </div>
    </div>
  );
}

