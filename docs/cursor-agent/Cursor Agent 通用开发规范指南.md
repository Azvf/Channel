# Cursor Agent 通用开发规范指南 (Universal Cursor Agent Guidelines)

## 1\. 架构策略：系统级路由 (System-Level Routing)

放弃单文件大而全的 `.cursorrules`，采用 **模块化 + 智能挂载** 的架构。

  * **核心原则**: 利用 IDE 的上下文能力（File Context）替代 LLM 的推理能力（Prompt Reasoning）。
  * **目录结构**:
      * `.cursorrules`: **仅保留全局通用原则**（如：语言设定、代码风格底线、人格设定）。建议体积 \< 50 行。
      * `.cursor/rules/*.mdc`: **按领域拆分**的原子化规则文件。

### .cursorrules 文件大小限制：软性最佳实践

**重要**：`< 50 行` 是一个**软性最佳实践 (Soft Best Practice)**，而非 Cursor 系统的技术硬限制。Cursor 不会因为超过 50 行就停止工作，但从架构师视角来看，保持极简具有战略价值。

#### 为什么建议 < 50 行？

在采用 `.mdc` 模块化架构后，`.cursorrules` 的角色从"唯一规则载体"转变为**全局兜底 (Global Fallback)**。

**保持极简的核心理由**：

1. **Token 经济性 (Cost & Latency)**：
   - `.cursorrules` 中的内容会被注入到**每一次**对话的 System Prompt 中
   - 如果写了 500 行，哪怕只是问 "Hello"，这 500 行都会被发送并计费
   - **< 50 行** 确保基础开销（Overhead）降到最低

2. **注意力分配 (Attention Span)**：
   - LLM 的注意力是有限的。如果 System Prompt 开头充斥着大量无关信息，模型对后续加载的特定 `.mdc` 规则的遵循度会下降（Lost in the Middle 现象）
   - **留白** 给真正重要的上下文

3. **避免规则冲突 (Conflict Reduction)**：
   - 全局规则权重通常很高。如果全局规则写得太细（例如"总是使用 React Query"），当你写一个纯 Node.js 脚本时，全局规则可能会干扰局部规则

#### 弹性区间

虽然建议 < 50 行，但这不是教条：

- **🟢 完美区间 (30 - 60 行)**：只包含人格设定、语言要求、核心代码洁癖
- **🟡 可接受区间 (60 - 100 行)**：如果项目非常复杂，有一些必须全局强制的"铁律"（如特殊的 License header、极其严格的 TS 配置），稍微多一点也可以接受
- **🔴 反模式区间 (> 200 行)**：说明没有把规则拆分干净。应该检查是否有某些规则其实只属于特定的目录或文件类型，如果是，请把它们移到对应的 `.mdc` 中

#### 应该保留什么？

在新的架构下，`.cursorrules` 应该只作为 **"宪法大纲"**，仅保留 **全项目通用** 的指令。

**推荐保留的"黄金内容"**：

1. **语言设定**：强制语言要求（中文/英文）
2. **核心人设**：通用的"资深架构师"设定（不涉及具体技术栈）
3. **代码美学**：通用的代码风格（如"不要省略代码"、"不要写废话注释"）
4. **思考习惯**：强制 CoT（思维链）的触发机制（如果这是全局要求）

**示例（极简版 .cursorrules）**：

```markdown
<SystemProtocol>

You are a World-Class Software Architect and Senior Engineer.

Language: Communicate in [Language] unless requested otherwise.

Tone: Professional, Concise, Insightful.

</SystemProtocol>

<GlobalPrinciples>

1. **No Hallucinations**: Only use verified information. If unsure, ask.

2. **Code Completeness**: NEVER skip code with "// ...rest of code". Write full implementations.

3. **Engineering Hygiene**:
   - Comments must explain WHY, not WHAT.
   - Prefer clean, self-documenting code over heavy documentation.

</GlobalPrinciples>

<RuleLoading>

You utilize a modular rule system (.cursor/rules/*.mdc).

Always explicitly check which `.mdc` rules are active for the current file context.

</RuleLoading>
```

**结论**：`< 50 行` 是一个为了逼迫开发者进行"关注点分离"的心理阈值，而不是物理阈值。只要你确信保留在 `.cursorrules` 里的每一行字，都是**在任何文件、任何任务下都必须生效的**，那么 60 行或 70 行也是完全可以接受的。但如果里面包含了特定技术栈或框架的词汇，那就说明它该瘦身了。

### 规则分类与挂载策略 (Globs Strategy)

