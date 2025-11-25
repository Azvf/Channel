# GameplayTag Design System Specification

**核心原则：无感 (Invisible) · 流体 (Liquid) · 物理感 (Physical)**

> **单一真理源声明**: 
> 本文档仅描述视觉语言的**语义用途**。
> * **设计常量 (Token)**: 定义于 [`src/design-tokens/tokens.ts`](../src/design-tokens/tokens.ts)
> * **样式变量 (CSS)**: 定义于 [`src/popup/styles/tokens.css`](../src/popup/styles/tokens.css)
> * **主题系统**: 定义于 [`src/popup/themes/`](../src/popup/themes/)
> * **组件预览**: 请运行 `npm run storybook` 查看 "Design Tokens" 章节。

## 1. 空间与布局 (Spacing & Layout)

基于 **4px 网格系统**（网格基础单位，这是设计原则而非可配置 Token）。我们不关注像素，只关注韵律。

### 语义化间距

| Token 变量 | 语义用途 (Semantic Usage) |
| :--- | :--- |
| `--space-1` / `1_5` | **微观间距**: Tag 内部、图标与文本之间 |
| `--space-2` | **组件内衬**: 输入框、按钮内部的 Padding |
| `--space-4` | **标准容器**: 卡片 (Card) 的标准内边距 |
| `--space-6` / `8` | **宏观布局**: 模块之间的分割、大留白 |

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

**物理规则**:
1.  **Depth ↑ (深度增加)** = **Blur ↓ (模糊减少)** + **Opacity ↑ (不透明度增加)**
2.  **实现**: 严禁手动编写 `backdrop-filter`。必须使用 `<GlassCard depthLevel={n} />` 组件。

详见: [`src/popup/components/GlassCard.tsx`](../src/popup/components/GlassCard.tsx)

## 4. 物理动效 (Animation Physics)

动效必须服从物理定律。JS (Framer Motion) 与 CSS 必须共享同一套时间流速。

* **Micro (微交互)**: `--transition-fast` — Hover, Click, Focus
* **Layout (布局)**: `--transition-base` — 列表展开, 卡片翻转
* **Scene (场景)**: `--transition-slow` — Modal 进出

详见: [`src/design-tokens/tokens.ts`](../src/design-tokens/tokens.ts) 中的 `ANIMATION` 对象。

## 5. 语义化层级 (Z-Index)

严禁使用魔法数字 (如 `999`)。必须引用语义变量。

* `--z-base`: 内容流
* `--z-sticky`: 吸顶元素
* `--z-modal-backdrop` / `content`: 模态框体系
* `--z-toast`: 全局通知
* `--z-cursor-drag`: 拖拽替身 (最高)

> **架构守护**: ESLint 规则 `no-raw-z-index` 会自动检测并报错。

## 6. 多主题系统 (Multi-Theme System)

支持动态主题切换，通过继承机制简化主题扩展流程。

### 架构设计

主题系统采用**分组结构**和**继承机制**：

* **分组组织**: 主题变量按语义分组（colors, intent, text, fill, glass, material, buttons, controls, menu, glassEffect）
* **继承机制**: 新主题可以继承基础主题或现有主题，只需覆盖需要不同的变量
* **统一数据源**: 所有主题定义统一在 [`src/popup/themes/`](../src/popup/themes/) 目录中

### 主题定义位置

* **类型定义**: [`src/popup/themes/types.ts`](../src/popup/themes/types.ts) - 主题配置类型系统
* **基础主题**: [`src/popup/themes/base.ts`](../src/popup/themes/base.ts) - 包含所有默认值和通用变量
* **主题实现**: [`src/popup/themes/light.ts`](../src/popup/themes/light.ts), [`dark.ts`](../src/popup/themes/dark.ts), [`dim.ts`](../src/popup/themes/dim.ts)
* **主题注册**: [`src/popup/themes/index.ts`](../src/popup/themes/index.ts) - 主题注册和工具函数
* **运行时应用**: [`src/popup/utils/theme.ts`](../src/popup/utils/theme.ts) - 主题应用到 DOM

### 主题变量分组

主题变量按以下类别分组，每个类别包含相关的 CSS 变量：

* **colors**: 基础颜色（glass, light, dark, bg）
* **intent**: 语义化颜色（action, destructive, warning, success）
* **text**: 文本颜色层级（primary, secondary, tertiary 等）
* **fill**: 填充颜色层级（primary, secondary, tertiary 等）
* **glass**: Glass 效果参数（reflex, saturation, blur 等）
* **material**: 材质厚度系统
* **buttons**: 按钮颜色变量
* **controls**: 控件颜色变量
* **menu**: 菜单颜色变量
* **glassEffect**: Glass 效果颜色（用于 Liquid Glass）

### 扩展新主题

添加新主题只需：

1. 在 [`src/popup/themes/`](../src/popup/themes/) 目录创建新主题文件
2. 使用 `extendTheme()` 继承基础主题或现有主题
3. 只覆盖需要不同的变量（支持深度部分覆盖）
4. 在 [`src/popup/themes/index.ts`](../src/popup/themes/index.ts) 中注册新主题

详见: [`src/popup/themes/utils.ts`](../src/popup/themes/utils.ts) 中的 `extendTheme()` 函数。
