/**
 * 页面相关 Mutation Hooks
 * 封装页面操作的乐观更新逻辑，简化组件代码
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentPageService, backgroundApi } from '../../../services/popup/currentPageService';
import { TaggedPage } from '../../../shared/types/gameplayTag';
import { queryKeys } from '../../../lib/queryKeys';
import { createOptimisticUpdate, updatePageInCollection } from '../../utils/optimisticUpdate';
import { STORAGE_KEYS } from '../../../services/storageService';

/**
 * 页面标题更新 Hook
 */
export function useUpdatePageTitle(
  page: TaggedPage | null,
  setPage: (p: TaggedPage) => void
) {
  const queryClient = useQueryClient();

  if (!page) {
    // 如果页面未加载，返回一个不会执行的 mutation
    return useMutation<string, Error, string>({
      mutationFn: () => Promise.reject(new Error('Page not loaded')),
    });
  }

  const optimisticHooks = createOptimisticUpdate<TaggedPage, string>(
    queryClient,
    {
      queryKey: queryKeys.currentPage(page.url),
      storageKey: STORAGE_KEYS.PAGES,
      transform: (newTitle, previous) => {
        const updated = previous || page;
        return { ...updated, title: newTitle };
      },
      syncFn: async (newTitle) => {
        // 用户手动编辑时，传递 isManualEdit: true
        await backgroundApi.updatePageTitle(page.id, newTitle, true);
      },
      onError: (error, context) => {
        console.error('[useUpdatePageTitle] 更新失败:', error);
        // 回滚本地状态
        if (context.previous) {
          setPage(context.previous);
        }
      },
    }
  );

  return useMutation({
    // RPC 远程调用
    mutationFn: (newTitle: string) => {
      return backgroundApi.updatePageTitle(page.id, newTitle, true);
    },
    // 使用框架提供的乐观更新钩子
    onMutate: async (newTitle) => {
      // 更新 Storage 中的页面集合（先于框架的乐观更新）
      const updatedPage = { ...page, title: newTitle };
      await updatePageInCollection(page.id, () => updatedPage);
      
      // 调用框架的乐观更新
      const context = await optimisticHooks.onMutate(newTitle);
      
      // 更新本地状态（保持兼容性）
      setPage(updatedPage);
      
      return { ...context, oldTitle: page.title, previousPage: context.previous };
    },
    onError: (error, newTitle, context) => {
      optimisticHooks.onError(error, newTitle, context);
    },
    onSettled: (_data, error, variables, context) => {
      // mutationFn 返回 void，所以 data 是 undefined
      // 框架已经在 onMutate 中更新了缓存，这里不需要额外操作
      if (context) {
        optimisticHooks.onSettled(undefined, error, variables, context);
      }
    },
    retry: 2,
  });
}

/**
 * 页面标签管理 Hook（添加/移除）
 */