| 规则类型 | 职责 | 挂载策略 (`globs`) | 示例 |
| :--- | :--- | :--- | :--- |
| **层级规则** | 物理架构约束 | 按目录匹配 | `src/core/**/*` (禁止依赖 UI) |
| **技术栈规则** | 特定框架规范 | 按扩展名匹配 | `**/*.tsx` (React), `**/*.sql` (DB) |
| **工作流规则** | 强制流程拦截 | **空 globs** (依靠语义触发) | `Agent Trigger: Create component...` |
| **工程规则** | 质量与工具链 | 全局代码文件 | `**/*.ts`, `config/**/*` |

-----

## 2\. 规则文件解剖学 (.mdc Anatomy)

### 核心原则：精简优先 (Brevity First)

**MANDATORY**: `.mdc` 文件必须尽可能精简。每个规则文件只包含**真正必要**的内容。

**精简原则**：
- **避免冗余**：如果规则已经在其他文件中说明，不要重复
- **按需补充**：根据领域风险级别（L/M/S）决定 CoT 和 Implementation Patterns 的详细程度
- **文字优先**：对于低风险领域（工程配置、文档维护），纯文字规则通常已足够，无需代码示例
- **工作流例外**：工作流拦截器（如 `new-component-workflow.mdc`）专注于拦截逻辑，不需要完整的标准结构

**精简检查清单**：
- [ ] 是否所有内容都是该领域独有的？（避免与其他规则文件重复）
- [ ] CoT 协议是否匹配风险级别？（L 级详细，M 级聚焦边界，S 级可简化或省略）
- [ ] Implementation Patterns 是否真的必要？（高复杂度领域才需要代码模板）
- [ ] 是否有冗余的代码示例？（如果文字规则已足够清晰，无需示例）

每个 `.mdc` 文件应遵循标准结构，确保 Agent "读得懂、记得住"，同时保持精简。

```markdown
---
description: [动词开头] 简述规则作用 (e.g., Enforce UI component standards)
globs: src/domain/**/*.ts
alwaysApply: false
---

# [Domain Name] Architecture

## 1. Persona & Context (角色定位)
*定义该领域的专家身份及核心关注点（Top 3 Priorities）。*

### 为什么需要 Persona Context？

在追求极致工程标准的复杂项目中，Persona Context 不是"锦上添花"，而是**必要的上下文锚定 (Context Anchoring)**。

**LLM 的默认行为是"平庸的万金油"**。如果不加限定，它会倾向于生成"能跑就行"的代码。

- **不加 Persona**：AI 处于"通用编程模式"，它会觉得写冗余注释是"负责任的表现"。
- **加上 Persona**：AI 切换到"特定专家模式"。
  - 如果是 **"Senior Architect"**，它会认为冗余注释是"对他人的侮辱"，从而拒绝生成。
  - 如果是 **"Runtime Expert"**，它会把运行时 API 视为"随时可能崩溃的易碎品"，从而通过防御性代码来保护它。

### Persona 的两种类型

根据规则文件的职责，Persona 可以分为两种类型：

#### 类型 A: 领域专家 (Domain Expert)

**适用场景**：核心业务逻辑、技术栈特定规范、架构约束

**特征**：
- 专注于特定技术领域的深度知识
- 优先考虑性能、安全性、架构正确性
- 对"常见但错误"的模式有敏锐的识别能力

**示例模板**：
```markdown
## Persona Context

You are a [Domain] Expert. Your expertise prioritizes:

1. **[Priority 1]**: [核心关注点，如性能、安全性]
2. **[Priority 2]**: [次要关注点，如可维护性]
3. **[Priority 3]**: [补充关注点，如可测试性]
```

#### 类型 B: 流程守卫 (Process Guardian)

**适用场景**：工作流拦截、代码质量检查、工程规范

**特征**：
- 专注于流程合规性和代码质量
- 有"洁癖"倾向，严格执行规范
- 有权限拒绝不符合规范的代码

**示例模板**：
```markdown
## Persona Context

You are a [Role] and Code Quality Guardian.

Your distinct role is to enforce "[Quality Standard]" over "Feature Completion".

