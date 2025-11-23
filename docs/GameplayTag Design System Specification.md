这份文档将作为后续开发的唯一真理来源 (Single Source of Truth)。


# GameplayTag Design System Specification v2.0

**核心原则：无感 (Invisible) · 流体 (Liquid) · 物理感 (Physical)**

## 项目架构概览

### 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 7
- **样式系统**: Tailwind CSS + 自定义 Design Tokens
- **动画引擎**: Framer Motion 12
- **状态管理**: TanStack Query (React Query) 5
- **后端服务**: Supabase (PostgreSQL)
- **浏览器扩展**: Chrome Extension Manifest V3
- **测试框架**: Jest + Playwright + Storybook

### 项目结构
```
src/
├── popup/              # 弹窗界面 (React UI)
│   ├── components/     # UI 组件库
│   ├── styles/         # 样式系统 (tokens.css, base.css)
│   ├── tokens/         # 动画物理常量 (animation.ts)
│   └── utils/          # 工具函数
├── background/         # Service Worker (后台服务)
├── content/           # Content Scripts (页面注入)
├── core/              # 核心业务逻辑
│   ├── config/        # 配置管理
│   └── strategies/    # 业务策略 (数据合并、查询构建等)
├── services/          # 服务层
│   ├── gameplayStore.ts  # 标签管理核心逻辑
│   ├── syncService.ts    # 数据同步服务
│   └── storageService.ts # 存储服务
├── infra/             # 基础设施层
│   ├── database/      # 数据访问层 (Chrome Storage + Supabase)
│   └── logger/        # 日志服务
└── shared/            # 共享代码
    ├── types/         # 类型定义
    ├── utils/         # 工具函数
    └── rpc-protocol/  # RPC 通信协议
```

### 设计系统实现位置
- **Design Tokens**: `src/popup/styles/tokens.css`
- **动画物理常量**: `src/popup/tokens/animation.ts`
- **玻璃材质组件**: `src/popup/components/GlassCard.tsx`
- **布局常量**: `src/popup/utils/layoutConstants.ts`

## 1\. 空间与布局 (Spacing & Layout)

我们使用 **4px 网格系统**。所有间距必须是 4 的倍数。这能创造出潜意识里的视觉韵律感。

### 基础网格 (Grid System)

> **架构改进**: 以下数值已迁移到 `src/design-tokens/tokens.ts` 作为单一真理源。具体数值由 Design Tokens 系统统一管理，本文档仅说明语义用途。开发者请直接引用 Token 变量，禁止硬编码像素值。

| Token Variable | Semantic Meaning (语义用途) |
| :--- | :--- |
| `--space-0_5` | 微调、边框内间距 |
| `--space-1` | 极紧凑元素间距 (Tag内部) |
| `--space-1_5` | 图标与文本间距 |
| `--space-2` | **标准组件内边距** (Input, Button) |
| `--space-3` | 列表项间距 |
| `--space-4` | **标准容器内边距** (Card Padding) |
| `--space-5` | 模块间距 |
| `--space-6` | 宽松的模块分割 |
| `--space-8` | 大留白 |

> **参考**: 具体数值请查看 `src/design-tokens/tokens.ts` 或 Storybook "Design Tokens" 章节。

### 布局常量 (Layout Constants)

