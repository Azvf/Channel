# Supabase 项目 ID 设置指南

本文档说明如何获取和设置 Supabase 项目 ID，以便生成数据库类型定义。

---

## 方法一：从 Supabase Dashboard 获取项目 ID

### 步骤

1. **访问 Supabase Dashboard**
   - 打开 https://app.supabase.com
   - 登录你的账户

2. **选择项目**
   - 在项目列表中选择你的项目

3. **获取项目 URL**
   - 进入 **Settings** > **API**
   - 找到 **Project URL**，格式如下：
     ```
     https://abcdefghijklmnopqrst.supabase.co
     ```
   - 项目 ID 就是子域名部分：`abcdefghijklmnopqrst`

4. **设置环境变量**
   ```bash
   export SUPABASE_PROJECT_ID=abcdefghijklmnopqrst
   ```

---

## 方法二：从 .env 文件自动提取

如果你已经在 `.env` 文件中配置了 `VITE_SUPABASE_URL`，辅助脚本会自动从中提取项目 ID。

### 步骤

1. **创建或编辑 `.env` 文件**（项目根目录）
   ```bash
   VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **运行生成命令**
   ```bash
   npm run gen:types
   ```
   
   脚本会自动从 `VITE_SUPABASE_URL` 中提取项目 ID。

---

## 方法三：使用 Supabase CLI 登录

如果你已经通过 Supabase CLI 登录，可以直接使用项目 ID。

### 步骤

1. **登录 Supabase CLI**
   ```bash
   supabase login
   ```
   
   这会打开浏览器，完成 OAuth 认证。

2. **链接项目（可选）**
   ```bash
   supabase link --project-ref your-project-id
   ```

3. **设置环境变量**
   ```bash
   export SUPABASE_PROJECT_ID=your-project-id
   ```

---

## 验证设置

运行以下命令验证设置是否正确：

```bash
# 检查环境变量是否设置
echo $SUPABASE_PROJECT_ID

# 或运行生成命令（会自动验证）
npm run gen:types
```

---

## 常见问题

### Q: 项目 ID 格式是什么？

**A**: Supabase 项目 ID 是 **20 个字符的字母数字字符串**，例如：
- ✅ `abcdefghijklmnopqrst`
- ❌ `your-project-id`（这是占位符，不是真实 ID）

### Q: 如何确认项目 ID 是否正确？

**A**: 项目 ID 应该：
1. 正好 20 个字符
2. 只包含小写字母和数字（a-z, 0-9）
3. 可以从 Supabase Dashboard 的 Project URL 中提取

### Q: 运行 `npm run gen:types` 提示 "Invalid project ref format"

**A**: 这表示项目 ID 格式不正确。请检查：
1. 项目 ID 是否正好 20 个字符
2. 是否只包含小写字母和数字
3. 是否设置了正确的环境变量

### Q: 运行 `npm run gen:types` 提示 "authentication" 或 "not found"

**A**: 请先登录 Supabase CLI：
```bash
supabase login
```

### Q: 如何永久设置环境变量？

**A**: 将环境变量添加到你的 shell 配置文件中：

**Zsh** (macOS 默认):
```bash
echo 'export SUPABASE_PROJECT_ID=your-project-id' >> ~/.zshrc
source ~/.zshrc
```

**Bash**:
```bash
echo 'export SUPABASE_PROJECT_ID=your-project-id' >> ~/.bashrc
source ~/.bashrc
```

### Q: 不想每次设置环境变量怎么办？

**A**: 推荐使用 `.env` 文件方式（方法二），脚本会自动从 `VITE_SUPABASE_URL` 中提取项目 ID。

---

## 快速开始

1. **安装 Supabase CLI**（如果尚未安装）
   ```bash
   npm install -g supabase
   ```

2. **登录 Supabase**
   ```bash
   supabase login
   ```

3. **设置项目 ID**（选择一种方式）
   ```bash
   # 方式一：环境变量
   export SUPABASE_PROJECT_ID=your-project-id
   
   # 方式二：.env 文件（推荐）
   echo "VITE_SUPABASE_URL=https://your-project-id.supabase.co" >> .env
   ```

4. **生成类型定义**
   ```bash
   npm run gen:types
   ```

---

## 手动生成（高级用法）

如果你需要手动控制生成过程，可以使用：

```bash
npm run gen:types:manual
```

这需要 `SUPABASE_PROJECT_ID` 环境变量已设置。

---

## 相关文档

- [Supabase CLI 文档](https://supabase.com/docs/reference/cli)
- [SDD + DX + Visual Regression 使用指南](./SDD-DX-Visual-Regression-使用指南.md)