- **Mindset**: [核心价值观，如"讨厌冗余"、"追求简洁"]
- **Authority**: You have the authority to REJECT code that violates [specific rules]
- **Focus**: [关注领域，如可维护性、CI/CD 可靠性]
```

### Persona 的作用范围

**Persona 是"软规则"的倍增器**：

- **对于硬规则**（如 `globs` 匹配、`import` 路径、语法约束），Persona 作用不大。这些规则由工具强制执行。
- **对于软规则**（如"代码风格"、"注释质量"、"架构思维"、"防御性编程"），Persona 至关重要。它让 AI 从"能跑就行"切换到"追求卓越"。

### Persona 设计原则

1. **明确优先级**：列出 Top 3 关注点，让 AI 知道在冲突时如何取舍
2. **赋予权威**：明确说明 AI 有权限拒绝不符合规范的代码
3. **体现价值观**：通过 Mindset 描述，让 AI 理解"为什么"要这样做
4. **区分类型**：领域专家关注"怎么做对"，流程守卫关注"怎么合规"

## 2. Documentation Dependencies (知识库索引)
*建立文档的 SSOT（单一真理源），防止 AI 瞎编。*
- **Architecture**: `docs/arch-spec.md`
- **Style**: `docs/style-guide.md`

## 3. CoT Protocol (思维链协议 - 差异化执行)
*强制 Agent 在写代码前输出分析块，但根据领域风险采用不同力度。*

### 为什么需要 CoT？

在普通 CRUD 项目中，CoT 可能是累赘。但在复杂架构项目中，CoT 的核心价值在于 **"对抗 LLM 的惰性"**。

LLM 在生成代码时倾向于"求快"，优先生成最常见的模式。但在复杂项目中，"常见模式"往往是**错误**的。CoT 通过强制显性分析，将架构文档中的"为什么"转化为代码生成时的"必须检查什么"。

**核心价值**：
- **显性化隐性知识**: 把架构原则转化为可执行的检查清单
- **防止模式匹配错误**: 阻止 LLM 使用"常见但错误"的模式
- **降低 Code Review 成本**: 在代码生成阶段就捕获架构违规

**结论**：CoT 本质上是**把"隐性知识"转化为"显性步骤"**。没有 CoT，Agent 容易"记住了架构，但在写具体那一行代码时忘了"。

### 差异化策略：S/M/L 三级 CoT 协议

不要把 CoT 当作"八股文"，而要把它当作 **"起飞前的检查单 (Pre-flight Checklist)"**。根据领域风险采用不同力度：

#### 🔥 L 级 (Large - 必须有，且详细)

**适用场景**: 高风险领域（运行时安全、渲染性能、并发控制等）

**原因**: 这些领域的错误代价最高（系统崩溃、性能卡顿、数据丢失），且很难被静态检查发现。

**协议内容**:
- **运行时安全**: 必须分析运行时状态检查、序列化边界、生命周期管理、资源限制
- **渲染性能**: 必须分析层级数量、重绘范围、合成策略、动画属性、性能预算、设计系统合规性

**示例**:
```markdown
## Runtime Safety Analysis (Required)

Before writing any runtime code, you MUST output an analysis that addresses:

1. **Runtime State Check**: Verify runtime context validation in all async operations
2. **Serialization Boundaries**: Confirm all data crossing boundaries is serializable
3. **Lifecycle Management**: Identify state persistence requirements and confirm implementation
4. **Resource Constraints**: Estimate resource footprint. If exceeds threshold, specify optimization strategy
```

#### 🛡️ M 级 (Medium - 推荐有，聚焦边界)

**适用场景**: 架构约束、数据一致性、依赖管理

**原因**: 主要是为了防止架构穿透（下层引用上层）和保证数据一致性。

**协议内容**:
- **Layering**: 确认当前代码属于哪一层？是否符合分层架构？
- **Dependency**: 确认没有引入上层依赖？依赖方向是否正确？
- **SSOT**: 确认数据流向符合单一真理源原则？

**示例**:
```markdown
## Architectural Analysis (Required)

Before writing any code, you MUST output an analysis that addresses:

1. **Layer & Domain**: Identify strict architectural layer (UI/Service/Core)
2. **Dependency Direction**: Confirm no upward dependencies (Core → UI)
3. **SSOT Compliance**: Verify data flow follows Single Source of Truth
```

#### ⚡ S 级 (Small - 可以简化或省略)

**适用场景**: 工程配置、文档维护、测试代码

**原因**: 这些领域的逻辑相对线性，风险较低，主要遵循代码风格即可。

**策略**:
- **无需强制 CoT**。只要遵循代码风格即可。
- 或者只要求一句话："Verify globs coverage before editing."

**示例**:
```markdown
## Pre-Edit Checklist

