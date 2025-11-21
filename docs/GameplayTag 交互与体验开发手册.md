这份文档不同于 UI 规范（关注长什么样），它关注的是**软件的行为逻辑（怎么运作）**。这是我们区别于普通 CRUD 应用的核心竞争力。

---

# GameplayTag 交互与体验开发手册
**核心理念：物理感 (Physicality) · 零延迟 (Zero Latency) · 渐进式 (Progressive)**

## 1. 视觉物理系统 (Visual Physics System)
*我们不渲染像素，我们模拟材质。*

### 1.1 深度感知渲染 (Depth-Aware Rendering)
所有玻璃材质组件（`GlassCard`, `GlassPanel`）必须感知其所处的深度层级。
* **规则**: 随着层级（Depth）增加，视觉表现需遵循物理光学规律：
    * **模糊度 (Blur)**: 递减。底层背景已模糊，上层无需再次重度模糊。
    * **不透明度 (Opacity)**: 递增。为了保证可读性，越上层越接近实体。
    * **阴影 (Shadow)**: 递增。层级越高，投射的阴影越扩散。
* **实现**: 严禁手动设置背景色。必须使用 `<GlassCard depthLevel={n} />` 或 `GlassDepthProvider` 自动计算。
    * *Ref: `src/popup/components/GlassCard.tsx`, `src/popup/styles/components/glass.css`*

### 1.2 统一时间流速 (Unified Time Flow)
动效不是装饰，是界面状态变化的物理反馈。CSS 与 JS 必须共享同一套物理常量。
* **规则**: 严禁使用 `0.2s`, `ease-in-out` 等魔法数值。
* **常量映射**:
    * **微交互 (Hover/Tap)**: `DURATION.FAST` (200ms) + `EASE.SMOOTH`
    * **布局变更 (List/Size)**: `DURATION.BASE` (300ms) + `EASE.SMOOTH`
    * **入场/退场 (Modal/Panel)**: `DURATION.SLOW` (400ms) + `EASE.OUT_CUBIC` (Apple式滑入)
* **实现**: 优先使用 `src/popup/utils/motion.ts` 中的预设变体（Variants）。
    * *Ref: `src/popup/tokens/animation.ts`*

---

## 2. 交互行为规范 (Interaction Behavior)
*让软件像一个训练有素的管家，而不是一个冷冰冰的机器。*

### 2.1 渐进式退出 (Progressive Escape)
`ESC` 键是用户的“后悔药”，但它不能一次性关闭所有东西。
* **规则**: 按下 `ESC` 时，必须按照 **LIFO (后进先出)** 顺序逐层撤销操作。
    * Level 1: 关闭下拉菜单 / 清除当前输入焦点。
    * Level 2: 清空输入框内容。
    * Level 3: 关闭模态框 / 侧边栏。
* **实现**: 使用 `useProgressiveEscape` 钩子注册层级和回调。
    * *Ref: `src/hooks/useProgressiveEscape.ts`*

### 2.2 滚动锁定 (Scroll Locking)
当用户聚焦于局部任务（如打开模态框）时，背景世界必须“冻结”。
* **规则**: 任何覆盖全屏的层（Modal, Overlay）出现时，底层 `<body>` 必须锁定滚动，防止“滚动穿透”。
* **例外**: 模态框内部的内容区域允许滚动。
* **实现**: 模态框组件挂载时自动添加 `overflow: hidden` 到 body。
    * *Ref: `src/popup/components/EditPageDialog.tsx`*

### 2.3 上下文操作 (Contextual Actions)
针对不同设备优化交互密度。
* **桌面端**: 悬停 (Hover) 显示辅助操作（如删除按钮、编辑图标）。
* **移动端/触屏**: 长按 (Long Press) 触发上下文菜单，替代 Hover。
* **实现**: 列表项需同时绑定 `onMouseEnter` 和 `useLongPress`。
    * *Ref: `src/popup/utils/useLongPress.ts`*

---

## 3. 数据体验架构 (Data Experience Architecture)
*速度是最大的功能。用户感知到的速度比实际网络速度更重要。*

### 3.1 乐观更新 (Optimistic UI) - **核心军规**
任何简单的 CRUD 操作（修改标题、添加标签、删除条目），**严禁**等待服务器响应 loading。
* **流程**:
    1.  **Predict (预测)**: 用户触发操作，立即在 UI 上渲染成功后的状态。
    2.  **Render (渲染)**: 界面瞬间变化，不显示 Loading Spinner。
    3.  **Commit (提交)**: 后台静默发送请求。
    4.  **Rollback (回滚)**: 仅在极少数失败情况下，悄悄回滚并提示 Toast。
* **实现**: 必须使用 `useOptimisticMutation` 钩子包裹 API 调用。
    * *Ref: `src/hooks/useOptimisticMutation.ts`, `docs/OPTIMISTIC_UPDATE_GUIDE.md`*

### 3.2 缓存优先策略 (Stale-While-Revalidate)
我们宁愿显示旧数据，也不显示空白屏幕。
* **规则**: 
    * 页面加载时：立即从 `localStorage`/`IndexedDB` 读取上次缓存的数据渲染。
    * 数据校验：后台静默发起网络请求，对比数据版本。
    * 数据更新：如有新数据，无感替换旧数据（尽量避免布局跳动）。
* **实现**: 数据获取层统一使用 `useCachedResource`。
    * *Ref: `src/hooks/useCachedResource.ts`*

### 3.3 布局零偏移 (Zero Layout Shift)
数据加载前后，核心容器高度应保持稳定。
* **规则**: 使用 Skeleton (骨架屏) 或固定最小高度 (`min-height`) 占位，禁止内容加载导致的页面剧烈抖动。
* **实现**: 严格遵守 `layoutConstants.ts` 中的尺寸定义。

---

## 4. 组件构造准则 (Component Construction)
*保持代码库的“乐高”属性。*

### 4.1 语义化层级 (Semantic Z-Index)
严禁在 CSS 中手写 `z-index: 999`。
* **规则**: 所有层级必须引用 `tokens.css` 中的语义变量。
    * `--z-base` -> Content
    * `--z-sticky` -> Headers
    * `--z-modal-backdrop` -> Overlays
    * `--z-toast` -> Notifications
* *Ref: `src/popup/styles/tokens.css`*

### 4.2 幽灵滚动条 (Ghost Pill Scrollbar)
滚动条是工具，不是内容，平时应当隐形。
* **规则**: 
    * **Idle (闲置)**: 滚动条不可见或极淡。
    * **Hover/Scroll**: 滚动条显形为半透明药丸。
    * **Overlay**: 滚动条悬浮在内容之上，不占据布局空间。
* *Ref: `src/popup/styles/base.css`*

---

**执行建议**:
请所有开发者在提交代码审查 (PR) 前，对照此手册进行自查。任何违反“乐观更新”或“硬编码动画数值”的代码，原则上不予通过。这不仅是代码规范，更是我们对用户的承诺。