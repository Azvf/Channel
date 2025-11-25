/**
 * Glass Physics System
 * 玻璃材质物理系统
 */

export const GLASS = {
  blurBase: { px: 12, description: '基础模糊度' },
  blurDecay: { px: 2, description: '随深度衰减量' },
  opacityBase: { value: 0.15, description: '基础不透明度' },
  opacityIncrement: { value: 0.05, description: '随深度增加量' },
  saturation: { percent: 150, description: '饱和度提升 (Vibrant Effect)' },
  reflexStrength: { value: 1 },
} as const;

