# GameplayTag Design System Specification

**核心原则：无感 (Invisible) · 流体 (Liquid) · 物理感 (Physical)**

> **单一真理源声明**: 
> 本文档仅描述视觉语言的**语义用途**。
> * **设计常量 (Token)**: 定义于 [`src/design-tokens/tokens.ts`](../src/design-tokens/tokens.ts)
> * **样式变量 (CSS)**: 定义于 [`src/popup/styles/tokens.css`](../src/popup/styles/tokens.css)
> * **主题系统**: 定义于 [`src/design-tokens/theme.ts`](../src/design-tokens/theme.ts)，通过 Vanilla Extract 在构建时生成 CSS（[`src/design-tokens/theme.css.ts`](../src/design-tokens/theme.css.ts)）
> * **主题加载器**: [`src/popup/theme-loader.ts`](../src/popup/theme-loader.ts) - 在页面加载前同步应用主题，防止闪烁
> * **组件预览**: 请运行 `npm run storybook` 查看 "Design Tokens" 章节。

## 1. 空间与布局 (Spacing & Layout)

基于 **严格 4px 网格系统**（所有间距值必须是 4 的倍数）。我们不关注像素，只关注韵律和秩序。

### 语义化间距

| Token 变量 | 语义用途 (Semantic Usage) |
| :--- | :--- |
| `--space-0_5` / `1` / `1_5` | **微观间距**: 微调、边框内偏移、Tag 内部、图标与文本之间 |
| `--space-2` / `2_5` | **组件内衬**: 输入框、按钮内部的 Padding、视觉校正间距 |
| `--space-3` | **列表项间距**: 列表项之间的标准间距 |
| `--space-4` | **[基准] 标准容器**: 卡片 (Card)、输入框的标准内边距 |
| `--space-5` | **段落间距**: 舒适的段落间距 |
| `--space-6` | **模块分割**: 模块之间的 Gap |
| `--space-8` / `10` / `12` | **宏观布局**: 大模块留白、视觉分割、极大留白 |
| `--space-16` / `20` | **版式留白**: Hero Section、页面底部留白 |

### 交互物理尺寸

遵循 **Fitts's Law** (费茨定律)，确保触控友好性。

* **Touch Target**: 移动端/触屏的最小点击热区标准 (参照 Apple HIG)。
* **Controls**: 
    * `--control-height-sm`: 次要操作 / 紧凑模式
    * `--control-height-md`: **标准输入/按钮** (默认)
    * `--control-height-lg`: 底部主要 CTA

## 2. 流体形态 (Liquid Conformality)

使用 **"超椭圆" (Superellipse)** 视觉隐喻。

| Token 变量 | 视觉隐喻 | 适用场景 |
| :--- | :--- | :--- |
| `--radius-sm` | 鹅卵石 | 内部元素、列表项 |
| `--radius-md` | **标准容器** | 卡片、输入框 (最常用) |
| `--radius-xl` | 独立面板 | 浮动面板、Toast |
| `--radius-2xl` | 气泡 | 模态框 (Modal) |
| `--radius-full` | 胶囊 | 按钮、标签 (Pill) |

## 3. 深度感知毛玻璃 (Depth-Aware Glass)

核心视觉特征。模拟真实光学的**深度衰减**，而非简单的透明度。

### 分级系统 (Level-Based System)

玻璃效果根据层级分为三个级别，每个级别具有独立的模糊度、饱和度和不透明度：

| 级别 | 适用场景 | 模糊度 | 饱和度 | 不透明度 |
| :--- | :--- | :--- | :--- | :--- |
| `panel` | 侧边栏、顶部导航 | 低模糊（`var(--glass-panel-blur)`） | 高饱和度（`var(--glass-panel-saturation)`） | 中等不透明度（`var(--glass-panel-opacity)`） |
| `modal` | 模态弹窗、下拉菜单 | 中模糊（`var(--glass-modal-blur)`） | 极高饱和度（`var(--glass-modal-saturation)`） | 较高不透明度（`var(--glass-modal-opacity)`） |
| `tooltip` | 提示条、Toast | 高模糊（`var(--glass-tooltip-blur)`） | 中等饱和度（`var(--glass-tooltip-saturation)`） | 高不透明度（`var(--glass-tooltip-opacity)`） |

**CSS 变量**:
- `--glass-panel-blur`, `--glass-panel-saturation`, `--glass-panel-opacity`
- `--glass-modal-blur`, `--glass-modal-saturation`, `--glass-modal-opacity`
- `--glass-tooltip-blur`, `--glass-tooltip-saturation`, `--glass-tooltip-opacity`

**物理规则**:
1.  **Depth ↑ (深度增加)** = **Blur ↓ (模糊减少)** + **Opacity ↑ (不透明度增加)**
2.  **实现**: 严禁手动编写 `backdrop-filter`。必须使用 `<GlassCard depthLevel={n} />` 组件或直接使用分级变量。

详见: [`src/popup/components/GlassCard.tsx`](../src/popup/components/GlassCard.tsx), [`src/design-tokens/glass.ts`](../src/design-tokens/glass.ts)

## 4. 阴影与环境光 (Shadow & Ambient Lighting)

阴影系统分为两类：**物理投影**（用于 Light Mode）和**环境光晕**（用于 Dark/Cyber Mode）。

### 物理投影 (Drop Shadows)

用于 Light Mode，表现元素的物理高度：

