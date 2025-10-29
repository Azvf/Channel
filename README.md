# Edge 浏览器插件

## 目录结构

```
src/
├── popup/           # 弹窗界面 (HTML/CSS/TS)
├── background/      # 后台服务 (Service Worker)
├── content/         # 内容脚本 (页面注入)
└── injected/        # 注入脚本 (页面上下文)
```

## 构建

```bash
npm install
npm run build
```

构建输出到 `dist/` 目录，在 Edge 中加载该目录即可。
