# SDD + DX + Visual Regression 使用指南

本文档说明如何使用三个重构方案：**Schema-Driven Development (SDD)**、**开发体验增强 (DX)** 和 **视觉回归测试**。

---

## 方案一：Schema-Driven Development (SDD)

### 核心原理

**Database Schema 是唯一的真理来源 (SSOT)**。前端类型必须由数据库自动生成，严禁手写 DB 相关的 Interface。

### 使用步骤

#### 1. 安装 Supabase CLI（如果尚未安装）

```bash
npm install -g supabase
```

#### 2. 登录 Supabase CLI

```bash
supabase login
```

这会打开浏览器，完成 OAuth 认证。

#### 3. 配置项目 ID（三种方式任选其一）

**方式一：环境变量**
```bash
export SUPABASE_PROJECT_ID=your-project-id
```

**方式二：.env 文件（推荐）**
在项目根目录创建或编辑 `.env` 文件：
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
```
脚本会自动从 URL 中提取项目 ID。

**方式三：从 Supabase Dashboard 获取**
1. 访问 https://app.supabase.com
2. 选择你的项目
3. 进入 Settings > API
4. 从 Project URL 中提取项目 ID（子域名部分）

> 📖 详细说明请参考：[Supabase 项目ID设置指南](./Supabase-项目ID设置指南.md)

#### 4. 生成类型定义

```bash
npm run gen:types
```

辅助脚本会：
- 自动从 `.env` 文件中的 `VITE_SUPABASE_URL` 提取项目 ID
- 或使用 `SUPABASE_PROJECT_ID` 环境变量
- 验证项目 ID 格式
- 生成类型定义文件

#### 4. 使用 Mapper 层

**⚠️ 重要**：所有数据库查询结果必须经过 Mapper 转换，UI 层严禁直接依赖 `database.types.ts`。

**读取数据示例**：
```typescript
import { toDomainTag, toDomainPage } from '@/infra/database/supabase/mapper';

// ❌ 错误：直接使用数据库类型
const { data } = await supabase.from('tags').select('*');
const tag = data[0]; // 这是 TagRow 类型，不应该直接使用

// ✅ 正确：使用 Mapper 转换
const { data } = await supabase.from('tags').select('*');
const tags = data?.map(toDomainTag) || []; // 转换为 GameplayTag[]
```

**写入数据示例**：
```typescript
import { toDBTag, toDBPage } from '@/infra/database/supabase/mapper';

// ❌ 错误：手动构造数据库格式
await supabase.from('tags').upsert({
  id: tag.id,
  user_id: userId,
  name: tag.name,
  // ... 容易出错
});

// ✅ 正确：使用 Mapper 转换
const dbTag = toDBTag(tag, userId);
await supabase.from('tags').upsert(dbTag);
```

### 文件结构

```
src/
├── shared/types/
│   ├── database.types.ts          # ⚠️ 自动生成，勿手动编辑
│   └── gameplayTag.ts              # 领域模型（手写）
└── infra/database/supabase/
    └── mapper.ts                    # 防腐层：DB ↔ Domain 转换
```

### 工作流程

1. **数据库变更**：在 Supabase Dashboard 修改表结构
2. **生成类型**：运行 `npm run gen:types`
3. **类型检查**：运行 `npm run type-check`，如果 Mapper 未更新，TypeScript 会报错
4. **更新 Mapper**：根据新的数据库类型更新 `mapper.ts` 中的转换函数
5. **编译期发现错误**：如果字段映射错误，编译时就会报错

---

## 方案二：开发体验增强 (DX) - Plop.js 脚手架

### 核心原理

**规范即代码生成**。开发者不需要记忆文件结构，只需要回答问题。

### 使用步骤

#### 1. 安装依赖（已添加到 package.json）

```bash
npm install
```

#### 2. 生成组件

**交互式生成**：
```bash
npm run gen
# 或
npm run gen:component
```

**流程**：
1. 输入组件名称（PascalCase，如 `GlassCard`）
2. 选择组件类型（Dumb 或 Smart）
3. 自动生成以下文件：
   - `src/popup/components/ComponentName.tsx` - 组件本体
   - `src/popup/components/ComponentName.stories.tsx` - Storybook
   - `tests/components/ComponentName.ct.spec.tsx` - 视觉回归测试

### 组件类型说明

#### Dumb Component（展示型组件）

- **职责**：只负责渲染，无状态逻辑
- **规范**：严禁包含 `useEffect` 或 API 请求
- **适用场景**：纯 UI 组件、展示型卡片、按钮等

#### Smart Component（容器型组件）

- **职责**：包含业务逻辑和状态管理
- **规范**：可以包含 `useEffect`、API 请求、状态管理等
- **适用场景**：数据获取、表单处理、复杂交互逻辑

### 模板文件位置

```
plop-templates/
├── component/
│   ├── dumb.hbs          # Dumb 组件模板
│   ├── smart.hbs         # Smart 组件模板
│   └── stories.hbs       # Storybook 模板
└── test/
    └── visual-regression.hbs  # 视觉回归测试模板
