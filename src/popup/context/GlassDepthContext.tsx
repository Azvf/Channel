import React, { createContext, useContext, useMemo } from 'react';

/**
 * Glass Depth Context
 * 
 * 用于管理 Glassmorphism 组件的层级深度，实现动态渲染优化。
 * 深度越深，模糊度越小，不透明度越高，以减少 GPU 负载。
 */

// 默认深度为 0（最底层）
const GlassDepthContext = createContext<number>(0);

/**
 * Hook to get current glass depth
 */
export const useGlassDepth = () => useContext(GlassDepthContext);

/**
 * 最大深度限制，防止无限增长
 */
const MAX_DEPTH = 10;

/**
 * 验证并限制深度值
 */
const validateDepth = (depth: number): number => {
  return Math.max(0, Math.min(depth, MAX_DEPTH));
};

interface GlassDepthProviderProps {
  children: React.ReactNode;
  /**
   * 允许手动强制设定深度（例如 Modal 无论在哪里渲染，都应该是 Level 10）
   * 这对于 Portal 渲染的场景特别有用
   */
  forceDepth?: number;
}

/**
 * Glass Depth Provider
 * 
 * 为子组件提供深度上下文，每个 Provider 会自动将深度 +1。
 * 如果提供了 forceDepth，则使用强制深度（适用于 Portal 等场景）。
 */
export function GlassDepthProvider({ children, forceDepth }: GlassDepthProviderProps) {
  const parentDepth = useGlassDepth();

  // 计算当前深度：如果有强制深度则使用，否则父级深度 + 1
  const currentDepth = useMemo(() => {
    const rawDepth = forceDepth ?? (parentDepth + 1);
    return validateDepth(rawDepth);
  }, [forceDepth, parentDepth]);

  // 性能优化：只有深度变化时才重新生成 Provider
  const contextValue = useMemo(() => currentDepth, [currentDepth]);

  return (
    <GlassDepthContext.Provider value={contextValue}>
      {/* 
        利用 CSS 变量将深度传给 DOM，这是连接 JS 和 CSS 的桥梁
        使用 display: contents 避免创建额外的 DOM 节点
      */}
      <div
        style={
          {
            display: 'contents',
            '--depth': currentDepth,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </GlassDepthContext.Provider>
  );
}

