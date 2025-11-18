# 使用真实 Supabase 数据库进行测试

本指南说明如何在集成测试中使用真实的 dev 环境 Supabase 数据库。

## 概述

默认情况下，所有测试都使用 Mock 数据（快速、安全、无需网络）。但某些集成测试场景可能需要连接真实的 dev 数据库来验证完整的同步流程。

## 配置步骤

### 1. 创建 `.env.development` 文件

复制 `.env.development.example` 并填入真实的 dev 环境配置：

```bash
cp .env.development.example .env.development
```

编辑 `.env.development` 文件：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# 测试账号配置（用于需要登录状态的测试）
# 建议在 dev 环境中创建一个专用的测试账号
# 这个账号应该：
# 1. 仅在 dev 环境中使用
# 2. 不要在生产环境中使用
# 3. 可以通过 Supabase Dashboard -> Authentication -> Users 创建
TEST_ACCOUNT_EMAIL=test@example.com
TEST_ACCOUNT_PASSWORD=test-password-here

# 测试配置
USE_REAL_SUPABASE=false  # 默认使用 mock，设置为 true 使用真实数据库
```

**重要**：`.env.development` 文件已在 `.gitignore` 中，不会提交到版本控制。

### 2. 运行使用真实数据库的测试

有两种方式：

#### 方式 1：使用 npm 脚本（推荐）

```bash
# 运行集成测试，使用真实的 dev Supabase 数据库
npm run test:integration:real
```

这个脚本会自动设置 `USE_REAL_SUPABASE=true`。

#### 方式 2：手动设置环境变量

```bash
# Windows (PowerShell)
$env:USE_REAL_SUPABASE="true"; npm run test:integration

# Windows (CMD)
set USE_REAL_SUPABASE=true && npm run test:integration

# Linux/macOS
USE_REAL_SUPABASE=true npm run test:integration
```

### 3. 默认行为（使用 Mock）

如果不设置 `USE_REAL_SUPABASE=true`，测试会默认使用 Mock：

```bash
# 使用 Mock（默认）
npm run test:integration

# 或
npm run test:unit
```

## 工作原理

1. **环境变量加载**：
   - `src/test/setup.ts` 会在测试开始时加载 `.env.development` 文件
   - 使用 `dotenv` 包读取环境变量

2. **条件性 Mock**：
   - 集成测试文件（如 `src/tests/integration/privacy.spec.ts`）检查 `USE_REAL_SUPABASE` 环境变量
   - 如果为 `true`，则**不** mock Supabase，使用真实连接
   - 如果为 `false` 或未设置，则使用 Mock

3. **Supabase 客户端初始化**：
   - `src/lib/supabase.ts` 支持在测试环境中从 `process.env` 读取配置
   - 兼容 Vite 的 `import.meta.env` 和 Node.js 的 `process.env`

## 注意事项

### ⚠️ 数据安全

1. **使用测试专用数据库**：
   - 建议使用 dev 环境的数据库，而非 production
   - 确保测试不会影响生产数据

2. **数据清理**：
   - 测试结束后应清理测试数据
   - 或使用测试专用的 Supabase 项目

3. **密钥安全**：
   - 永远不要将 `.env.development` 提交到版本控制
   - 使用 `anon-key`（公钥），而非 `service-role-key`（私钥）

4. **测试账号安全**：
   - 测试账号仅用于自动化测试，不要用于生产环境
   - 测试账号应该有明确的命名规范（如 `test-*@example.com`）
   - 定期更新测试账号密码

### ⚠️ 网络依赖

- 使用真实数据库的测试需要网络连接
- 如果网络不稳定，测试可能会失败

### ⚠️ 性能

- 真实数据库测试比 Mock 测试慢得多
- 建议只在必要时使用真实数据库

## 测试策略建议

1. **单元测试**：始终使用 Mock（快速、可靠）
   ```bash
   npm run test:unit
   ```

2. **集成测试 - Mock**：默认使用 Mock
   ```bash
   npm run test:integration
   ```

3. **集成测试 - 真实数据库**：需要验证完整同步流程时使用
   ```bash
   npm run test:integration:real
   ```

4. **E2E 测试**：通常需要真实数据库
   ```bash
   npm run test:e2e
   ```

## 故障排查

### 问题：测试失败，提示 "Supabase URL or Key is missing"

**解决方案**：
1. 确保已创建 `.env.development` 文件
2. 检查文件中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确
3. 确保文件在项目根目录

### 问题：测试仍然使用 Mock

**解决方案**：
1. 确保设置了 `USE_REAL_SUPABASE=true`
2. 检查 `.env.development` 中的 `USE_REAL_SUPABASE` 设置
3. 如果使用 npm 脚本，确保使用 `test:integration:real` 而非 `test:integration`

### 问题：网络请求失败

**解决方案**：
1. 检查网络连接
2. 验证 Supabase URL 和 Key 是否正确
3. 检查 Supabase 项目是否正常运行

### 问题：测试账号登录失败

**解决方案**：
1. 确保已设置 `TEST_ACCOUNT_EMAIL` 和 `TEST_ACCOUNT_PASSWORD` 环境变量
2. 验证测试账号在 Supabase Dashboard 中存在且密码正确
3. 检查测试账号是否被禁用或删除
4. 如果使用邮箱+密码登录，确保 Supabase 项目中启用了邮箱/密码认证方式
5. 查看测试输出中的错误信息，了解具体的登录失败原因

### 问题：需要登录的测试被跳过

**解决方案**：
1. 检查测试账号是否已配置（`TEST_ACCOUNT_EMAIL` 和 `TEST_ACCOUNT_PASSWORD`）
2. 如果未配置，测试会自动跳过需要登录的部分，这是正常行为
3. 如果需要运行需要登录的测试，必须配置测试账号

## 示例

### 完整的测试流程

```bash
# 1. 创建 .env.development 文件（如果还没有）
cp .env.development.example .env.development
# 编辑 .env.development，填入真实的配置

