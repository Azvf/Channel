/**
 * 页面相关 Mutation Hooks
 * 封装页面操作的乐观更新逻辑，简化组件代码
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentPageService, backgroundApi } from '../../../services/popup/currentPageService';
import { TaggedPage } from '../../../shared/types/gameplayTag';
import { queryKeys } from '../../../lib/queryKeys';
import { createOptimisticUpdate, updatePageInCollection } from '../../utils/optimisticUpdate';
import { STORAGE_KEYS, storageService } from '../../../services/storageService';

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
  setPage: (p: TaggedPage | null) => void,
  onSuccess?: (newPage: TaggedPage | null) => void,
  onPageDeleted?: () => void
) {
  const queryClient = useQueryClient();

  if (!page) {
    return useMutation<TaggedPage | null, Error, { tagsToAdd: string[]; tagsToRemove: string[] }>({
      mutationFn: () => Promise.reject(new Error('Page not loaded')),
    });
  }

  // 定义 transform 函数，用于计算更新后的页面
  // 注意：如果页面没有 tag 了，但在当前页面，不会删除页面（由后端逻辑处理）
  const transformPage = (params: { tagsToAdd: string[]; tagsToRemove: string[] }, previous: TaggedPage | undefined): TaggedPage | null => {
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
    
    // 如果页面没有 tag 了，返回 null 表示可能删除页面
    // 但后端会检查是否在当前页面，如果在当前页面则保留页面
    if (newTags.length === 0) {
      return null;
    }
    
    return { ...current, tags: newTags };
  };

  return useMutation({
    mutationFn: async (params: { tagsToAdd: string[]; tagsToRemove: string[] }) => {
      // 调用后端更新标签
      // 后端会检查：如果页面没有 tag 了，检查是否在当前页面
      // - 如果在当前页面，保留页面（只是没有 tag）
      // - 如果不在当前页面，删除页面
      const result = await currentPageService.updatePageTags(page.id, params);
      // result.newPage 可能是 null（如果页面被删除），也可能是页面对象（如果保留页面）
      return result.newPage;
    },
    onMutate: async (params) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.currentPage(page.url) });

      // 获取旧数据快照
      const previousPage = queryClient.getQueryData<TaggedPage>(queryKeys.currentPage(page.url)) || page;

      // 计算更新后的页面
      const updatedPage = transformPage(params, previousPage);

      // 检查是否是临时页面
      const isTemporaryPage = page.id.startsWith('temp_');
      
      // 如果页面没有 tag 了，后端会检查是否在当前页面
      // - 如果在当前页面，保留页面（只是没有 tag）
      // - 如果不在当前页面，删除页面
      // 所以这里先执行乐观更新，假设页面会被保留（如果用户在当前页面）
      // 如果后端返回 null，说明页面被删除了，在 onSuccess 中处理
      if (updatedPage === null) {
        // 页面没有 tag 了，但后端可能会保留（如果用户在当前页面）
        // 先更新为没有 tag 的页面（乐观更新）
        const pageWithoutTags = { ...previousPage, tags: [] };
        
        // 临时页面不写入Storage（不持久化）
        if (!isTemporaryPage) {
          const pageKey = `page::${page.id}`;
          try {
            await storageService.set(pageKey, pageWithoutTags);
          } catch (error) {
            console.error('[useUpdatePageTags] 更新原子化存储失败:', error);
            // 降级到集合存储
            await updatePageInCollection(page.id, () => pageWithoutTags);
          }
        }

        // 更新 React Query 缓存
        queryClient.setQueryData(queryKeys.currentPage(page.url), pageWithoutTags);

        // 更新本地状态（保留页面，只是没有 tag）
        setPage(pageWithoutTags);

        return { previousPage, pageUrl: page.url, pageId: page.id, wasDeleted: false, updatedPage: pageWithoutTags };
      } else {
        // 正常更新页面的乐观更新
        // 临时页面不写入Storage（不持久化）
        if (!isTemporaryPage) {
          const pageKey = `page::${page.id}`;
          try {
            await storageService.set(pageKey, updatedPage);
          } catch (error) {
            console.error('[useUpdatePageTags] 更新原子化存储失败:', error);
            // 降级到集合存储
            await updatePageInCollection(page.id, () => updatedPage);
          }
        }

        // 更新 React Query 缓存
        queryClient.setQueryData(queryKeys.currentPage(page.url), updatedPage);

        // 更新本地状态
        setPage(updatedPage);

        return { previousPage, pageUrl: page.url, pageId: page.id, wasDeleted: false, updatedPage };
      }
    },
    onSuccess: (newPage, _params, context) => {
      if (newPage === null) {
        // 页面已删除（用户不在当前页面）
        // 从 React Query 缓存中移除页面
        queryClient.removeQueries({ queryKey: queryKeys.currentPage(page.url) });

        // 从 Storage 中移除页面（使用原子化存储）
        // 注意：临时页面不需要从Storage移除，因为它们本来就不在Storage中
        const wasTemporary = page.id.startsWith('temp_');
        if (!wasTemporary) {
          const pageKey = `page::${page.id}`;
          storageService.remove(pageKey).catch((error) => {
            console.error('[useUpdatePageTags] 从 Storage 移除页面失败:', error);
          });
        }

        // 更新本地状态为 null
        setPage(null);

        // 触发页面删除回调
        onPageDeleted?.();

        onSuccess?.(null);
      } else {
        // 检查是否是临时页面转换为持久化页面
        const wasTemporary = context?.pageId?.startsWith('temp_') || false;
        const isNowPersistent = !newPage.id.startsWith('temp_');
        
        if (wasTemporary && isNowPersistent) {
          // 临时页面转换为持久化页面
          // 清除旧临时页面的缓存
          queryClient.removeQueries({ queryKey: queryKeys.currentPage(page.url) });
          // 设置新持久化页面的缓存
          queryClient.setQueryData(queryKeys.currentPage(newPage.url), newPage);
          
          // 更新本地状态
          setPage(newPage);
          
          // 持久化页面需要写入Storage
          const pageKey = `page::${newPage.id}`;
          storageService.set(pageKey, newPage).catch((error) => {
            console.error('[useUpdatePageTags] 更新原子化存储失败，降级到集合存储:', error);
            // 降级到集合存储
            updatePageInCollection(newPage.id, () => newPage).catch(console.error);
          });
        } else if (wasTemporary && !isNowPersistent) {
          // 仍然是临时页面（删除所有tag后）
          // 更新缓存（使用新页面的URL，因为临时页面ID可能变化）
          const pageUrl = newPage.url;
          queryClient.setQueryData(queryKeys.currentPage(pageUrl), newPage);
          
          // 更新本地状态
          setPage(newPage);
          
          // 临时页面不写入Storage（不持久化）
        } else {
          // 持久化页面的正常更新
          // 更新缓存（使用新页面的URL，因为URL可能包含时间戳变化）
          const pageUrl = newPage.url;
          const currentPageKey = queryKeys.currentPage(pageUrl);
          queryClient.setQueryData(currentPageKey, newPage);
          
          // 更新本地状态
          setPage(newPage);
          
          // 更新 Storage（优先使用原子化存储）
          const pageKey = `page::${newPage.id}`;
          storageService.set(pageKey, newPage).catch((error) => {
            console.error('[useUpdatePageTags] 更新原子化存储失败，降级到集合存储:', error);
            // 降级到集合存储
            updatePageInCollection(newPage.id, () => newPage).catch(console.error);
          });
        }
        
        // 调用成功回调
        onSuccess?.(newPage);
      }
    },
    onError: (error, _params, context) => {
      console.error('[useUpdatePageTags] 更新失败:', error);

      // 回滚：恢复旧页面
      if (context?.previousPage) {
        queryClient.setQueryData(queryKeys.currentPage(context.pageUrl), context.previousPage);
        setPage(context.previousPage);

        // 如果之前删除了页面，需要恢复 Storage
        if (context.wasDeleted) {
          const pageKey = `page::${context.pageId}`;
          storageService.set(pageKey, context.previousPage).catch(console.error);
        } else {
          // 如果之前更新了页面，需要恢复 Storage
          updatePageInCollection(context.pageId, () => context.previousPage).catch(console.error);
        }
      }
    },
    onSettled: () => {
      // 不需要额外的 settled 处理
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

/**
 * 删除页面 Hook
 * 使用乐观更新规范
 */
