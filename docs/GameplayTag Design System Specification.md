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

| Token Variable | Value (rem/px) | Use Case (使用场景) |
| :--- | :--- | :--- |
| `--space-0_5` | `0.125rem` (2px) | 微调、边框内间距 |
| `--space-1` | `0.25rem` (4px) | 极紧凑元素间距 (Tag内部) |
| `--space-1_5` | `0.375rem` (6px) | 图标与文本间距 |
| `--space-2` | `0.5rem` (8px) | **标准组件内边距** (Input, Button) |
| `--space-3` | `0.875rem` (14px) | 列表项间距 |
| `--space-4` | `1.125rem` (18px) | **标准容器内边距** (Card Padding) |
| `--space-5` | `1.5rem` (24px) | 模块间距 |
| `--space-6` | `1.5rem` (24px) | 宽松的模块分割 |
| `--space-8` | `2rem` (32px) | 大留白 |

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

| Token Variable | Value | Visual Metaphor (视觉隐喻) |
| :--- | :--- | :--- |
| `--radius-xs` | `8px` | 鹅卵石 (Tag, Checkbox) |
| `--radius-sm` | `12px` | 内部元素 (List Items) |
| `--radius-md` | `16px` | **标准容器** (Cards, Inputs) |
| `--radius-lg` | `24px` | 强调容器 (Dropdowns) |
| `--radius-xl` | `32px` | 独立面板 (Floating Panels) |
| `--radius-2xl` | `40px` | **模态框** (Modals) - 像从屏幕升起的气泡 |
| `--radius-full` | `9999px` | 胶囊 (Buttons, Pills) |

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

  * **Fast (`200ms`):** `--transition-fast` — 微交互 (Hover, Click, Focus)。
  * **Base (`300ms`):** `--transition-base` — 布局变化 (列表展开, 卡片翻转)。
  * **Slow (`400ms`):** `--transition-slow` — 场景切换 (Modal 进出)。
  * **Hero (`700ms`):** `--transition-hero` — 品牌/Logo 出现的优雅动画。

### 缓动曲线 (Easing)

  * **Smooth:** `cubic-bezier(0.4, 0, 0.2, 1)` — 通用平滑运动 (Google Material/iOS Standard)。
  * **Glass:** `cubic-bezier(1, 0.0, 0.4, 1)` — 玻璃材质的阻尼感。
  * **Out Cubic:** `cubic-bezier(0.16, 1, 0.3, 1)` — 更有重量感的滑入 (Apple Style)。

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

目前的代码实现中，`GlassCard` 组件的 `depthLevel` 逻辑和 `animation.ts` 中的物理常量是整个体验的灵魂。请在后续开发新功能（如"导入/导出"界面）时，严格遵守上述 Token，**不要硬编码任何像素值或颜色值**。

如果在实现过程中发现现有 Token 无法满足需求，请先与我沟通，我们将讨论是否扩展系统，而不是创造一次性的样式 (One-off styles)。

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