这份文档专注于**软件架构与代码组织（怎么构建）**，定义了系统的分层原则、依赖规则和开发规范。这是确保代码库可维护性、可测试性和可扩展性的技术基石。

---

# GameplayTag 框架开发规范文档

**核心原则：分层 (Layered) · 隔离 (Isolated) · 可测试 (Testable)**

## 文档目标

本文档定义了 GameplayTag 扩展的架构开发规范，确保所有开发者遵循统一的设计原则和代码组织方式，维护代码库的可维护性、可测试性和可扩展性。

## 项目架构概览

### 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 7
- **状态管理**: TanStack Query (React Query) 5
- **后端服务**: Supabase (PostgreSQL)
- **浏览器扩展**: Chrome Extension Manifest V3
- **测试框架**: Jest + Playwright

### 项目结构
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
└── content/           # Content Scripts (页面注入)
```

## 1. 架构分层原则

### 1.1 分层架构概览

项目采用严格的分层架构，每层有明确的职责边界：

```
┌─────────────────────────────────────┐
│  视图架构层 (View Architecture)     │  React UI, Headless Hooks
├─────────────────────────────────────┤
│  进程间通信层 (IPC Layer)           │  RPC Protocol, Type Safety
├─────────────────────────────────────┤
│  内容感知系统 (Content Perception)  │  Feature Orchestrator, Detectors
├─────────────────────────────────────┤
│  同步与存储引擎 (Sync & Storage)    │  SyncService, Repository Pattern
├─────────────────────────────────────┤
│  核心领域策略层 (Core Domain)       │  纯逻辑，无依赖
└─────────────────────────────────────┘
```

### 1.2 依赖方向规则

- **单向依赖**: 上层可以依赖下层，下层严禁依赖上层
- **核心层隔离**: `src/core/` 严禁导入 React、Chrome API 或任何 UI 框架
- **服务层独立**: `src/services/` 可以依赖 `core/` 和 `infra/`，但不能依赖 `popup/` 或 `content/`

## 2. 核心领域策略层 (Core Domain Strategy Layer)

### 2.1 设计原则

- **纯函数优先**: 所有策略类应该是无副作用的纯函数或纯类
- **可移植性**: 核心逻辑应该可以在 Node.js、浏览器或任何 JavaScript 环境中运行
- **可测试性**: 不依赖外部服务，便于单元测试

### 2.2 代码组织

```
src/core/
├── strategies/
│   ├── CalendarGridBuilder.ts      # 日历网格构建算法
│   ├── LinearHeatmapStrategy.ts    # 颜色映射策略
│   ├── DataMergeStrategy.ts        # 三路合并算法
│   └── SupabaseQueryBuilder.ts     # 查询抽象层
└── config/                         # 配置管理
```

### 2.3 实现规范

#### 2.3.1 可视化计算引擎

**CalendarGridBuilder** - 日历热力图几何构建

- 必须处理跨时区日期偏移（手动解析 `YYYY-MM-DD`）
- 强制周日对齐（`startDate.setDate(startDate.getDate() - startDate.getDay())`）
- 返回结构化的 `CalendarLayoutInfo`，包含 `cells` 和 `months`

**LinearHeatmapStrategy** - 颜色映射策略

- 输入：Activity Count (数值)
- 输出：Activity Level (视觉等级)
- 支持扩展为对数映射或分位数映射

#### 2.3.2 数据合并内核

**DataMergeStrategy** - 三路合并算法

- 实现 CRDT 思想，保证最终一致性
- 使用 `ShadowMap` 追踪上次同步状态
- 字段级智能合并：
  - 简单字段 (Name/Color): 谁变了采纳谁
  - 复杂字段 (Bindings): 并集策略 (Union)
  - 冲突降级: LWW (Last-Write-Wins)

**实现示例**:

```typescript
// ✅ 正确：纯函数，无副作用
export function mergeTagFields(
  local: GameplayTag,
  remote: GameplayTag,
  baseHash: string | undefined,
): GameplayTag {
  // 合并逻辑
}

