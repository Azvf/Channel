# GameplayTag Extension

基于 React + TypeScript + Tailwind CSS 构建的 Edge 浏览器插件

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **Chrome Extension Manifest V3** - 插件规范

## 目录结构

```
src/
├── popup/           # 弹窗界面 (React + TypeScript)
├── background/      # 后台服务 (Service Worker)
├── content/         # 内容脚本 (页面注入)
├── services/        # 核心功能服务
│   └── tagManager.ts # 标签管理核心逻辑
├── config/          # 配置管理
└── types/           # 类型定义
```

## 构建

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build
```

构建输出到 `dist/` 目录，在 Edge 中加载该目录即可。

## 核心功能

保留了以下底层核心功能模块：
- TagManager - 标签管理系统
- Logger - 日志服务
- ConfigService - 配置管理
- Background Service Worker - 后台服务
- Content Scripts - 内容脚本注入

## 测试

项目配置了完整的自动化测试流程：

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 测试覆盖

- ✅ **TagManager** - 69个测试用例，覆盖核心标签管理功能
- ✅ **Logger** - 完整的日志服务测试，包括性能计时功能
- 测试覆盖率：TagManager 78%+, Logger 100%

### CI/CD

项目已配置 GitHub Actions 自动化测试流程，每次推送或PR时自动运行：
- Node.js 18.x 和 20.x 双版本测试
- 类型检查
- Lint 检查
- 测试套件
- 覆盖率报告
