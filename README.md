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

## 环境配置

在构建之前，需要配置 Supabase 环境变量：

1. 复制环境变量示例文件：
```bash
cp .env.development.example .env.development
```

2. 编辑 `.env.development` 文件，填入你的 Supabase 配置：
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

这些值可以从 Supabase Dashboard -> Settings -> API 获取。

**重要**：`.env.development` 文件已在 `.gitignore` 中，不会提交到版本控制。

## 开发密钥配置

为了在开发环境中使用固定的 Extension ID（便于配置 Supabase 认证），项目使用持久化的开发密钥对。

### 1. 生成开发密钥

首次运行或需要重新生成密钥时：

```bash
node scripts/generate-dev-key.js
```

这会：
- 在项目根目录生成 `key.development.pem` 私钥文件（已加入 `.gitignore`）
- 输出 Extension ID 和 Redirect URL

示例输出：
```
Extension ID: kkjcgpimkjnemndlpihnpccpkjjdjkpg
Redirect URL: https://kkjcgpimkjnemndlpihnpccpkjjdjkpg.chromiumapp.org/
```

**注意**：`key.development.pem` 文件包含私钥，请妥善保管。如果是团队协作，需要安全地共享此文件。

### 2. 配置 Supabase 重定向 URL

1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Authentication** -> **URL Configuration**
4. 在 **Redirect URLs** 中添加：
   ```
   https://<你的Extension ID>.chromiumapp.org/
   ```
   例如：`https://kkjcgpimkjnemndlpihnpccpkjjdjkpg.chromiumapp.org/`

### 3. 验证密钥注入

开发构建时，Vite 会自动将公钥注入到 `dist/manifest.json` 的 `key` 字段中，确保 Extension ID 固定。

验证注入状态：
```bash
node scripts/generate-dev-key.js --verify
```

### 工作原理

- **开发模式**（`npm run build:dev`）：自动注入 `key` 字段到 `dist/manifest.json`
- **生产模式**（`npm run build`）：不注入 `key` 字段，使用 Chrome 自动生成的 ID
- 源文件 `manifest.json` 不包含 `key` 字段，只在构建时动态注入

## 构建

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 开发构建
npm run build:dev

# 生产构建
npm run build

# 生产构建（含代码混淆保护）
npm run build:prod
```

构建输出到 `dist/` 目录，在 Edge 中加载该目录即可。

**注意**：如果没有配置环境变量，构建后的扩展在加载时会报错：
- `Service worker registration failed. Status code: 15`
- `Supabase URL or Key is missing`

这是因为 Supabase 客户端在初始化时需要这些环境变量。

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
