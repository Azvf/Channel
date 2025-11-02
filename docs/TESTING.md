# 测试文档

## 概述

项目采用 Jest + React Testing Library 作为测试框架，实现了完整的自动化测试流程。

## 测试结构

```
src/
├── test/
│   ├── setup.ts          # 测试环境配置
│   └── helpers.ts        # 测试辅助函数
├── services/
│   └── __tests__/
│       ├── tagManager.test.ts  # TagManager 测试套件
│       └── logger.test.ts      # Logger 测试套件
└── ...
```

## 测试命令

```bash
# 运行所有测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 测试覆盖率

### 核心模块

| 模块 | 测试用例数 | 覆盖率 | 状态 |
|------|-----------|--------|------|
| TagManager | 50+ | 78%+ | ✅ |
| Logger | 19+ | 100% | ✅ |

### 覆盖范围

#### TagManager 测试覆盖

✅ **标签管理**
- 标签创建、更新、删除
- 标签验证（名称、长度、字符）
- 标签查找（ID、名称）
- 自动ID生成（中文支持）

✅ **标签绑定**
- 对称绑定/解绑
- 重复绑定防护
- 自引用保护
- 多标签关联

✅ **页面管理**
- 页面创建/更新
- URL标识符生成
- 页面查找

✅ **页面标签关联**
- 添加/移除标签
- 防重复添加
- Toggle接口
- 标签筛选

✅ **高级功能**
- createTagAndAddToPage
- 同名标签处理
- 数据统计
- 未使用标签清理

✅ **数据持久化**
- Chrome storage 集成
- 同步/加载数据

✅ **边界情况**
- 空字符串处理
- 无效ID处理
- 中文和特殊字符支持

#### Logger 测试覆盖

✅ **日志级别**
- Debug、Info、Warn、Error
- 命名空间隔离

✅ **上下文支持**
- 带上下文对象的日志
- 错误对象处理
- 复杂数据结构

✅ **性能计时**
- 开始/结束计时
- 带标签计时
- 额外上下文
- 精确duration返回

✅ **实际场景**
- 典型使用流程
- 错误处理场景
- 复杂上下文对象

✅ **性能表现**
- 大量日志处理效率

## 测试最佳实践

### 1. 测试文件命名
- 测试文件使用 `.test.ts` 后缀
- 与源文件放在同一目录或 `__tests__` 子目录

### 2. 测试结构
```typescript
describe('模块名', () => {
  describe('功能组', () => {
    it('应该执行特定行为', () => {
      // Arrange - 准备
      // Act - 执行
      // Assert - 断言
    });
  });
});
```

### 3. 测试辅助函数

使用 `src/test/helpers.ts` 提供的辅助函数：
- `createTestTag()` - 创建测试标签
- `waitFor()` - 异步等待
- `clearAllData()` - 清空数据
- `initTagManager()` - 初始化TagManager

### 4. 测试固件

使用 `src/test/helpers.ts` 的 `testFixtures`：
- 预定义的标签配置
- 预定义的页面配置
- 可重复使用的测试数据

## 持续集成

### GitHub Actions

项目配置了 `.github/workflows/test.yml`，包含：

✅ **触发条件**
- Push 到 main/master/develop
- Pull Request

✅ **测试矩阵**
- Node.js 18.x
- Node.js 20.x

✅ **检查项**
- 类型检查 (`tsc`)
- Lint 检查 (`eslint`)
- 测试套件 (`jest`)
- 覆盖率报告

✅ **报告上传**
- 自动上传覆盖率到 Codecov

## Mock 配置

### Chrome Extension APIs

测试环境自动 mock 以下 Chrome APIs：
- `chrome.storage.local`
- `chrome.storage.sync`
- `chrome.tabs`
- `chrome.runtime`
- `chrome.scripting`

### DOM APIs

- `window.matchMedia` 自动 mock
- `console` 方法 spy

## 添加新测试

### 步骤

1. 在对应目录创建 `__tests__` 子目录（如不存在）
2. 创建测试文件 `*.test.ts`
3. 导入必要的依赖和辅助函数
4. 编写测试用例
5. 运行 `npm test` 验证

### 示例

```typescript
import { describe, it, expect } from '@jest/globals';
import { TagManager } from '../tagManager';

describe('新功能', () => {
  it('应该正常工作', () => {
    const manager = TagManager.getInstance();
    expect(manager).toBeDefined();
  });
});
```

## 覆盖率目标

### 阈值配置

在 `jest.config.js` 中设置覆盖率阈值：

- `src/services/logger.ts`: 100% 所有指标
- `src/services/tagManager.ts`: 
  - Branches: 70%
  - Functions: 80%
  - Lines: 75%
  - Statements: 75%

### 查看覆盖率

运行 `npm run test:coverage` 会生成：
- 终端覆盖率报告
- HTML 报告（`coverage/` 目录）

## 故障排除

### 常见问题

1. **import 错误**
   - 检查 `tsconfig.json` 中的路径配置
   - 确认使用正确的 import 语法

2. **Chrome API 错误**
   - 检查 `src/test/setup.ts` 中的 mock 配置
   - 确认所有使用的 API 都已 mock

3. **异步测试失败**
   - 使用 `async/await`
   - 检查 `testTimeout` 配置

4. **覆盖率不足**
   - 查看覆盖率报告找出未覆盖代码
   - 添加相应的测试用例

## 参考资料

- [Jest 文档](https://jestjs.io/)
- [Testing Library 文档](https://testing-library.com/)
- [TypeScript 测试指南](https://jestjs.io/docs/getting-started#using-typescript)

