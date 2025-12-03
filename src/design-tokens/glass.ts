/**
 * Glass Physics System
 * 定义不同海拔高度的材质属性
 */

export const GLASS = {
  // [Level 1] 侧边栏、顶部导航
  // 稍微透一点，保留背景的通透感
  panel: {
    blur: '12px',
    saturation: '180%', // 强饱和度，让透出来的颜色更好看
    opacity: '0.7',
  },
  
  // [Level 2] 模态弹窗 (Modal)、下拉菜单
  // 更模糊，更实，确保内容可读性
  modal: {
    blur: '24px', 
    saturation: '200%',
    opacity: '0.8',
  },
  
  // [Level 3] 提示条 (Toast/Tooltip)
  // 极致模糊，接近实体
  tooltip: {
    blur: '40px',
    saturation: '150%',
    opacity: '0.9',
  }
} as const;