Before editing, verify:
- [ ] File matches globs pattern
- [ ] No hardcoded values in documentation
```

### CoT 设计原则

1. **检查单思维**: CoT 不是"八股文"，而是"起飞前的检查单"。每个检查项都应该对应一个具体的风险点
2. **量化指标**: 使用具体数字（如 "Layer Count > 10"、"Memory > 1MB"）而非模糊描述
3. **可执行性**: 检查项应该能直接转化为代码中的验证逻辑或注释
4. **差异化策略**: 对于高风险领域（运行时安全、高频渲染），如果不加 CoT，Code Review 时间会增加 3 倍。对于其他部分，保持简单即可
5. **精简优先**: 不要为所有领域都添加详细的 CoT。S 级领域（工程配置、文档维护）可以简化或省略，避免过度设计

## 4. Critical Prohibitions (防御性禁令)
*明确的 Negative Constraints。*
- NEVER import X from Y.
- NEVER use raw API Z.

## 5. Implementation Patterns (最佳实践)

**核心原则**：不要机械地为"所有"文件补充，而是采取**"高危区强制，低危区按需"**的策略。

**精简原则**：对于低风险领域（工程配置、文档维护、测试代码），纯文字规则通常已足够清晰，无需添加代码示例。只有高复杂度领域才需要代码模板。

### 为什么需要 Implementation Patterns？

**Prompt 中的"负面禁令" (Critical Prohibitions) 告诉 AI "不要做什么"，而"实现模式" (Implementation Patterns) 告诉 AI "应该怎么做"。**

对于 LLM 来说，**Positive Examples (正向示例)** 的引导效果往往优于纯文本规则。如果只禁止不做什么，AI 可能会创造出五花八门的"正确"写法，导致代码风格不统一。

**Implementation Patterns 是消除代码风格差异的终极武器**。当 AI 被规则拦截（比如"禁止硬编码"）后，它不需要去猜"那我该怎么写？"，而是可以直接参考"标准答案"，从而极大提高一次性通过率。

### 分级策略：高危区强制，低危区按需

根据领域复杂度和错误代价，采用三级补充策略：

#### 🔥 必须补充 (Must Have)：高复杂度与非标逻辑区域

**适用场景**：运行时安全、渲染性能、并发控制等高风险领域

**原因**：这些领域的代码逻辑非常具体且容易出错，纯文字描述不够，必须给**代码模板 (Code Templates)**。

**补充内容**：
- **运行时安全**：提供安全的 IPC 调用模式、运行时检查模式、错误处理模式
- **渲染性能**：提供组件骨架、Token 使用模式、层级管理模式

**示例结构**：
```markdown
## Implementation Patterns

### Safe Runtime Call Pattern

```typescript
// ✅ CORRECT: With runtime check and error handling
const safeCall = async <T>(operation: () => Promise<T>): Promise<T | null> => {
  if (!runtime?.isValid) {
    console.warn('Runtime context invalidated');
    return null; // Graceful exit
  }
  try {
    return await operation();
  } catch (error) {
    logger.error('Operation failed', error);
    return null;
  }
};
```

### Component Skeleton Pattern

```tsx
// ✅ CORRECT: Using design tokens and semantic layering
import { DesignToken } from '@/design-tokens/tokens';

export const Component = () => (
  <Container
    depthLevel={2} // Explicit depth
    style={{ gap: DesignToken.SPACING[4] }} // Use Token
  >
    <div className="z-base relative">
      {/* Content */}
    </div>
  </Container>
);
```
```

#### 🛡️ 推荐补充 (Nice to Have)：架构强约束区域

**适用场景**：架构约束、数据一致性、依赖管理等中风险领域

**原因**：虽然文字规则写了约束，但给一个**标准结构示例**，能防止 AI 把不同层的逻辑混在一起。

**补充内容**：
- **架构分层**：提供 Headless Hook 标准结构、Repository 模式示例
- **数据流**：提供 Mapper 转换模式、状态管理模式

**示例结构**：
```markdown
## Implementation Patterns

### Headless Hook Structure

