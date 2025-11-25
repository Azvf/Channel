这份文档不同于 UI 规范（关注长什么样），它关注的是**软件的行为逻辑（怎么运作）**。这是我们区别于普通 CRUD 应用的核心竞争力。

---

# GameplayTag 交互与体验开发手册
**核心理念：物理感 (Physicality) · 零延迟 (Zero Latency) · 渐进式 (Progressive)**

## 架构模式与数据流

### 数据层架构
项目采用**分层架构**，确保关注点分离和可测试性：

1. **表示层 (Presentation Layer)**
   - `src/popup/components/` - React UI 组件
   - 使用 TanStack Query 进行数据获取和缓存
   - 乐观更新通过 `useOptimisticMutation` 实现

2. **服务层 (Service Layer)**
   - `src/services/gameplayStore.ts` - 标签管理核心逻辑（内存状态）
   - `src/services/syncService.ts` - 数据同步服务（本地 ↔ 云端）
   - `src/services/storageService.ts` - 存储抽象层

3. **基础设施层 (Infrastructure Layer)**
   - `src/infra/database/` - 数据访问层
     - Chrome Storage Repository (本地存储)
     - Supabase Repository (云端存储)
   - `src/infra/logger/` - 日志服务

4. **共享层 (Shared Layer)**
   - `src/shared/types/` - 类型定义
   - `src/shared/rpc-protocol/` - Background ↔ Content Script 通信

### 数据同步策略
- **Stale-While-Revalidate**: 优先显示缓存，后台静默更新
- **乐观更新**: UI 立即响应，后台提交，失败时回滚
- **离线优先**: 支持离线操作，网络恢复后自动同步

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

* **规则**: 严禁使用 `0.2s`, `ease-in-out` 等魔法数值。所有动画参数必须从 Design Tokens 系统引用。

* **常量映射**:
    * **微交互 (Micro-interactions)**: 所有瞬态交互必须使用 `src/design-tokens/tokens.ts` 中定义的 `ANIMATION.duration.fast`。具体的毫秒数值由设计 Token 系统统一管理，禁止在组件中硬编码。
    * **布局变更 (Layout Changes)**: 使用 `ANIMATION.duration.base` + `ANIMATION.ease.smooth`
    * **入场/退场 (Modal/Panel)**: 使用 `ANIMATION.duration.slow` + `ANIMATION.ease.outCubic` (Apple式滑入)

* **实现**: 
    * 优先使用 `src/popup/utils/motion.ts` 中的预设变体（Variants）
    * 动画常量定义在 `src/design-tokens/tokens.ts`（单一真理源）
    * 运行时通过 `App.tsx` 将 JS 常量注入到 CSS 变量，确保 CSS 和 Framer Motion 使用同一套时间流速
    * *开发者请参阅 Storybook "Motion" 章节查看当前物理参数配置。*
    * *Ref: `src/design-tokens/tokens.ts`, `src/popup/tokens/animation.ts` (向后兼容), `src/popup/App.tsx`*

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

* **实现**: 
    * 使用 TanStack Query 的 `useMutation` 配合乐观更新模式
    * 通过 `onMutate` 立即更新 UI，`onError` 回滚，`onSettled` 最终同步
    * 数据层通过 `GameplayStore` 管理内存状态，确保 UI 和数据层的一致性
    * *Ref: `src/services/gameplayStore.ts`, TanStack Query 文档*

> **架构守护**: 自定义 ESLint 规则 `require-optimistic-update` 会检测 Mutation Hook 是否缺少 `onMutate` 处理，并在代码审查时提醒开发者。

### 3.2 缓存优先策略 (Stale-While-Revalidate)
我们宁愿显示旧数据，也不显示空白屏幕。
* **规则**: 
    * 页面加载时：立即从 Chrome Storage 读取上次缓存的数据渲染。
    * 数据校验：后台静默发起 Supabase 请求，对比数据版本。
    * 数据更新：如有新数据，无感替换旧数据（尽量避免布局跳动）。
* **实现**: 
    * 使用 TanStack Query 的 `staleTime` 和 `cacheTime` 配置
    * 配合 `@tanstack/react-query-persist-client` 实现持久化缓存
    * 数据层通过 `ChromeTagRepository` 和 `ChromePageRepository` 管理本地存储
    * *Ref: `src/infra/database/chrome-storage/repositories/`, `src/lib/queryClient.ts`*