```

### 自定义模板

如需修改模板，编辑 `plop-templates/` 目录下的 `.hbs` 文件即可。

---

## 方案三：视觉回归测试 - 玻璃态效果专用

### 核心原理

玻璃态效果（`backdrop-filter: blur()`）只有在复杂背景上才能被观察到。使用 **高频背景测试场 (High-Frequency Background Testbed)** 确保光学效果的像素级正确性。

### 使用步骤

#### 1. 使用 GlassTestBed 测试夹具

```typescript
import { GlassTestBed } from './fixtures/GlassTestBed';
import { GlassCard } from '@/popup/components/GlassCard';

test('玻璃效果测试', async ({ mount }) => {
  const component = await mount(
    <GlassTestBed>
      <GlassCard depthLevel={1}>Content</GlassCard>
    </GlassTestBed>
  );

  await expect(component).toHaveScreenshot('glass-effect.png');
});
```

#### 2. 背景模式选择

`GlassTestBed` 支持三种背景模式：

- **`checkerboard`**（默认）：高对比度棋盘格，最敏感，推荐用于检测模糊效果
- **`noise`**：噪点纹理，用于检测更细微的模糊效果
- **`gradient`**：渐变背景，用于检测模糊边缘效果

```typescript
<GlassTestBed backgroundMode="noise">
  {/* ... */}
</GlassTestBed>
```

#### 3. 运行视觉回归测试

```bash
# 运行所有组件测试
npm run test:ct

# 调试模式
npm run test:ct:debug

# 仅运行 GlassCard 测试
npx playwright test -c playwright-ct.config.ts tests/components/GlassCard.ct.spec.tsx
```

### 测试覆盖范围

`GlassCard.ct.spec.tsx` 包含以下测试：

1. **默认状态模糊效果**：验证 `backdrop-filter: blur()` 是否正确应用
2. **不同深度层级**：验证 `depthLevel` 的视觉效果差异
3. **性能模式**：验证 `performance-mode` 下的渲染
4. **禁用状态**：验证 `disabled` 状态的渲染
5. **Stacking Context**：验证 z-index 正确性（确保 Tooltip 等能浮在卡片之上）
6. **不同背景模式**：验证在不同背景下的模糊效果一致性

### 工作原理

1. **棋盘格背景**：提供高对比度图案，使模糊效果可见
2. **像素级检测**：如果 `blur` 失效，背景会变得清晰，导致截图 diff 失败
3. **CSS 属性验证**：除了截图，还验证 `backdrop-filter` CSS 属性是否正确应用

### 文件结构

```
tests/
├── components/
│   ├── fixtures/
│   │   └── GlassTestBed.tsx      # 玻璃态测试夹具
│   └── GlassCard.ct.spec.tsx     # GlassCard 视觉回归测试
```

---

## 配置检查清单

### ✅ 已完成的配置更新

1. **TypeScript 路径别名** (`tsconfig.json`)
   - 添加 `baseUrl: "."`
   - 添加 `paths: { "@/*": ["src/*"] }`

2. **Vite 路径别名** (`vite.config.ts`)
   - 添加 `resolve.alias` 配置

3. **Jest 路径别名** (`config/test/jest.config.js`)
   - 添加 `moduleNameMapper` 配置

4. **package.json 脚本**
   - `gen:types`: 生成数据库类型
   - `gen`: Plop.js 交互式生成器
   - `gen:component`: 直接生成组件

5. **.gitignore**
   - 添加注释说明 `database.types.ts` 是自动生成的

### 🔍 验证配置

运行以下命令验证配置是否正确：

```bash
# 1. 类型检查（验证路径别名）
npm run type-check

# 2. 构建（验证 Vite 配置）
npm run build

# 3. 运行测试（验证 Jest 配置）
npm run test

# 4. 运行组件测试（验证 Playwright CT 配置）
npm run test:ct
```

---

## 常见问题

### Q: `npm run gen:types` 报错 "supabase: command not found"

**A**: 需要先安装 Supabase CLI：
```bash
npm install -g supabase
```

### Q: 生成的 `database.types.ts` 应该提交到 Git 吗？

**A**: **应该提交**。虽然文件是自动生成的，但提交到版本控制可以：
- 确保团队成员共享相同的类型定义
- 在 CI/CD 中验证类型是否同步
- 提供类型定义的版本历史

### Q: 如何更新 Mapper 以适配新的数据库字段？

**A**: 
1. 运行 `npm run gen:types` 更新类型定义
2. 运行 `npm run type-check`，TypeScript 会指出 Mapper 中的类型错误
3. 根据错误信息更新 `mapper.ts` 中的转换函数

### Q: Plop.js 生成的组件不符合项目规范怎么办？

**A**: 直接编辑 `plop-templates/` 目录下的模板文件（`.hbs`），修改后重新生成即可。

### Q: 视觉回归测试失败，但组件看起来正常？

**A**: 
1. 检查是否使用了 `GlassTestBed` 测试夹具
2. 调整 `threshold` 参数（允许的像素差异百分比）
3. 检查浏览器版本和渲染引擎是否一致

---

## 总结

通过这三个方案的组合：

1. **SDD**: 编译期发现数据错误，确保类型安全
2. **DX (Plop)**: 创建期杜绝不规范，确保架构合规
3. **Visual Regression**: CI 期拦截视觉 Bug，确保渲染正确

这套组合拳将极大地增强项目的健壮性和开发效率。

