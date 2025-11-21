# 乐观更新使用指南

本文档介绍如何使用 `useOptimisticMutation` Hook 实现乐观更新（Optimistic UI Updates）。

## 概述

`useOptimisticMutation` 是一个通用的乐观更新 Hook，它封装了"预测-执行-回滚"的完整生命周期，让数据修改操作具备即时反馈能力。

## 基本用法

### 示例：更新页面标题

```tsx
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { currentPageService } from '../../services/popup/currentPageService';
import { useCachedResource } from '../../hooks/useCachedResource';

function TaggingPage() {
  const { data: currentPage, mutate: mutatePage } = useCachedResource({
    key: 'current_page_view',
    fetcher: () => currentPageService.getCurrentPage(),
  });

  const { mutate: updateTitle, isLoading } = useOptimisticMutation({
    // 1. RPC 调用
    mutationFn: (newTitle: string) => 
      currentPageService.updatePageTitle(currentPage!.id, newTitle),
    
    // 2. 乐观更新：立即更新 UI
    onMutate: (newTitle) => {
      const previousTitle = currentPage?.title;
      
      // 立即更新 UI
      mutatePage({ ...currentPage!, title: newTitle });
      
      // 返回快照用于回滚
      return { previousTitle };
    },
    
    // 3. 失败回滚
    onError: (err, newTitle, context) => {
      console.error('更新标题失败:', err);
      
      if (context?.previousTitle) {
        // 恢复原值
        mutatePage({ ...currentPage!, title: context.previousTitle });
      }
      
      // 可以在这里触发 Toast 提示
      // toast.error('更新标题失败，请重试');
    },
    
    // 4. 最终一致性（可选）
    onSettled: () => {
      // 可以在这里重新拉取数据以确保绝对一致
      // refreshPage();
    },
  });

  return (
    <input
      value={currentPage?.title || ''}
      onChange={(e) => updateTitle(e.target.value)}
      disabled={isLoading}
    />
  );
}
```

## 高级用法

### 处理并发请求

Hook 内置了并发处理机制，会自动取消之前的请求：

```tsx
const { mutate: updateTitle, cancel } = useOptimisticMutation({
  mutationFn: (newTitle: string) => 
    currentPageService.updatePageTitle(pageId, newTitle),
  onMutate: (newTitle) => {
    // 乐观更新
    return { previousTitle: currentPage.title };
  },
  onError: (err, newTitle, context) => {
    // 回滚
  },
});

// 如果用户快速输入，之前的请求会被自动取消
updateTitle('新标题1');
updateTitle('新标题2'); // 自动取消 '新标题1' 的请求
```

### 手动取消

```tsx
const { mutate, cancel } = useOptimisticMutation({ /* ... */ });

// 在组件卸载时取消请求
useEffect(() => {
  return () => {
    cancel();
  };
}, [cancel]);
```

### 重置状态

```tsx
const { mutate, reset } = useOptimisticMutation({ /* ... */ });

// 重置所有状态
reset();
```

## 与现有代码的迁移

### 迁移前（手动乐观更新）

```tsx
const handleTitleChange = async (newTitle: string) => {
  const originalPage = currentPage;
  const optimisticPage = { ...currentPage, title: newTitle };
  mutatePage(optimisticPage); // 乐观更新

  try {
    await currentPageService.updatePageTitle(originalPage.id, newTitle);
  } catch (error) {
    mutatePage(originalPage); // 回滚
  }
};
```

### 迁移后（使用 Hook）

```tsx
const { mutate: updateTitle } = useOptimisticMutation({
  mutationFn: (newTitle: string) => 
    currentPageService.updatePageTitle(currentPage!.id, newTitle),
  onMutate: (newTitle) => {
    const previousTitle = currentPage?.title;
    mutatePage({ ...currentPage!, title: newTitle });
    return { previousTitle };
  },
  onError: (err, newTitle, context) => {
    if (context?.previousTitle) {
      mutatePage({ ...currentPage!, title: context.previousTitle });
    }
  },
});

const handleTitleChange = (newTitle: string) => {
  updateTitle(newTitle);
};
```

## 最佳实践

1. **总是返回回滚所需的上下文**
   ```tsx
   onMutate: (variables) => {
     const snapshot = getCurrentState();
     updateState(newState);
     return snapshot; // 返回用于回滚的快照
   }
   ```

2. **在 onError 中处理所有回滚逻辑**
   ```tsx
   onError: (err, variables, context) => {
     if (context) {
       restoreState(context); // 使用快照恢复状态
     }
   }
   ```

3. **使用 onSettled 进行最终一致性检查**
   ```tsx
   onSettled: () => {
     // 重新拉取数据以确保与服务器一致
     refreshData();
   }
   ```

4. **处理加载状态**
   ```tsx
   const { mutate, isLoading } = useOptimisticMutation({ /* ... */ });
   
   // 在 UI 中显示加载状态
   <button disabled={isLoading}>保存</button>
   ```

5. **错误处理**
   ```tsx
   const { mutate, error } = useOptimisticMutation({ /* ... */ });
   
   // 显示错误信息
   {error && <div>错误: {String(error)}</div>}
   ```

## API 参考

### MutationConfig

```typescript
interface MutationConfig<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate: (variables: TVariables) => Promise<TContext> | TContext;
  onError?: (error: unknown, variables: TVariables, context: TContext | undefined) => void;
  onSettled?: (data: TData | undefined, error: unknown, variables: TVariables, context: TContext | undefined) => void;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
}
```

### 返回值

```typescript
interface UseOptimisticMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: unknown;
  cancel: () => void;
  reset: () => void;
}
```

## 注意事项

1. **并发安全**：Hook 会自动处理并发请求，但确保 `onMutate` 和 `onError` 中的状态更新是幂等的。

2. **错误处理**：`mutate` 会抛出错误，确保在调用处使用 try-catch 或处理 Promise rejection。

3. **内存泄漏**：在组件卸载时调用 `cancel()` 以避免内存泄漏。

4. **状态同步**：虽然乐观更新提供了即时反馈，但建议在 `onSettled` 中重新拉取数据以确保最终一致性。