export function usePageTagsMutation(
  page: TaggedPage | null,
  setPage: (p: TaggedPage) => void
) {
  const queryClient = useQueryClient();

  if (!page) {
    return useMutation<void, Error, { action: 'add' | 'remove'; tagId: string }>({
      mutationFn: () => Promise.reject(new Error('Page not loaded')),
    });
  }

  const transformPage = (
    params: { action: 'add' | 'remove'; tagId: string },
    previous: TaggedPage | undefined
  ): TaggedPage => {
    const current = previous || page;
    let newTags = [...current.tags];
    
    if (params.action === 'add' && !newTags.includes(params.tagId)) {
      newTags.push(params.tagId);
    } else if (params.action === 'remove') {
      newTags = newTags.filter((t) => t !== params.tagId);
    }
    
    return { ...current, tags: newTags };
  };

  const optimisticHooks = createOptimisticUpdate<TaggedPage, { action: 'add' | 'remove'; tagId: string }>(
    queryClient,
    {
      queryKey: queryKeys.currentPage(page.url),
      storageKey: STORAGE_KEYS.PAGES,
      transform: transformPage,
      syncFn: async (params) => {
        if (params.action === 'add') {
          await backgroundApi.addTagToPage(page.id, params.tagId);
        } else {
          await backgroundApi.removeTagFromPage(page.id, params.tagId);
        }
      },
      onError: (error, context) => {
        console.error('[usePageTagsMutation] 更新失败:', error);
        if (context.previous) {
          setPage(context.previous);
        }
      },
    }
  );

  return useMutation({
    mutationFn: async (params: { action: 'add' | 'remove'; tagId: string }) => {
      if (params.action === 'add') {
        return backgroundApi.addTagToPage(page.id, params.tagId);
      } else {
        return backgroundApi.removeTagFromPage(page.id, params.tagId);
      }
    },
    onMutate: async (params) => {
      // 更新 Storage 中的页面集合
      await updatePageInCollection(page.id, (current) => transformPage(params, current));
      
      const context = await optimisticHooks.onMutate(params);
      
      // 更新本地状态
      const updatedPage = transformPage(params, context.previous);
      setPage(updatedPage);
      
      return { ...context, oldTags: page.tags, previousPage: context.previous, pageUrl: page.url };
    },
    onError: (error, params, context) => {
      optimisticHooks.onError(error, params, context);
    },
    onSettled: (_data, error, variables, context) => {
      if (context) {
        optimisticHooks.onSettled(undefined, error, variables, context);
      }
    },
    retry: 2,
  });
}

/**
 * 批量更新页面标签 Hook
 */
export function useUpdatePageTags(
  page: TaggedPage | null,
  setPage: (p: TaggedPage) => void,
  onSuccess?: (newPage: TaggedPage) => void
) {
  const queryClient = useQueryClient();

  if (!page) {
    return useMutation<TaggedPage, Error, { tagsToAdd: string[]; tagsToRemove: string[] }>({
      mutationFn: () => Promise.reject(new Error('Page not loaded')),
    });
  }

  // 定义 transform 函数，用于计算更新后的页面
  const transformPage = (params: { tagsToAdd: string[]; tagsToRemove: string[] }, previous: TaggedPage | undefined): TaggedPage => {
    const current = previous || page;
    const newTags = [...current.tags];
    
    // 添加新标签
    params.tagsToAdd.forEach(tagId => {
      if (!newTags.includes(tagId)) {
        newTags.push(tagId);
      }
    });
    
    // 移除标签
    params.tagsToRemove.forEach(tagId => {
      const index = newTags.indexOf(tagId);
      if (index > -1) {
        newTags.splice(index, 1);
      }
    });
    
    return { ...current, tags: newTags };
  };

  const optimisticHooks = createOptimisticUpdate<TaggedPage, { tagsToAdd: string[]; tagsToRemove: string[] }>(
    queryClient,
    {
      queryKey: queryKeys.currentPage(page.url),
      storageKey: STORAGE_KEYS.PAGES,
      transform: transformPage,
      syncFn: async (params) => {
        await currentPageService.updatePageTags(page.id, params);
      },
      onError: (error, context) => {
        console.error('[useUpdatePageTags] 更新失败:', error);
        if (context.previous) {
          setPage(context.previous);
        }
      },
    }
  );

  return useMutation({
    mutationFn: async (params: { tagsToAdd: string[]; tagsToRemove: string[] }) => {
      const result = await currentPageService.updatePageTags(page.id, params);
      return result.newPage;
    },
    onMutate: async (params) => {
      // 更新 Storage 中的页面集合
      await updatePageInCollection(page.id, (current) => transformPage(params, current));
      
      const context = await optimisticHooks.onMutate(params);
      
      // 更新本地状态
      const updatedPage = transformPage(params, context.previous);
      setPage(updatedPage);
      
      return { ...context, previousPage: context.previous, pageUrl: page.url };
    },
    onSuccess: (newPage, _params) => {
      // 更新缓存（使用新页面的URL，因为URL可能包含时间戳变化）
      const pageUrl = newPage.url;
      const currentPageKey = queryKeys.currentPage(pageUrl);
      queryClient.setQueryData(currentPageKey, newPage);
      setPage(newPage);
      
      // 更新 Storage
      updatePageInCollection(page.id, () => newPage).catch(console.error);
      
      // 调用成功回调
      onSuccess?.(newPage);
    },
    onError: (error, params, context) => {
      optimisticHooks.onError(error, params, context);
    },
    onSettled: (data, error, variables, context) => {
      if (data && context) {
        optimisticHooks.onSettled(data, error, variables, context);
      }
    },
    retry: 2,
  });
}

