import React from 'react';

/**
 * GlassTestBed - 玻璃态效果专用测试夹具
 * 
 * 核心原理：
 * 玻璃态效果（backdrop-filter: blur()）只有在复杂背景上才能被观察到。
 * 在纯色或简单背景下，模糊效果是不可见的，导致视觉回归测试无法检测到 blur 失效的 Bug。
 * 
 * 解决方案：
 * 使用高对比度棋盘格背景，确保模糊效果能够被像素级检测到。
 * 
 * @example
 * ```tsx
 * <GlassTestBed>
 *   <GlassCard depthLevel={1}>Content</GlassCard>
 * </GlassTestBed>
 * ```
 */
export interface GlassTestBedProps {
  children: React.ReactNode;
  /**
   * 背景模式
   * - 'checkerboard': 棋盘格（默认，最敏感）
   * - 'noise': 噪点纹理
   * - 'gradient': 渐变
   */
  backgroundMode?: 'checkerboard' | 'noise' | 'gradient';
  /**
   * 测试区域尺寸
   */
  width?: number;
  height?: number;
}

export const GlassTestBed: React.FC<GlassTestBedProps> = ({
  children,
  backgroundMode = 'checkerboard',
  width = 400,
  height = 400,
}) => {
  const backgroundStyle = getBackgroundStyle(backgroundMode);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ...backgroundStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        // 确保测试环境中的渲染上下文正确
        isolation: 'isolate',
      }}
    >
      {children}
    </div>
  );
};

/**
 * 根据背景模式生成样式
 */
function getBackgroundStyle(mode: GlassTestBedProps['backgroundMode']): React.CSSProperties {
  switch (mode) {
    case 'checkerboard':
      return {
        // 高对比度棋盘格：这是检测 blur 是否生效的最敏感背景
        backgroundImage: `
          repeating-conic-gradient(
            #808080 0% 25%,
            transparent 0% 50%
          )
        `,
        backgroundSize: '20px 20px',
      };
    
    case 'noise':
      return {
        // 噪点纹理：用于检测更细微的模糊效果
        backgroundImage: `
          radial-gradient(circle at 20% 50%, #ff0000 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, #00ff00 0%, transparent 50%),
          radial-gradient(circle at 50% 20%, #0000ff 0%, transparent 50%),
          radial-gradient(circle at 50% 80%, #ffff00 0%, transparent 50%)
        `,
        backgroundSize: '100px 100px',
      };
    
    case 'gradient':
      return {
        // 渐变背景：用于检测模糊边缘效果
        background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)',
        backgroundSize: '200% 200%',
      };
    
    default:
      return {};
  }
}