### 3.3 布局零偏移 (Zero Layout Shift)
数据加载前后，核心容器高度应保持稳定。
* **规则**: 使用 Skeleton (骨架屏) 或固定最小高度 (`min-height`) 占位，禁止内容加载导致的页面剧烈抖动。
* **实现**: 严格遵守 `layoutConstants.ts` 中的尺寸定义。

---

## 4. 组件构造准则 (Component Construction)
*保持代码库的“乐高”属性。*

### 4.1 语义化层级 (Semantic Z-Index)
严禁在 CSS 中手写 `z-index: 999`。

* **规则**: 所有层级必须引用 Design Tokens 中的语义变量。
    * `--z-base` -> Content
    * `--z-sticky` -> Headers
    * `--z-modal-backdrop` -> Overlays
    * `--z-toast` -> Notifications

* **实现**: 
    * 所有 z-index 值定义在 `src/design-tokens/tokens.ts` 的 `Z_INDEX` 对象中（单一真理源）
    * 通过构建脚本自动生成到 `src/popup/styles/tokens.css`
    * 组件中通过 `var(--z-*)` 引用，确保层级语义清晰
    * *Ref: `src/design-tokens/tokens.ts`, `src/popup/styles/tokens.css`*

> **架构守护**: 自定义 ESLint 规则 `no-raw-z-index` 会检测到魔法数字 z-index 并报错。如果代码中使用 `z-index: 999`，构建将直接失败。

### 4.2 幽灵滚动条 (Ghost Pill Scrollbar)
滚动条是工具，不是内容，平时应当隐形。
* **规则**: 
    * **Idle (闲置)**: 滚动条不可见或极淡。
    * **Hover/Scroll**: 滚动条显形为半透明药丸。
    * **Overlay**: 滚动条悬浮在内容之上，不占据布局空间。
* *Ref: `src/popup/styles/base.css`*

---

## 5. 渲染性能规范 (Rendering Performance)

### 5.1 RAIL 模型性能预算

不要只说"零延迟"。定义具体的性能指标：

> **注意**: 以下数值是**性能预算指标**（Performance Budget），不是设计 Token。这些是浏览器渲染性能的物理限制，而非可配置的设计值。

* **Response (响应)**: 点击后 < 50ms 必须有视觉反馈（乐观更新）
* **Animation (动画)**: 每一帧必须在 16.6ms (60fps) 或 8.3ms (120fps) 内完成
* **Idle (空闲)**: 后台同步任务不得阻塞主线程超过 50ms (Long Task)
* **Load (加载)**: 首屏交互时间 < 3s

### 5.2 GPU 渲染策略 (Compositing)

浏览器对"毛玻璃" (`backdrop-filter: blur`) 的渲染是非常昂贵的，尤其是在高分辨率屏幕上。

* **合成层策略**: 
    * 所有 `GlassCard` 组件默认开启 `will-change: transform` 以提升为合成层
    * 警告：过多的合成层会导致 GPU 显存爆炸（Crash）
    * **同屏最大玻璃组件数**: 建议不超过 10 个（需根据设备性能调整）

* **性能监控**:
    * 使用 Chrome DevTools Performance 面板监控 Long Task
    * 利用 Chrome Tracing 确保关键交互没有引起意外的 Layout Thrashing (重排)
    * 视觉回归测试：使用 Playwright 截图对比，确保关键交互没有引起渲染性能退化

### 5.3 视觉回归测试

* 使用 Playwright 进行视觉回归测试
* 关键组件必须通过视觉回归测试
* 运行: `npm run test:ct` (包含视觉回归)

---

**执行建议**:
请所有开发者在提交代码审查 (PR) 前，对照此手册进行自查。任何违反"乐观更新"或"硬编码动画数值"的代码，原则上不予通过。这不仅是代码规范，更是我们对用户的承诺。

> **架构守护**: 架构规则已由工具强制执行：
> - 依赖规则：`dependency-cruiser`
> - Z-Index 规则：ESLint `no-raw-z-index`
> - 乐观更新提醒：ESLint `require-optimistic-update`