# 2. 运行单元测试（使用 Mock，快速）
npm run test:unit

# 3. 运行集成测试（使用 Mock，默认）
npm run test:integration

# 4. 运行集成测试（使用真实数据库，验证完整流程）
npm run test:integration:real
```

## 测试账号

### 创建测试账号

1. **通过 Supabase Dashboard 创建**：
   - 登录 Supabase Dashboard
   - 进入 `Authentication` -> `Users`
   - 点击 `Add User` -> `Create new user`
   - 输入邮箱和密码（建议使用明确的测试账号命名，如 `test@yourdomain.com`）
   - 点击 `Create user`

2. **通过 API 创建**（可选）：
   ```bash
   # 使用 Supabase Management API 创建测试账号
   # 需要 service_role_key（仅在开发环境使用）
   curl -X POST 'https://your-project.supabase.co/auth/v1/admin/users' \
     -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "test-password",
       "email_confirm": true
     }'
   ```

### 使用测试账号

测试账号会在以下场景自动使用：

1. **自动登录**：
   - 当 `USE_REAL_SUPABASE=true` 且测试账号已配置时
   - 测试套件开始时会自动尝试登录测试账号
   - 如果登录成功，所有需要登录的测试都可以正常运行

2. **手动登录**：
   ```typescript
   import { testHelpers } from '../../test/helpers';
   
   // 在测试中使用
   await testHelpers.loginWithTestAccount();
   await testHelpers.ensureLoggedIn();
   ```

3. **登出**：
   ```typescript
   // 测试结束后自动登出
   await testHelpers.logoutTestAccount();
   ```

### 测试账号相关函数

在 `src/test/helpers.ts` 中提供了以下辅助函数：

- `testHelpers.loginWithTestAccount()` - 使用测试账号登录
- `testHelpers.logoutTestAccount()` - 登出测试账号
- `testHelpers.ensureLoggedIn()` - 确保已登录（如果未登录则尝试登录）
- `TEST_ACCOUNT.isConfigured()` - 检查测试账号是否已配置
- `TEST_ACCOUNT.getInfo()` - 获取测试账号信息（用于日志）

## 相关文件

- `.env.development.example` - 环境变量模板（包含测试账号配置示例）
- `src/test/helpers.ts` - 测试辅助函数（包含测试账号登录/登出函数）
- `src/test/setup.ts` - 测试环境配置，加载环境变量
- `src/lib/supabase.ts` - Supabase 客户端初始化
- `src/tests/integration/*.spec.ts` - 集成测试文件
- `jest.config.js` - Jest 配置