```typescript
// ✅ CORRECT: Separation of Logic and UI
export const useBusinessLogic = () => {
  // 1. Data Selection (Pure)
  const data = useStore(selectData);
  
  // 2. Interaction Handlers
  const handleAction = useCallback((id: string) => {
    // Logic only, no DOM manipulation
    service.performAction(id);
  }, []);

  // 3. Return Interface (Props + Actions)
  return {
    data, // Data
    getActionProps: (id) => ({ onClick: () => handleAction(id) }) // Prop Getter
  };
};
```
```

#### ⚡ 不必强制 (Optional)：线性逻辑区域

**适用场景**：工程配置、文档维护、测试代码、工作流控制

**原因**：这些领域的逻辑相对线性，纯文本规则通常已经足够清晰。

**策略**：
- **工程配置**：除非发现 AI 经常写错配置结构，否则不需要特意加 Example
- **工作流控制**：流程控制文件的核心是拦截指令，不需要代码示例
- **测试代码**：除非测试用例结构经常出错，否则保持简洁即可

### Implementation Patterns 设计原则

1. **正向引导优先**：提供 `<GoodExample>`，尽量避免提供 `<BadExample>`（防止污染上下文）
2. **完整可运行**：示例代码应该是完整、可运行的，而不是片段
3. **注释说明**：在示例中添加关键注释，说明"为什么这样写"
4. **模板化思维**：将示例设计为可复用的模板，而非一次性代码

### 补充检查清单

在决定是否为某个规则文件补充 Implementation Patterns 时，问自己：

- [ ] 这个领域的代码逻辑是否复杂且容易出错？
- [ ] 纯文字规则是否不足以防止代码风格差异？
- [ ] AI 是否经常在这个领域生成"正确但风格不统一"的代码？
- [ ] 是否有明确的"标准写法"可以作为模板？

如果以上问题有 2 个以上答案为"是"，则应该补充 Implementation Patterns。
```

-----

## 3\. 核心治理模式 (Core Governance Patterns)

将具体的业务需求抽象为以下四种通用治理模式：

### 模式 A: 基础设施稳定性协议 (Infrastructure Stability Protocol)

*针对 Design Tokens、API Client、核心配置等“只读”资源。*

  * **原则**: 默认情况下，基础设施文件对 Agent 是 **Read-Only** 的。
  * **通用 Prompt**:
    > "Treat [infrastructure file path] as Immutable Infrastructure. NEVER modify existing values to fix local issues. Adapt your component to the system, not the system to the component."
  * **特权模式 (Privileged Mode)**:
    > "Override only if user prompt starts with 'UPDATE SYSTEM:'."

### 模式 B: 拦截器工作流 (Interceptor Workflow)

*针对组件开发、数据库变更等复杂任务。*

  * **原则**: 在执行具体代码前，强制插入“中间步骤”。
  * **通用 Prompt**:
    > "MANDATORY INTERCEPTOR: When requested to create X, STOP. First generate Y (e.g., Storybook/Test/Plan). Only proceed after Y is verified."
  * **豁免机制 (Bypass)**:
    > "EXCEPTION: Skip if user prompts 'Hotfix' or 'Quick fix'."

### 模式 C: 纯净性与防腐层 (Purity & Anti-Corruption)

*针对核心业务逻辑与外部依赖的隔离。*

  * **原则**: 核心层 (Core) 严禁依赖 UI 框架或特定运行时 API。
  * **通用 Prompt**:
    > "Platform Agnostic: [core layer path] must be pure logic. NEVER import UI frameworks or runtime-specific APIs."

### 模式 D: 工程卫生 (Engineering Hygiene)

*针对注释、文档和临时文件的管理。*

  * **原则**: 保持代码库的高信噪比。
  * **通用 Prompt (注释)**:
    > "Redundancy Ban: STRICTLY PROHIBIT comments that mirror code (e.g., `// Set id`). Comment ONLY on 'WHY' (business logic, edge cases)."
  * **通用 Prompt (文档)**:
    > "No Ephemeral Artifacts: DO NOT generate temporary `.md` or `.txt` plans in the file system. Output thinking process in the Chat."

-----

## 4\. 查漏补缺清单 (The "Blind Spot" Checklist)

在设计完规则后，必须检查以下容易遗漏的区域（Globs Coverage）：

1.  **共享目录归属**: 共享工具目录（如 `src/shared`、`src/utils`）往往是无主之地，容易被写出"脏代码"。必须显式分配给某个规则文件。
2.  **根目录配置**: 构建配置文件（如 `vite.config.ts`、`tsconfig.json`、`tailwind.config.js`）需要被工程规则文件覆盖。
3.  **Hooks 的二元性**: UI Hooks（动画、交互）归 UI 规则，业务 Hooks（数据、状态）归数据层规则。

-----

## 5\. 提示词工程微技巧 (Micro-Prompting Tips)

  * **引用即链接**: 提到文档时，使用相对路径（如 `docs/xx.md`），让 Cursor 可以点击或索引。
  * **Recency Effect (近因效应)**: 将最重要的禁令（Prohibitions）放在 `.mdc` 文件的底部，就在 Agent 开始写代码之前。
  * **语义化触发词**: 在 `.mdc` 的 `description` 中堆砌关键词（Trigger Words），如 "Refactor, Create, Fix, Optimize"，提高命中率。
