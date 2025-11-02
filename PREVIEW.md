# UI 预览指南

## 在 Cursor 中预览 UI 的方法

### 方法一：使用开发预览（推荐）⭐

这是最快的方法，支持热更新，无需每次都构建：

```bash
npm run preview
```

这个命令会：
1. 启动 Vite 开发服务器
2. 自动在浏览器中打开预览页面
3. 支持热模块替换（HMR），修改代码后自动刷新

**访问地址**: http://localhost:3000/src/preview/dev-preview.html

### 方法二：构建后预览

如果你已经构建了项目，可以使用：

```bash
npm run preview:build
```

这会先构建项目，然后启动预览服务器。

### 方法三：在浏览器中加载扩展（完整功能）

1. 先构建项目：
   ```bash
   npm run build
   ```

2. 在 Chrome/Edge 中加载扩展：
   - 打开浏览器，进入扩展管理页面 (`chrome://extensions` 或 `edge://extensions`)
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录
   - 点击扩展图标即可看到完整的 popup UI（包含所有 Chrome API 功能）

### 方法四：直接打开预览文件

1. 先构建项目：
   ```bash
   npm run build
   ```

2. 在文件浏览器中打开 `preview.html` 文件（在项目根目录）

## 注意事项

⚠️ **开发预览模式限制**：
- 开发预览模式下（方法一），某些 Chrome Extension API（如 `chrome.storage`）可能不可用
- 如果需要测试完整功能，请使用方法三（在浏览器中加载扩展）

💡 **热更新**：
- 使用 `npm run preview` 时，修改代码后会自动刷新页面
- 无需手动刷新浏览器

🔧 **修改预览尺寸**：
- 预览容器默认尺寸为 400x600px（Chrome 扩展 popup 的常见尺寸）
- 如需修改，编辑 `src/preview/dev-preview.html` 中的 CSS