// ❌ 错误：依赖了外部服务
export function mergeTagFields(
  local: GameplayTag,
  remote: GameplayTag,
  baseHash: string | undefined,
) {
  logger.info(...); // 错误：core 层不应该依赖 logger
}
```

**实现位置**:
- 数据合并策略: `src/core/strategies/DataMergeStrategy.ts`
- 日历网格构建: `src/core/strategies/CalendarGridBuilder.ts`
- 颜色映射策略: `src/core/strategies/LinearHeatmapStrategy.ts`

### 2.4 测试要求

- 所有策略类必须有对应的单元测试
- 测试文件命名：`*.test.ts`
- 覆盖率要求：90%+

---

## 3. 同步与存储引擎 (Sync & Storage Engine)

### 3.1 设计原则

- **离线优先**: 所有操作先写本地，再同步云端
- **最终一致性**: 通过三路合并保证数据最终一致
- **容错性**: 网络失败、并发冲突都有优雅降级

### 3.2 核心服务

#### 3.2.1 SyncService (单例模式)

**职责**:

- 调度所有同步任务
- 管理分布式锁（防止多窗口并发）
- 实现双模同步（增量 + 全量）

**分布式锁实现**:

```typescript
// 使用 Chrome Storage 实现互斥锁
private async acquireLock(): Promise<boolean> {
  const lockId = `${Date.now()}-${Math.random()}`;
  // 尝试获取锁，设置超时时间
}
```

**实现位置**:
- 同步服务: `src/services/syncService.ts`
- 存储服务: `src/services/storageService.ts`

**双模同步**:

- **增量同步**: 基于 `fetchCursor` 时间游标，只拉取变更
- **全量同步**: 周期性或异常时执行完整三路合并

#### 3.2.2 仓储模式 (Repository Pattern)

**StorageService** - 统一存储接口

- 支持 `ChromeStorageRepository` (生产)
- 支持 `MemoryRepository` (测试/SSR)
- 提供统一的 KV 存储 API

**GameplayStore** - 内存状态容器

- 单一事实来源 (Single Source of Truth)
- 提供响应式更新机制

### 3.3 实现规范

- 所有同步操作必须通过 `SyncService.getInstance()` 访问
- 严禁直接操作 Chrome Storage 或 Supabase
- 软删除通过 `deleted` 标志位，避免"僵尸数据"复活

---

## 4. 内容感知系统 (Content Perception System)

### 4.1 设计原则

- **并行执行**: 所有探测器并行运行，互不阻塞
- **超时熔断**: 单个探测器卡死不影响整体
- **可扩展性**: 通过接口注册新探测器

### 4.2 核心组件

#### 4.2.1 FeatureOrchestrator

**职责**: 统一管理所有探测器

- 注册探测器 (`register()`)
- 并行执行 (`analyzePage()`)
- 超时控制 (2秒超时)

**实现模式**:

```typescript
// 使用 Promise.race 实现超时熔断
const result = await Promise.race([
  detector.detect(),
  new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
]);
```

**实现位置**:
- 特性编排器: `src/content/features/FeatureOrchestrator.ts`
- 页面特性接口: `src/content/features/types.ts`

#### 4.2.2 智能探测器接口

**IPageFeature** - 标准接口

```typescript
interface IPageFeature {
  id: string;
  type: string;
  detect(): Promise<FeatureResult | null>;
  isEnabled(): boolean;
}
```

**实现要求**:

- `VideoDetector`: 使用启发式算法识别主视频
- `MetaDataDetector`: 提取 OpenGraph、Meta 标签
- 所有探测器必须实现 `IPageFeature` 接口

### 4.3 扩展新探测器

1. 实现 `IPageFeature` 接口
2. 在 `FeatureOrchestrator` 构造函数中注册
3. 添加超时处理和错误处理

---

## 5. 进程间通信层 (IPC Layer)

### 5.1 设计原则

- **类型安全**: 编译时校验所有 RPC 调用
- **错误标准化**: 统一的错误码和错误处理
- **Client/Server 分离**: Background 是 Server，Popup/Content 是 Client

### 5.2 RPC 协议架构

#### 5.2.1 接口定义

**IBackgroundApi** - 服务端能力契约

```typescript
interface IBackgroundApi {
  // 所有 Background 服务的方法定义
  getTags(): Promise<TagsCollection>;
  createTag(tag: CreateTagRequest): Promise<GameplayTag>;
  // ...
}
```

#### 5.2.2 类型安全实现

- 使用 TypeScript 接口定义请求/响应类型
- Client 调用时自动类型检查
- Server 实现时自动类型推断

#### 5.2.3 错误处理

**RpcError** - 标准化错误

```typescript
class RpcError extends Error {
  code: RpcErrorCode;
  // NETWORK_ERROR, VALIDATION_ERROR, etc.
}
```

**实现位置**:
- RPC 客户端: `src/shared/rpc-protocol/client.ts`
- RPC 服务端: `src/shared/rpc-protocol/server.ts`
- 类型定义: `src/shared/rpc-protocol/types.ts`

### 5.3 实现规范

- 严禁使用 `chrome.runtime.sendMessage` 直接通信
- 所有跨进程调用必须通过 RPC Client
- Server 端必须实现完整的错误处理

---

## 6. 视图架构层 (View Architecture Layer)

### 6.1 设计原则

- **Headless UI**: 逻辑与 UI 分离
- **原子化设计**: Smart Components + Dumb Components
- **状态管理**: TanStack Query 管理服务端状态

### 6.2 组件分层

#### 6.2.1 Headless UI Hooks

**职责**: 封装业务逻辑，UI 只负责渲染

- `useStatsWall`: 热力图数据获取和计算
- `useTagInput`: 标签输入状态机

**实现模式**:

```typescript
// ✅ 正确：Hook 返回数据和操作，组件只负责渲染
function useStatsWall() {
  const { data, isLoading } = useQuery(...);
  return { data, isLoading, actions };
}