/**
 * 更新页面详情 Hook（标题和标签）
 * 用于 TaggedPage 组件的页面编辑功能
 * 
 * @param page - 要更新的页面
 * @param onOptimisticUpdate - 乐观更新回调，接收更新后的页面对象
 * @param onRollback - 回滚回调，接收原始页面对象
 */
export function useUpdatePageDetails(
  page: TaggedPage | null,
  onOptimisticUpdate?: (updatedPage: TaggedPage) => void,
  onRollback?: (originalPage: TaggedPage) => void
) {
  const queryClient = useQueryClient();

  if (!page) {
    return useMutation<TaggedPage, Error, { title: string; tagsToAdd: string[]; tagsToRemove: string[] }>({
      mutationFn: () => Promise.reject(new Error('Page not loaded')),
    });
  }

  const transformPage = (
    params: { title: string; tagsToAdd: string[]; tagsToRemove: string[] },
    previous: TaggedPage | undefined
  ): TaggedPage => {
    const current = previous || page;
    // 注意：这里我们只更新标题，标签更新需要调用方在 onOptimisticUpdate 中处理
    // 因为需要 tagName 到 tagId 的映射
    return { ...current, title: params.title };
  };

  const optimisticHooks = createOptimisticUpdate<TaggedPage, { title: string; tagsToAdd: string[]; tagsToRemove: string[] }>(
    queryClient,
    {
      queryKey: queryKeys.currentPage(page.url),
      storageKey: STORAGE_KEYS.PAGES,
      transform: transformPage,
      syncFn: async (params) => {
        await currentPageService.updatePageDetails(page.id, params);
      },
      onError: (error, context) => {
        console.error('[useUpdatePageDetails] 更新失败:', error);
        if (context.previous && onRollback) {
          onRollback(context.previous);
        }
      },
    }
  );

  return useMutation<TaggedPage, Error, { title: string; tagsToAdd: string[]; tagsToRemove: string[] }>({
    mutationFn: async (params: { title: string; tagsToAdd: string[]; tagsToRemove: string[] }) => {
      await currentPageService.updatePageDetails(page.id, params);
      // 更新后重新获取页面数据
      return currentPageService.getCurrentPage();
    },
    onMutate: async (params) => {
      // 更新 Storage 中的页面集合（只更新标题）
      await updatePageInCollection(page.id, (current) => transformPage(params, current));
      
      const context = await optimisticHooks.onMutate(params);
      
      // 调用乐观更新回调（调用方会处理标签更新和 allPages 更新）
      const updatedPage = transformPage(params, context.previous);
      onOptimisticUpdate?.(updatedPage);
      
      return { ...context, previousPage: context.previous, pageUrl: page.url, pageId: page.id };
    },
    onSuccess: (data, _params, context) => {
      if (context) {
        // 使用 setQueryData 而非 invalidateQueries
        const pageUrl = data.url;
        const currentPageKey = queryKeys.currentPage(pageUrl);
        queryClient.setQueryData(currentPageKey, data);
        
      // 更新 Storage
      updatePageInCollection(page.id, () => data).catch(console.error);
      }
    },
    onError: (error, params, context) => {
      if (context && typeof context === 'object' && 'previous' in context && 'queryKey' in context && 'storageKey' in context) {
        optimisticHooks.onError(error, params, context as any);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (data && context && typeof context === 'object' && 'previous' in context && 'queryKey' in context && 'storageKey' in context) {
        optimisticHooks.onSettled(data, error, variables, context as any);
      }
    },
    retry: 2,
  });
}

