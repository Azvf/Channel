/**
 * 页面相关 Mutation Hooks
 * 封装页面操作的乐观更新逻辑，简化组件代码
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentPageService, backgroundApi } from '../../../services/popup/currentPageService';
import { TaggedPage } from '../../../shared/types/gameplayTag';
import { queryKeys } from '../../../lib/queryKeys';

/**
 * 页面标题更新 Hook
 */
export function useUpdatePageTitle(
  page: TaggedPage | null,
  setPage: (p: TaggedPage) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    // 1. RPC 远程调用
    mutationFn: (newTitle: string) => {
      if (!page) throw new Error('Page not loaded');
      // 用户手动编辑时，传递 isManualEdit: true
      return backgroundApi.updatePageTitle(page.id, newTitle, true);
    },

    // 2. 乐观更新（立即执行）
    onMutate: async (newTitle) => {
      if (!page) return {};

      const pageUrl = page.url;
      const currentPageKey = queryKeys.currentPage(pageUrl);

      // A. 取消正在进行的针对该 Key 的查询，防止旧数据覆盖新数据
      await queryClient.cancelQueries({ queryKey: currentPageKey });

      // B. 获取旧数据快照
      const previousPage = queryClient.getQueryData<TaggedPage>(currentPageKey);
      const oldTitle = page.title;

      // C. 乐观地更新缓存
      queryClient.setQueryData<TaggedPage>(currentPageKey, (old) => {
        if (!old) return old;
        return { ...old, title: newTitle };
      });

      // 同时更新本地状态（保持兼容性）
      setPage({ ...page, title: newTitle });

      // D. 返回上下文供回滚使用
      return { oldTitle, previousPage, pageUrl };
    },

    // 3. 错误回滚
    onError: (_err, _newTitle, context) => {
      if (!context?.pageUrl) return;
      const currentPageKey = queryKeys.currentPage(context.pageUrl);

      if (context?.previousPage) {
        queryClient.setQueryData(currentPageKey, context.previousPage);
        setPage(context.previousPage);
      } else if (page && context?.oldTitle) {
        const revertedPage = { ...page, title: context.oldTitle };
        queryClient.setQueryData(currentPageKey, revertedPage);
        setPage(revertedPage);
      }
    },

    // 4. 最终结算
    onSettled: (_data, _error, _variables, context) => {
      // 无论成功失败，都标记数据"脏"了，触发后台重新拉取最新数据
      if (context?.pageUrl) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(context.pageUrl) });
      } else if (page?.url) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(page.url) });
      }
    },

    // 5. 重试配置
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

  return useMutation({
    mutationFn: async ({
      action,
      tagId,
    }: {
      action: 'add' | 'remove';
      tagId: string;
    }) => {
      if (!page) throw new Error('Page not loaded');

      if (action === 'add') {
        return backgroundApi.addTagToPage(page.id, tagId);
      } else {
        return backgroundApi.removeTagFromPage(page.id, tagId);
      }
    },

    onMutate: async ({ action, tagId }) => {
      if (!page) return { oldTags: [] };

      const pageUrl = page.url;
      const currentPageKey = queryKeys.currentPage(pageUrl);

      // A. 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: currentPageKey });

      // B. 获取旧数据快照
      const previousPage = queryClient.getQueryData<TaggedPage>(currentPageKey);
      const oldTags = [...page.tags];

      // C. 计算新标签列表
      let newTags = [...page.tags];
      if (action === 'add' && !newTags.includes(tagId)) {
        newTags.push(tagId);
      } else if (action === 'remove') {
        newTags = newTags.filter((t) => t !== tagId);
      }

      // D. 乐观地更新缓存
      queryClient.setQueryData<TaggedPage>(currentPageKey, (old) => {
        if (!old) return old;
        return { ...old, tags: newTags };
      });

      // 同时更新本地状态（保持兼容性）
      setPage({ ...page, tags: newTags });

      return { oldTags, previousPage, pageUrl };
    },

    onError: (_err, _vars, context) => {
      if (!context?.pageUrl) return;
      const currentPageKey = queryKeys.currentPage(context.pageUrl);

      if (context?.previousPage) {
        queryClient.setQueryData(currentPageKey, context.previousPage);
        setPage(context.previousPage);
      } else if (page && context?.oldTags) {
        const revertedPage = { ...page, tags: context.oldTags };
        queryClient.setQueryData(currentPageKey, revertedPage);
        setPage(revertedPage);
      }
    },

    onSettled: (_data, _error, _variables, context) => {
      if (context?.pageUrl) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(context.pageUrl) });
      } else if (page?.url) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(page.url) });
      }
    },

    // 重试配置
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

  return useMutation({
    mutationFn: async (params: { tagsToAdd: string[]; tagsToRemove: string[] }) => {
      if (!page) throw new Error('Page not loaded');
      const result = await currentPageService.updatePageTags(page.id, params);
      return result.newPage;
    },

    onMutate: async (_params) => {
      if (!page) return { previousPage: null };

      const pageUrl = page.url;
      const currentPageKey = queryKeys.currentPage(pageUrl);

      // A. 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: currentPageKey });

      // B. 获取旧数据快照
      const previousPage = queryClient.getQueryData<TaggedPage>(currentPageKey) || page;

      // C. 保存当前页面状态用于回滚（保持兼容性）
      return { previousPage, pageUrl };
    },

    onSuccess: (newPage) => {
      // 更新缓存（使用新页面的URL，因为URL可能包含时间戳变化）
      const pageUrl = newPage.url;
      const currentPageKey = queryKeys.currentPage(pageUrl);
      queryClient.setQueryData(currentPageKey, newPage);
      setPage(newPage);
      // 调用成功回调
      onSuccess?.(newPage);
    },

    onError: (error, _params, context) => {
      console.error('更新标签失败:', error);
      // 回滚到之前的页面状态
      if (context?.previousPage && context?.pageUrl) {
        const currentPageKey = queryKeys.currentPage(context.pageUrl);
        queryClient.setQueryData(currentPageKey, context.previousPage);
        setPage(context.previousPage);
      }
    },

    onSettled: (_data, _error, _variables, context) => {
      if (context?.pageUrl) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(context.pageUrl) });
      } else if (page?.url) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(page.url) });
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

  return useMutation({
    mutationFn: async (params: {
      title: string;
      tagsToAdd: string[];
      tagsToRemove: string[];
    }) => {
      if (!page) throw new Error('Page not loaded');
      return currentPageService.updatePageDetails(page.id, params);
    },

    onMutate: async (params) => {
      if (!page) return { previousPage: null };

      const pageUrl = page.url;
      const currentPageKey = queryKeys.currentPage(pageUrl);

      // A. 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: currentPageKey });

      // B. 获取旧数据快照
      const previousPage = queryClient.getQueryData<TaggedPage>(currentPageKey) || page;

      // C. 乐观更新当前页面缓存
      // 注意：这里我们只更新标题，标签更新需要调用方在 onOptimisticUpdate 中处理
      // 因为需要 tagName 到 tagId 的映射
      const updatedPage: TaggedPage = {
        ...page,
        title: params.title,
      };

      queryClient.setQueryData<TaggedPage>(currentPageKey, updatedPage);

      // D. 调用乐观更新回调（调用方会处理标签更新和 allPages 更新）
      onOptimisticUpdate?.(updatedPage);

      return { previousPage, pageUrl, pageId: page.id };
    },

    onSuccess: (_data, _params, context) => {
      if (!context?.pageUrl) return;

      const currentPageKey = queryKeys.currentPage(context.pageUrl);

      // 成功时，标记缓存为脏，让后台重新获取最新数据
      queryClient.invalidateQueries({ queryKey: currentPageKey });
    },

    onError: (error, _params, context) => {
      console.error('更新页面详情失败:', error);

      // 回滚当前页面缓存
      if (context?.previousPage && context?.pageUrl) {
        const currentPageKey = queryKeys.currentPage(context.pageUrl);
        queryClient.setQueryData(currentPageKey, context.previousPage);
      }

      // 回滚 allPages（通过回调）
      if (context?.previousPage && onRollback) {
        onRollback(context.previousPage);
      }
    },

    onSettled: (_data, _error, _variables, context) => {
      // 最终结算：标记数据为脏，触发后台重新拉取
      if (context?.pageUrl) {
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPage(context.pageUrl) });
      }
    },

    retry: 2,
  });
}

