# 导入导出功能使用说明

本功能允许用户在多个设备之间导入和导出所有标签及对应的网页数据。

## 功能概述

- **导出**：将当前所有标签和页面数据导出为 JSON 文件
- **导入（覆盖模式）**：完全替换现有数据
- **导入（合并模式）**：保留现有数据，仅添加新数据

## API 使用

### 导出数据

```typescript
import { TagManager } from './services/tagManager';

// 获取 TagManager 实例
const tagManager = TagManager.getInstance();
await tagManager.initialize();

// 导出数据为 JSON 字符串
const jsonData = tagManager.exportData();

// JSON 数据结构：
{
  tags: {
    "tag_id_1": {
      id: "tag_id_1",
      name: "前端开发",
      description: "前端开发相关",
      color: "#FF5733",
      createdAt: 1234567890,
      updatedAt: 1234567890,
      bindings: ["tag_id_2"]
    }
  },
  pages: {
    "page_id_1": {
      id: "page_id_1",
      url: "https://github.com",
      title: "GitHub",
      domain: "github.com",
      tags: ["tag_id_1"],
      createdAt: 1234567890,
      updatedAt: 1234567890,
      favicon: "https://github.com/favicon.ico"
    }
  },
  version: "1.0",
  exportDate: "2024-01-01T00:00:00.000Z"
}
```

### 导入数据（覆盖模式）

完全替换现有数据：

```typescript
const jsonData = `...`; // 导出的 JSON 字符串

const result = await tagManager.importData(jsonData, false);

if (result.success) {
  console.log(`导入成功！导入了 ${result.imported?.tagsCount} 个标签和 ${result.imported?.pagesCount} 个页面`);
} else {
  console.error(`导入失败：${result.error}`);
}
```

### 导入数据（合并模式）

保留现有数据，仅添加新数据：

```typescript
const jsonData = `...`; // 导出的 JSON 字符串

const result = await tagManager.importData(jsonData, true);

if (result.success) {
  console.log(`导入成功！添加了 ${result.imported?.tagsCount} 个标签和 ${result.imported?.pagesCount} 个页面（已合并）`);
} else {
  console.error(`导入失败：${result.error}`);
}
```

## 实际使用场景

### 场景 1：完整迁移数据到新设备

1. 在旧设备上导出数据
2. 在新设备上直接导入（使用覆盖模式）
3. 数据完全迁移

### 场景 2：合并多个设备的数据

1. 在设备 A 上导出数据
2. 在设备 B 上导入数据（使用合并模式）
3. 设备 B 的数据将被合并，保留两边的数据

### 场景 3：数据备份与恢复

1. 定期导出数据作为备份
2. 需要时导入备份数据（覆盖模式）

## 数据格式说明

### 标签 (GameplayTag)

```typescript
{
  id: string;              // 标签唯一 ID
  name: string;            // 标签名称
  description?: string;    // 标签描述（可选）
  color?: string;          // 标签颜色（可选）
  createdAt: number;       // 创建时间戳
  updatedAt: number;       // 更新时间戳
  bindings: string[];      // 绑定的其他标签 ID 列表
}
```

### 页面 (TaggedPage)

```typescript
{
  id: string;              // 页面唯一 ID
  url: string;             // 页面 URL
  title: string;           // 页面标题
  domain: string;          // 页面域名
  tags: string[];          // 关联的标签 ID 列表
  createdAt: number;       // 创建时间戳
  updatedAt: number;       // 更新时间戳
  favicon?: string;        // 页面图标（可选）
  description?: string;    // 页面描述（可选）
}
```

## 错误处理

### 常见错误

1. **无效的 JSON 格式**
   - 错误信息：`导入数据解析失败`
   - 原因：JSON 字符串格式不正确
   - 解决：检查 JSON 文件是否完整且格式正确

2. **缺少必需字段**
   - 错误信息：`无效的数据格式：缺少 tags 或 pages 字段`
   - 原因：导出的数据不完整
   - 解决：使用正确的导出方法获取数据

3. **字段类型错误**
   - 错误信息：`无效的数据格式：tags 和 pages 必须是对象`
   - 原因：数据结构不正确
   - 解决：使用正确的数据格式

## 注意事项

1. **数据持久化**：导入成功后数据会自动保存到 chrome.storage.local
2. **ID 冲突**：合并模式下，如果 ID 相同会保留现有数据
3. **绑定关系**：导出导入会保持标签之间的绑定关系
4. **页面关联**：导出导入会保持页面和标签的关联关系
5. **版本兼容性**：当前版本为 1.0，未来可能会升级

## 测试

完整的导入导出功能已包含在测试套件中，共 **15 个测试用例**，覆盖：
- 导出数据结构和完整性
- 导入覆盖模式
- 导入合并模式
- 错误处理
- 数据一致性验证
- 绑定关系保持
- 页面关联保持

运行测试：
```bash
npm test -- tagManager.test.ts
```

## 示例代码

完整的使用示例：

```typescript
import { TagManager } from './services/tagManager';

async function example() {
  // 初始化
  const tagManager = TagManager.getInstance();
  await tagManager.initialize();
  
  // 创建一些测试数据
  const tag1 = tagManager.createTag('前端', '前端开发相关', '#FF5733');
  const tag2 = tagManager.createTag('后端', '后端开发相关', '#33FF57');
  tagManager.bindTags(tag1.id, tag2.id);
  
  const page = tagManager.createOrUpdatePage(
    'https://github.com',
    'GitHub',
    'github.com',
    'https://github.com/favicon.ico'
  );
  tagManager.addTagToPage(page.id, tag1.id);
  
  // 保存数据
  await tagManager.syncToStorage();
  
  // 导出数据
  const exportData = tagManager.exportData();
  console.log('导出数据：', exportData);
  
  // 清空数据
  tagManager.clearAllData();
  
  // 导入数据（覆盖模式）
  const result = await tagManager.importData(exportData, false);
  console.log('导入结果：', result);
  
  // 验证导入成功
  const stats = tagManager.getDataStats();
  console.log('数据统计：', stats);
}
```

