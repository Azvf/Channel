# 云端数据同步服务文档

## 概述

SyncService 实现了本地数据与 Supabase 云端数据的双向同步，支持：
- **数据合并策略**：基于 `updatedAt` 时间戳的智能合并
- **实时订阅**：使用 Supabase Realtime 实现多设备秒级同步
- **离线支持**：离线时的变更会加入队列，网络恢复后自动上传

## 配置步骤

### 1. 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

从 Supabase Dashboard -> Settings -> API 获取这些值。

### 2. 数据库表结构

数据库表已通过 Supabase MCP 工具创建，包括：
- `tags` 表：存储标签数据
- `pages` 表：存储页面数据
- `profiles` 表：存储用户配置（可选）

所有表都已启用 RLS（Row Level Security），确保用户只能访问自己的数据。

### 3. Manifest 配置

`manifest.json` 已包含必要的权限：
- `identity`：用于 OAuth 登录
- `storage`：用于本地存储
- `host_permissions`：用于访问 Supabase API

## 工作流程

### 初始化

1. Background Service Worker 启动时，`SyncService` 会自动初始化
2. 如果用户已登录，会立即启动实时订阅并执行全量同步
3. 如果用户未登录，变更会保存在本地队列中

### 数据同步流程

#### 创建/更新操作
1. 用户操作（创建标签、添加标签到页面等）
2. `TagManager` 更新本地数据
3. `SyncService.markTagChange()` 或 `markPageChange()` 被调用
4. 如果已登录：立即同步到云端
5. 如果未登录：加入待同步队列

#### 实时同步
1. Supabase Realtime 监听数据库变化
2. 收到变更事件后，检查本地数据的 `updatedAt`
3. 如果云端数据更新，则更新本地数据
4. 避免循环同步（通过时间戳比较）

#### 离线队列
1. 离线时的变更保存在 `chrome.storage.local` 中
2. 用户登录或网络恢复时，自动上传队列中的变更
3. 上传失败的变更会重新加入队列

## API 使用

### 手动触发同步

```typescript
import { syncService } from './services/syncService';

// 获取同步状态
const state = syncService.getSyncState();
console.log('同步状态:', state);

// 手动触发全量同步
await syncService.syncAll();
```

### 监听同步状态

同步状态包含：
- `isSyncing`: 是否正在同步
- `lastSyncAt`: 最后同步时间
- `pendingChangesCount`: 待同步变更数量
- `error`: 错误信息（如果有）

## 数据合并策略

当本地和云端都有数据时，使用以下策略：

1. **时间戳比较**：比较 `updatedAt` 字段
2. **保留最新版本**：`updatedAt` 更大的版本会被保留
3. **合并缺失项**：如果一方有数据而另一方没有，则保留有数据的一方

## 注意事项

1. **环境变量**：确保 `.env` 文件已正确配置，否则会使用占位符值并显示警告
2. **RLS 策略**：确保 Supabase 数据库的 RLS 策略已正确配置
3. **实时订阅**：需要确保 Supabase 项目的 Realtime 功能已启用
4. **网络状态**：离线时的变更会在网络恢复后自动同步

## 故障排查

### 同步失败
- 检查网络连接
- 检查 Supabase 配置是否正确
- 查看浏览器控制台的错误日志

### 数据不一致
- 手动触发 `syncAll()` 进行全量同步
- 检查 `pendingChangesCount` 是否有待同步的变更

### 实时同步不工作
- 检查用户是否已登录
- 检查 Supabase Realtime 是否已启用
- 查看浏览器控制台的订阅日志

