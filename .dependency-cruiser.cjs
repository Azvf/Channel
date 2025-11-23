/**
 * Dependency Cruiser Configuration
 * 
 * 架构守护工具：强制分层架构规则
 * 如果有人在 src/core 中 import React，构建直接失败
 */

module.exports = {
  forbidden: [
    // 规则 1: Core 层严禁依赖 React、Chrome API 或任何 UI 框架
    {
      name: 'no-react-in-core',
      severity: 'error',
      comment: 'Core 层必须保持纯逻辑，严禁依赖 React 或任何 UI 框架',
      from: { path: '^src/core/' },
      to: {
        path: ['react', 'react-dom', '^react/', '^react-dom/'],
      },
    },
    {
      name: 'no-chrome-api-in-core',
      severity: 'error',
      comment: 'Core 层严禁依赖 Chrome API',
      from: { path: '^src/core/' },
      to: {
        path: ['chrome', '^chrome/'],
      },
    },
    // 规则 2: Service 层不能依赖 UI 层
    {
      name: 'no-ui-in-services',
      severity: 'error',
      comment: 'Service 层不能依赖 Popup 或 Content UI 层',
      from: { path: '^src/services/' },
      to: {
        path: ['^src/popup/', '^src/content/'],
      },
    },
    // 规则 3: Core 层不能依赖 Service 层
    {
      name: 'no-services-in-core',
      severity: 'error',
      comment: 'Core 层不能依赖 Service 层（违反依赖方向）',
      from: { path: '^src/core/' },
      to: {
        path: ['^src/services/'],
      },
    },
    // 规则 4: 禁止循环依赖
    {
      name: 'no-circular',
      severity: 'error',
      comment: '禁止循环依赖',
      from: {},
      to: {
        circular: true,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: '^node_modules/[^/]+',
      },
      archi: {
        collapsePattern: '^(node_modules|src/[^/]+)',
      },
    },
  },
};

