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

# 生产构建（含代码混淆保护）
npm run build:prod
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

- ✅ **TagManager** - 74个测试用例，覆盖核心标签管理功能
- ✅ **Logger** - 完整的日志服务测试，包括性能计时功能
- 测试覆盖率：TagManager 78%+, Logger 100%

### 新功能

- ✅ **导入/导出** - 支持完整的标签和页面数据导入导出，方便在多设备间迁移数据
  - 覆盖模式：完全替换现有数据
  - 合并模式：保留现有数据，添加新数据
  - 详细使用说明请参考 [IMPORT_EXPORT.md](./docs/IMPORT_EXPORT.md)

### CI/CD

项目已配置 GitHub Actions 自动化测试流程，每次推送或PR时自动运行：
- Node.js 18.x 和 20.x 双版本测试
- 类型检查
- Lint 检查
- 测试套件
- 覆盖率报告

## 安全与防护

### 防破解保护

项目集成了多层安全防护机制：

- ✅ **代码混淆** - 使用 javascript-obfuscator 保护源代码
- ✅ **Source Maps 控制** - 生产环境禁用调试映射
- ✅ **代码压缩** - 移除注释和调试信息
- ✅ **构建分离** - 开发和生产构建独立

### 快速开始

```bash
# 生产构建（含完整防护）
npm run build:prod

# 仅混淆已构建的文件
npm run obfuscate
```

### 详细文档

- 📖 [快速开始指南](./docs/ANTI_CRACK_QUICKSTART.md) - 5分钟上手
- 📚 [完整防护指南](./docs/ANTI_CRACK_GUIDE.md) - 全面安全策略
  - License 验证
  - 服务器端保护
  - 运行时检测
  - 持续监控
  - 法律保护

⚠️ **重要提示**：完全防止破解是不可能的，这些措施旨在**增加破解成本**，而不是绝对安全。