| Token | 用途 | 效果 |
| :--- | :--- | :--- |
| `shadow-sm` | 轻微提升 | 小元素、输入框聚焦态 |
| `shadow-md` | 标准提升 | 卡片、按钮悬浮态 |
| `shadow-lg` | 显著提升 | 弹窗、下拉菜单 |
| `shadow-float` | 悬浮状态 | 卡片浮起时的扩散阴影 |

所有物理投影使用 `var(--shadow-color)` 作为颜色变量，自动适配主题。

### 环境光晕 (Glow System)

用于 Dark/Cyber Mode，使用品牌色产生漫反射，制造"屏幕在发光"的错觉：

| Token | 用途 | 效果 |
| :--- | :--- | :--- |
| `glow-sm` | 按钮或聚焦态 | 一圈紧致的光晕 |
| `glow-md` | 选中状态的卡片 | 柔和的背光 |
| `glow-lg` | 强强调元素 | 强烈的能量场 |

所有光晕效果使用 `var(--color-action)` 作为颜色变量，与品牌色联动。

### 内发光 (Inner Light)

用于玻璃边缘的高光，增加厚度感：

- `inner-light`: 顶部边缘高光
- `inner-glow`: 内发光效果

详见: [`src/design-tokens/shadow.ts`](../src/design-tokens/shadow.ts)

## 5. 物理动效 (Animation Physics)

动效必须服从物理定律。JS (Framer Motion) 与 CSS 必须共享同一套时间流速。

* **Micro (微交互)**: `--transition-fast` — Hover, Click, Focus
* **Layout (布局)**: `--transition-base` — 列表展开, 卡片翻转
* **Scene (场景)**: `--transition-slow` — Modal 进出

详见: [`src/design-tokens/tokens.ts`](../src/design-tokens/tokens.ts) 中的 `ANIMATION` 对象。

## 6. 语义化层级 (Z-Index)

严禁使用魔法数字 (如 `999`)。必须引用语义变量。

* `--z-base`: 内容流
* `--z-sticky`: 吸顶元素
* `--z-modal-backdrop` / `content`: 模态框体系
* `--z-toast`: 全局通知
* `--z-cursor-drag`: 拖拽替身 (最高)

> **架构守护**: ESLint 规则 `no-raw-z-index` 会自动检测并报错。

## 7. 多主题系统 (Multi-Theme System)

支持动态主题切换，通过 CSS 变量实现主题变量管理。

### 架构设计

主题系统采用**Vanilla Extract**实现**Zero-Runtime CSS**和**同步加载**机制：

* **Zero-Runtime CSS**: 所有主题变量在构建时通过 Vanilla Extract 预计算生成 CSS，运行时无 JavaScript 样式计算
* **CSS 变量**: 所有主题变量通过 CSS 自定义属性（`--c-*`）定义，由 Vanilla Extract 自动生成
* **同步加载**: 使用 `theme-loader.ts` 在 React 加载前同步应用主题，防止主题闪烁
* **统一数据源**: 主题变量定义在 [`src/design-tokens/theme.ts`](../src/design-tokens/theme.ts) 中，作为唯一数据源（SSOT）

### 主题定义位置

* **主题变量定义**: [`src/design-tokens/theme.ts`](../src/design-tokens/theme.ts) - 包含所有主题的 CSS 变量映射（唯一数据源）
* **CSS 生成逻辑**: [`src/design-tokens/theme.css.ts`](../src/design-tokens/theme.css.ts) - Vanilla Extract 构建时 CSS 生成逻辑
* **主题加载器**: [`src/popup/theme-loader.ts`](../src/popup/theme-loader.ts) - 在页面加载前同步应用主题，防止闪烁
* **主题工具函数**: [`src/popup/utils/theme.ts`](../src/popup/utils/theme.ts) - 运行时主题切换工具函数
* **样式变量**: [`src/popup/styles/tokens.css`](../src/popup/styles/tokens.css) - 语义化变量和派生变量定义

### 主题变量结构

主题变量采用语义化命名，主要包括：

* **背景层级**: `--bg-page`, `--bg-surface`, `--bg-overlay` - 页面、卡片、遮罩背景
* **文本层级**: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-action` - 主要、次要、辅助文本及按钮文字
* **边框**: `--border-subtle`, `--border-focus` - 分割线、聚焦边框
* **交互色**: `--color-action`, `--color-action-hover`, `--color-destructive`, `--color-warning` - 主要操作、危险、警告
* **Glass 效果**: `--glass-bg`, `--glass-border`, `--glass-shadow` - 玻璃背景、边框、阴影
* **Glass 分级**: `--glass-panel-*`, `--glass-modal-*`, `--glass-tooltip-*` - 分级玻璃效果参数
* **阴影**: `--shadow-color` - 阴影颜色（主题化）

### 扩展新主题

添加新主题只需：

1. 在 [`src/design-tokens/theme.ts`](../src/design-tokens/theme.ts) 的 `THEME_VARS` 对象中添加新主题配置
2. Vanilla Extract 会自动在构建时生成对应的 CSS 变量（通过 [`src/design-tokens/theme.css.ts`](../src/design-tokens/theme.css.ts)）
3. 确保所有必需的 CSS 变量都已定义

**架构优势**：
- **Zero-Runtime**: 所有 CSS 在构建时生成，运行时只需设置 `data-theme` 属性
- **类型安全**: TypeScript 类型检查确保主题变量一致性
- **SSOT**: `theme.ts` 是唯一数据源，无需手动同步多个文件

详见: [`src/design-tokens/theme.ts`](../src/design-tokens/theme.ts) 中的 `THEME_VARS` 对象。
