# GameplayTag Extension

基于 React + TypeScript + Tailwind CSS 构建的 Edge 浏览器插件，提供智能页面标签管理系统。

## 技术栈

- **React 18** - UI 框架
- **TypeScript 5** - 类型安全
- **Tailwind CSS 3** - 样式框架
- **Vite 7** - 构建工具
- **TanStack Query 5** - 状态管理
- **Framer Motion 12** - 动画引擎
- **Supabase** - 后端服务（PostgreSQL + Auth）
- **Chrome Extension Manifest V3** - 插件规范

## 快速开始

### 安装依赖

```bash
npm install
```

### 环境配置

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

### 开发密钥配置

首次运行需要生成开发密钥（用于固定 Extension ID）：

```bash
node scripts/bin/generate-keys.js
```

然后在 Supabase Dashboard -> Authentication -> URL Configuration 中添加重定向 URL：
```
https://<你的Extension ID>.chromiumapp.org/
```

### 开发

```bash
# 开发模式（监听文件变化）
npm run dev

# 开发构建
npm run build:dev
```

### 构建

```bash
# 生产构建（自动执行架构检查）
npm run build

# 生产构建（含代码混淆保护）
npm run build:prod
```

构建输出到 `dist/` 目录，在 Edge 中加载该目录即可。

## 架构守护

项目采用**"代码即文档"**和**"工具强制"**的理念，所有架构规范由工具强制执行。

### 自动构建时检查

运行 `npm run build` 时会自动执行：

- ✅ **TypeScript 类型检查** - 确保类型安全
- ✅ **ESLint 检查** - 代码风格和自定义规则
- ✅ **依赖架构检查** - 使用 `dependency-cruiser` 验证分层架构
- ✅ **Design Tokens 生成** - 确保设计系统单一真理源

如果任何检查失败，构建将停止。这确保了生产代码始终符合架构规范。

### 自定义 ESLint 规则

- `no-raw-z-index`: 禁止魔法数字 z-index，必须使用 `var(--z-*)`
- `require-optimistic-update`: 提醒为 CRUD 操作实现乐观更新

### 手动运行检查

```bash
# 运行所有预构建检查
npm run prebuild:checks

# 单独运行检查
npm run type-check    # TypeScript 类型检查
npm run lint          # ESLint 检查
npm run check:arch    # 依赖架构检查
```

> 详细说明请查看 [docs/构建时架构检查说明.md](./docs/构建时架构检查说明.md)

## 项目结构

```
src/
├── core/              # 核心领域逻辑（纯逻辑，无依赖）
│   ├── strategies/    # 业务策略（数据合并、查询构建等）
│   └── config/        # 配置管理
├── services/          # 服务层（业务逻辑编排）
│   ├── gameplayStore.ts   # 标签管理核心逻辑
│   ├── syncService.ts     # 数据同步服务
│   └── storageService.ts  # 存储服务
├── infra/             # 基础设施层
│   ├── database/      # 数据访问层 (Chrome Storage + Supabase)
│   └── logger/        # 日志服务
├── shared/            # 共享代码
│   ├── types/         # 类型定义
│   ├── utils/         # 工具函数
│   └── rpc-protocol/  # RPC 通信协议
├── popup/             # 弹窗界面 (React UI)
├── background/        # Service Worker (后台服务)
├── content/           # Content Scripts (页面注入)
└── design-tokens/     # Design Tokens 单一真理源
```

## 核心功能

- **标签管理系统** - 基于 Unreal Engine GameplayTag 设计
- **数据同步** - 本地优先，自动同步到云端
- **乐观更新** - 零延迟的用户体验
- **深度感知毛玻璃系统** - 物理感视觉设计
- **无障碍支持** - 完整的键盘导航和屏幕阅读器支持

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 组件测试
npm run test:ct

# E2E 测试
npm run test:e2e

# 全量检测
npm run test:all
```

### 测试覆盖

- ✅ **TagManager** - 74个测试用例，覆盖核心标签管理功能
- ✅ **Logger** - 完整的日志服务测试
- ✅ **组件测试** - Playwright Component Testing
- ✅ **E2E 测试** - 关键用户流程测试

## 文档

项目文档位于 `docs/` 目录，采用**稳定层（Principles）**和**易变层（Reference）**结构：

### 核心文档

- **[文档索引](./docs/文档索引.md)** - 文档结构和使用指南
- **[框架开发规范](./docs/GameplayTag%20框架开发规范文档.md)** - 分层架构原则和依赖规则
- **[交互与体验开发手册](./docs/GameplayTag%20交互与体验开发手册.md)** - 乐观更新、物理感、性能规范
- **[设计系统规范](./docs/GameplayTag%20Design%20System%20Specification.md)** - Design Tokens 和视觉规范
- **[无障碍与工程化规范](./docs/GameplayTag%20无障碍与工程化规范.md)** - 无障碍标准和测试策略

### 工具文档

- **[构建时架构检查说明](./docs/构建时架构检查说明.md)** - 架构守护工具使用指南

## 开发工作流

### 新功能开发

1. 创建功能分支
2. 开发前阅读相关文档（框架规范、交互手册等）
3. 开发时遵循架构规范（由工具自动检查）
4. 提交前运行 `npm run prebuild:checks` 确保通过所有检查
5. 创建 PR，CI/CD 会自动运行所有检查

### 代码审查检查清单

- [ ] 遵循分层架构原则（无循环依赖）
- [ ] 核心层无外部依赖（React、Chrome API）
- [ ] 所有策略类有单元测试
- [ ] RPC 调用使用类型安全接口
- [ ] 同步操作通过 SyncService
- [ ] UI 组件使用 Headless Hooks 模式
- [ ] 使用 Design Tokens，无硬编码值

## CI/CD

项目已配置 GitHub Actions 自动化流程，每次推送或 PR 时自动运行：

- Node.js 18.x 和 20.x 双版本测试
- TypeScript 类型检查
- ESLint 检查（包含自定义规则）
- 依赖架构检查
- 测试套件
- 覆盖率报告

## 许可证

MIT