这些常量定义了核心交互区域的物理尺寸，确保拇指操作的友好性 (Fitts's Law)。

  * **Touch Target (最小点击热区):** `--row-min-height: 44px` (Apple 标准)
  * **Control Heights (控件高度):**
      * Small: `--control-height-sm: 32px` (次要按钮)
      * Medium: `--control-height-md: 44px` (标准输入框/按钮)
      * Large: `--control-height-lg: 56px` (主要CTA、底部栏)
  * **Container Limits:**
      * Modal Max Width: `360px` (保持单手可控)
      * Menu Min Width: `150px`

-----

## 2\. 流体形态 (Liquid Conformality)

我们的圆角系统非常激进。我们不使用尖锐的矩形，而是使用\*\*“超椭圆” (Superellipse)\*\* 感觉的大圆角，使界面看起来像是由流体包裹的内容。

### 圆角系统 (Radius Scale)

> **架构改进**: 以下数值已迁移到 `src/design-tokens/tokens.ts`。文档仅说明语义，具体数值由 Token 系统管理。

| Token Variable | Visual Metaphor (视觉隐喻) |
| :--- | :--- |
| `--radius-xs` | 鹅卵石 (Tag, Checkbox) |
| `--radius-sm` | 内部元素 (List Items) |
| `--radius-md` | **标准容器** (Cards, Inputs) |
| `--radius-lg` | 强调容器 (Dropdowns) |
| `--radius-xl` | 独立面板 (Floating Panels) |
| `--radius-2xl` | **模态框** (Modals) - 像从屏幕升起的气泡 |
| `--radius-full` | 胶囊 (Buttons, Pills) |

> **参考**: 具体数值请查看 `src/design-tokens/tokens.ts` 或 Storybook "Design Tokens" 章节。

-----

## 3\. 深度感知毛玻璃系统 (Depth-Aware Glass System)

这是本设计的核心视觉特征。我们不使用静态的透明度，而是模拟真实光学的**深度衰减**。

### 物理规则

  * **深度越深 (Depth ↑)** = **模糊越低 (Blur ↓)** + **不透明度越高 (Opacity ↑)**
  * *原理：背景已经被上层模糊过了，无需再次消耗 GPU 进行高斯模糊。*

### 基础变量

```css
--glass-blur-base: 12px;       /* 基础模糊度 */
--glass-blur-decay: 2px;       /* 随深度衰减量 */
--glass-opacity-base: 0.15;    /* 基础不透明度 */
--glass-opacity-increment: 0.05; /* 随深度增加量 */
--saturation: 150%;            /* 饱和度提升 (Vibrant Effect) */
```

### 表面层级颜色 (Surface Colors)

使用 `color-mix` 动态生成，确保在 Light/Dark 模式下的自动适配。

| Token Variable | Semantic Meaning |
| :--- | :--- |
| `--bg-surface-glass` | 默认玻璃表面 (Level 1) |
| `--bg-surface-glass-subtle` | 极淡的表面 (Level 0, Inputs) |
| `--bg-surface-glass-hover` | 悬停状态 |
| `--bg-surface-glass-active` | 激活/按下状态 |
| `--bg-surface-solid-ish` | 接近不透明 (Level 10, 复杂Modals) |

-----

## 4\. 物理动效引擎 (Animation Physics)

动效必须服从物理定律，不能有线性的机械感。JS 与 CSS 共享同一套时间流速。

### 时间单位 (Duration)

> **架构改进**: 所有动画常量已迁移到 `src/design-tokens/tokens.ts` 的 `ANIMATION` 对象中。文档仅说明语义用途。

  * **Fast:** `--transition-fast` — 微交互 (Hover, Click, Focus)
  * **Base:** `--transition-base` — 布局变化 (列表展开, 卡片翻转)
  * **Slow:** `--transition-slow` — 场景切换 (Modal 进出)
  * **Hero:** `--transition-hero` — 品牌/Logo 出现的优雅动画

### 缓动曲线 (Easing)

  * **Smooth:** `--ease-smooth` — 通用平滑运动 (Google Material/iOS Standard)
  * **Glass:** `--ease-glass` — 玻璃材质的阻尼感
  * **Out Cubic:** `--ease-out-cubic` — 更有重量感的滑入 (Apple Style)

> **参考**: 具体数值请查看 `src/design-tokens/tokens.ts` 或 Storybook "Motion" 章节。开发者请使用 `DURATION` 和 `EASE` 常量，禁止硬编码毫秒值。

-----

## 5\. 语义化层级 (Semantic Elevation / Z-Index)

严禁使用魔法数字 (如 `z-index: 999`)。层级必须由内容模型决定。

| Token Variable | Level | Context |
| :--- | :--- | :--- |
| `--z-base` | 1 | 基础内容流 |
| `--z-sticky` | 10 | 粘性标题/元素 |
| `--z-app-header` | 20 | 应用顶部导航 |
| `--z-dropdown` | 30 | 下拉菜单容器 |
| `--z-modal-backdrop`| 40 | 模态框遮罩 |
| `--z-modal-content` | 41 | 模态框实体 |
| `--z-tooltip` | 50 | 工具提示 |
| `--z-context-menu` | 60 | 右键菜单 (最高交互层) |
| `--z-toast` | 100 | 全局通知/警报 |
| `--z-cursor-drag` | 1000 | 拖拽时的替身元素 |

-----

## 6\. 排版系统 (Typography)

针对小屏幕优化，优先考虑可读性与层级感。

| Token Variable | Weight | Size/Line-Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--font-header-title` | 700 | `1rem / 1.35` | `-0.02em` | 应用标题 |
| `--font-page-title` | 600 | `1.1rem / 1.35` | `-0.015em`| 页面/卡片标题 |
| `--font-body` | 400 | `0.85rem / 1.4` | `0.01em` | 正文内容 |
| `--font-list-item` | 500 | `0.9rem / 1.4` | `normal` | 列表项文本 |
| `--font-caption` | 400 | `0.8rem / 1.4` | `0.005em` | 辅助说明 |
| `--font-tag` | 500 | `0.75rem / 1.4` | `0.01em` | 标签文字 |
| `--font-micro` | 500 | `0.6rem / 1` | - | 热力图标签 |

-----

## 7\. 色彩语义 (Color Semantics)

*基于 `oklch` 或 HSL 的动态计算，支持深色模式自动适配。*

  * **Text:** Primary (100%), Secondary (50%), Tertiary (40%), Quaternary (30%).
  * **Action:** `--c-action` (Blue/Brand Color).
  * **Feedback:**
      * **Destructive:** `--color-destructive` (\#D0021B).
      * **Warning:** `--color-warning` (\#F5A623).

-----

### 设计师批注 (Designer's Note):

目前的代码实现中，`GlassCard` 组件的 `depthLevel` 逻辑和 Design Tokens 系统中的物理常量是整个体验的灵魂。请在后续开发新功能（如"导入/导出"界面）时，严格遵守上述 Token，**不要硬编码任何像素值或颜色值**。

如果在实现过程中发现现有 Token 无法满足需求，请先与我沟通，我们将讨论是否扩展系统，而不是创造一次性的样式 (One-off styles)。

---

## 9. 架构改进说明 (Architecture Improvements)

### 9.1 Design Tokens 单一真理源

所有设计值（间距、圆角、颜色、动画等）现在统一管理在 `src/design-tokens/tokens.ts` 中。这是整个设计系统的唯一真理源。

* **优势**:
  * 类型安全：TypeScript 类型检查
  * 可测试：Token 值可以通过单元测试验证
  * 自动同步：通过构建脚本自动生成 CSS 变量
  * 文档自动更新：Token 变更时，文档只需更新语义说明，无需更新具体数值

* **使用方式**:
  * 在 TypeScript 代码中：`import { SPACING, RADIUS, ANIMATION } from '@/design-tokens/tokens'`
  * 在 CSS 中：`var(--space-4)`, `var(--radius-md)`, `var(--transition-fast)`

### 9.2 文档结构优化

本文档已重构为**稳定层（Principles）**和**易变层（Reference）**：

* **稳定层**: 设计原则、语义说明（极少变动）
* **易变层**: 具体数值（指向 Token 系统或 Storybook）

这样，即使 Token 值发生变化，文档的语义说明依然准确。

---

## 8. 实现参考 (Implementation References)

### 核心文件位置
* **Design Tokens**: `src/popup/styles/tokens.css`
* **动画物理常量**: `src/popup/tokens/animation.ts`
* **玻璃材质组件**: `src/popup/components/GlassCard.tsx`
* **玻璃样式系统**: `src/popup/styles/components/glass.css`
* **布局常量**: `src/popup/utils/layoutConstants.ts`
* **动效工具**: `src/popup/utils/motion.ts`

### 使用示例
```tsx
// 使用 GlassCard 组件
import { GlassCard } from './components/GlassCard';

<GlassCard depthLevel={1}>
  {/* 内容 */}
</GlassCard>

// 使用动画常量
import { DURATION, EASE } from './tokens/animation';
import { motion } from 'framer-motion';

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: DURATION.BASE, ease: EASE.SMOOTH }}
>
  {/* 内容 */}
</motion.div>
```

### 扩展指南
如需添加新的 Design Token：
1. 在 `tokens.css` 中定义变量
2. 更新本文档的对应表格
3. 在组件中使用 `var(--token-name)` 引用
4. 确保支持 Light/Dark 模式（如适用）