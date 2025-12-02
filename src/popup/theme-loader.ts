// src/popup/theme-loader.ts
//
// 极简版主题加载器
// 职责：仅负责读取存储并设置 data-theme 属性
// 性能：无阻塞，无计算，无样式注入
//
// 架构说明：
// - CSS 变量由 Vanilla Extract 在构建时生成（theme.css.ts）
// - 运行时只需设置 data-theme 属性，CSS 选择器会自动匹配
// - 从 ~100ms JS 执行缩减为 <1ms DOM 操作

(function() {
  try {
    // 1. 读取用户偏好
    const theme = localStorage.getItem('theme') || 'light';
    
    // 2. 设置 data-theme 属性
    // CSS 选择器 [data-theme="..."] 会立即匹配并应用对应的 CSS 变量
    document.documentElement.setAttribute('data-theme', theme);
    
  } catch (e) {
    console.warn('Theme loader failed', e);
  }
})();
