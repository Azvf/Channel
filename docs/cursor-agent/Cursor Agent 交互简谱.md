### Cursor Agent 交互简谱 (Prompting Protocol)

#### 1. UI 开发：区分“标准”与“特权”
* **标准新建/重构 (Standard Flow)**
    * **触发场景**: 创建新组件、结构性重构。
    * **Prompt 关键词**: `Create`, `Refactor`, `New Component`。
    * **预期行为**: Agent 会**自动拦截**代码生成，强制先创建/更新 `.stories.tsx`。
    * **📝 范例**: "Create a `GlassCard` component for the user profile."

* **快速修复 (Bypass Mode)**
    * **触发场景**: 仅修改 CSS、修微小 Bug、不涉及结构变更。
    * **Prompt 前缀**: `Hotfix:`, `Quick fix:`, `CSS tweak:`。
    * **预期行为**: **跳过** Storybook 强制流程，直接修改业务代码。
    * **📝 范例**: "Hotfix: Adjust the padding of `TagList` to use `space-2`."

#### 2. 样式指令：讲“语义”不讲“像素”
* **规范**: 严禁在 Prompt 中直接要求具体的像素值（如 `var(--space-4)`, `var(--c-light)`），必须使用 **Token 语义**。
* **❌ 禁语**: "把圆角改成 `var(--space-2)`，颜色用 `var(--c-light)`。"
* **✅ 术语**: "Use `radius-md` and `surface-base` token." / "Follow the Design Tokens."

#### 3. 逻辑开发：强调“纯净”与“分层”
* **核心逻辑 (Core/Service)**
    * **Prompt 关键词**: `Pure Logic`, `Headless Hook`, `No UI dependencies`。
    * **预期行为**: Agent 会确保逻辑层不包含 React 或 Chrome API 依赖。
    * **📝 范例**: "Create a `useTagLogic` **headless hook** to manage state. Ensure **no DOM manipulation**."

* **后台通信 (Extension)**
    * **Prompt 关键词**: `RPC`, `Service Worker`, `StorageService`。
    * **预期行为**: Agent 会拒绝直接使用 `chrome.runtime.sendMessage`，转而使用 RPC Client。
    * **📝 范例**: "Implement a background service to sync tags using **RPC protocol**."

#### 4. 工程指令：显式维护
* **Token 变更**: 若需修改设计系统，需显式指令。
    * **📝 范例**: "Update `tokens.ts` to add a new color, then run `npm run generate:tokens`."
* **架构检查**: 重构后强制检查。
    * **📝 范例**: "Refactor the import paths and verify with **Architecture Check**."

#### 5. 问题排查：定位底层根本原因
* **触发场景**: 区分症状与根本原因，而非表面修复。
    * **架构违规**: 依赖循环、层级泄漏、跨层调用。
    * **数据流问题**: 状态同步失败、RPC 通信异常、数据不一致。
    * **性能问题**: 渲染卡顿、内存泄漏、重复计算。
    * **Extension 特定**: Service Worker 生命周期、消息传递失败、存储同步异常。
* **Prompt 关键词**: `Debug:`, `Root cause:`, `Investigate:`, `Trace:`。
* **预期行为**: Agent 会进行**系统性排查**而非症状修复。
    * 使用 `codebase_search` 进行语义搜索，理解问题上下文和调用链。
    * 使用 `grep` 进行精确代码定位，追踪数据流路径。
    * 检查架构违规（运行 `npm run check:arch` 验证依赖规则）。
    * 分析日志和错误堆栈，定位异常源头。
    * 追踪完整的数据流和调用链，识别断点。
    * 提供**根本原因分析**，而非表面症状的临时修复。
* **📝 范例**: 
    * "Debug: Tags are not syncing. Investigate the root cause in the sync flow."
    * "Root cause: Why is the popup rendering slowly? Trace the component tree and data flow."
    * "Investigate: Service Worker is not receiving messages. Trace the RPC communication path."

---

**⚡️ 极简口诀：**
* **新组件**，默认 **Story** (Storybook)；
* **修小改**，前缀 **Hotfix**；
* **调样式**，只说 **Token**；
* **写逻辑**，强调 **Pure** (纯净性)；
* **查问题**，强调 **Root Cause** (根本原因)。