// ❌ 错误：Hook 中直接操作 DOM
function useStatsWall() {
  document.getElementById('...').style.display = 'none';
}
```

**实现位置**:
- Headless Hooks: `src/popup/hooks/`
- 业务组件: `src/popup/components/`
- 展示组件: `src/popup/components/`

#### 6.2.2 组件分类

**Smart Components** (业务组件):

- `StatsWallModal`: 复杂业务逻辑
- `TagInput`: 复杂交互状态机

**Dumb Components** (展示组件):

- `GlassCard`: 纯展示，接收 props
- `GlassButton`: 纯展示，触发回调

### 6.3 状态管理规范

- **服务端状态**: 使用 TanStack Query
- **客户端状态**: 使用 React `useState` 或 `useReducer`
- **全局状态**: 通过 Context API (如 `GlassDepthContext`)

---

## 7. 代码组织规范

### 7.1 目录结构约定

```
src/
├── core/              # 核心领域逻辑（纯逻辑，无依赖）
├── services/          # 服务层（业务逻辑编排）
├── infra/             # 基础设施（数据库、日志）
├── shared/            # 共享代码（类型、工具、协议）
├── popup/             # 弹窗 UI (React)
├── background/        # Service Worker
└── content/           # Content Scripts
```

### 7.2 文件命名规范

- **组件**: PascalCase (`GlassCard.tsx`)
- **工具函数**: camelCase (`mergeDataStrategy.ts`)
- **类型定义**: PascalCase (`GameplayTag.ts`)
- **常量**: UPPER_SNAKE_CASE (`STORAGE_KEYS.ts`)

### 7.3 导入顺序

1. 外部依赖 (React, 第三方库)
2. 内部共享 (`shared/`)
3. 基础设施 (`infra/`)
4. 服务层 (`services/`)
5. 核心层 (`core/`)
6. 相对导入 (同目录文件)

---

## 8. 开发工作流

### 8.1 新功能开发流程

1. **需求分析**: 确定功能属于哪一层
2. **接口设计**: 如果是跨层功能，先定义接口
3. **自下而上实现**: 从核心层开始，逐层向上
4. **测试驱动**: 每层实现后立即编写测试
5. **集成测试**: 最后进行端到端测试

### 8.2 代码审查检查清单

- [ ] 遵循分层架构原则（无循环依赖）
- [ ] 核心层无外部依赖（React、Chrome API）
- [ ] 所有策略类有单元测试
- [ ] RPC 调用使用类型安全接口
- [ ] 同步操作通过 SyncService
- [ ] UI 组件使用 Headless Hooks 模式

---

## 9. 最佳实践

### 9.1 错误处理

- **核心层**: 返回 `Result<T, Error>` 类型，不抛异常
- **服务层**: 捕获异常，转换为业务错误
- **UI 层**: 显示用户友好的错误消息

### 9.2 性能优化

- **懒加载**: 大型组件使用 `React.lazy()`
- **防抖节流**: 用户输入使用防抖，滚动使用节流
- **缓存策略**: TanStack Query 配置合理的 `staleTime`

### 9.3 可维护性

- **单一职责**: 每个函数/类只做一件事
- **依赖注入**: 服务通过构造函数注入依赖
- **接口隔离**: 使用 TypeScript Interface 定义契约

---

## 10. 实现参考

### 10.1 核心文件位置

- **数据合并**: `src/core/strategies/DataMergeStrategy.ts`
- **同步服务**: `src/services/syncService.ts`
- **RPC 协议**: `src/shared/rpc-protocol/`
- **特性编排**: `src/content/features/FeatureOrchestrator.ts`
- **Headless Hooks**: `src/popup/hooks/`
- **仓储模式**: `src/infra/database/`
- **游戏化存储**: `src/services/gameplayStore.ts`

### 10.2 扩展指南

如需添加新功能：

1. **确定层级**: 分析功能属于哪一层（核心层、服务层、UI 层等）
2. **设计接口**: 如果是跨层功能，先定义清晰的接口契约
3. **参考实现**: 查看同层级的现有实现作为模板
4. **遵循原则**: 严格遵循本规范的设计原则和依赖规则
5. **编写测试**: 核心逻辑必须有单元测试，覆盖率 90%+
6. **更新文档**: 更新相关文档和注释

### 10.3 架构审查检查点

在提交代码审查前，请自查以下检查点：

- [ ] 无循环依赖（使用工具检查：`madge --circular src/`）
- [ ] 核心层 (`src/core/`) 无外部依赖（React、Chrome API 等）
- [ ] 服务层不依赖 UI 层 (`popup/`, `content/`)
- [ ] 所有跨进程通信使用 RPC 协议
- [ ] 同步操作统一通过 `SyncService`
- [ ] 关键业务逻辑有单元测试

---

**执行建议**:

请所有开发者在开发新功能前，先阅读本文档并确定功能的架构位置。任何违反分层原则或设计模式的代码，原则上不予通过代码审查。

请将此文档与《设计系统规范》、《交互手册》和《无障碍与工程化规范》结合使用，作为新功能开发（Feature Kickoff）时的**架构设计标准**。只有满足上述所有架构规范的功能，才能标记为"架构审查通过"。