export function useDeletePage(
  page: TaggedPage | null,
  onOptimisticUpdate?: () => void,
  onRollback?: (page: TaggedPage) => void
) {
  const queryClient = useQueryClient();

  if (!page) {
    return useMutation<void, Error, void>({
      mutationFn: () => Promise.reject(new Error('Page not loaded')),
    });
  }

  return useMutation({
    mutationFn: async () => {
      return currentPageService.deletePage(page.id);
    },
    onMutate: async () => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.currentPage(page.url) });

      // 获取旧数据快照
      const previousPage = queryClient.getQueryData<TaggedPage>(queryKeys.currentPage(page.url));

      // 从 React Query 缓存中移除页面
      queryClient.removeQueries({ queryKey: queryKeys.currentPage(page.url) });

      // 从 Storage 中移除页面（使用原子化存储）
      const pageKey = `page::${page.id}`;
      try {
        await storageService.remove(pageKey);
      } catch (error) {
        console.error('[useDeletePage] 从 Storage 移除页面失败:', error);
      }

      // 触发远端同步（fire-and-forget）
      backgroundApi.deletePage(page.id).catch(console.error);

      // 乐观更新：调用回调
      onOptimisticUpdate?.();

      return { previousPage, pageUrl: page.url, pageId: page.id };
    },
    onError: (error, _variables, context) => {
      console.error('删除页面失败:', error);

      // 回滚缓存
      if (context?.previousPage) {
        queryClient.setQueryData(queryKeys.currentPage(context.pageUrl), context.previousPage);
      }

      // 回滚 Storage
      if (context?.previousPage) {
        const pageKey = `page::${context.pageId}`;
        storageService.set(pageKey, context.previousPage).catch(console.error);
      }

      // 回滚：恢复页面
      if (context?.previousPage) {
        onRollback?.(context.previousPage);
      }
    },
    onSettled: () => {
      // 删除操作不需要额外的 settled 处理
    },
    retry: 2,
  });
}

