/**
 * 页面相关 Mutation Hooks
 * 封装页面操作的乐观更新逻辑，简化组件代码
 */

import { useOptimisticMutation } from '../../../hooks/useOptimisticMutation';
import { currentPageService, backgroundApi } from '../../../services/popup/currentPageService';
import { TaggedPage } from '../../../shared/types/gameplayTag';

/**
 * 页面标题更新 Hook
 */
export function useUpdatePageTitle(
  page: TaggedPage | null,
  setPage: (p: TaggedPage) => void
) {
  return useOptimisticMutation({
    // 1. RPC 远程调用
    mutationFn: (newTitle: string) => {
      if (!page) throw new Error('Page not loaded');
      return backgroundApi.updatePageTitle(page.id, newTitle);
    },

    // 2. 乐观更新（立即执行）
    onMutate: (newTitle) => {
      if (!page) return {};

      const oldTitle = page.title;

      // 立即修改 UI 状态
      setPage({ ...page, title: newTitle });

      // 返回回滚上下文
      return { oldTitle };
    },

    // 3. 错误回滚
    onError: (_err, _newTitle, context) => {
      if (page && context?.oldTitle) {
        setPage({ ...page, title: context.oldTitle });
      }
    },

    // 4. 重试配置
    retry: {
      maxRetries: 2,
      initialDelay: 500,
    },

    // 5. 错误消息格式化
    getErrorMessage: (error) => {
      return error instanceof Error ? error.message : '更新标题失败，请重试';
    },
  });
}

/**
 * 页面标签管理 Hook（添加/移除）
 */
export function usePageTagsMutation(
  page: TaggedPage | null,
  setPage: (p: TaggedPage) => void
) {
  return useOptimisticMutation({
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

    onMutate: ({ action, tagId }) => {
      if (!page) return { oldTags: [] };

      const oldTags = [...page.tags];

      // 计算新标签列表
      let newTags = [...page.tags];
      if (action === 'add' && !newTags.includes(tagId)) {
        newTags.push(tagId);
      } else if (action === 'remove') {
        newTags = newTags.filter((t) => t !== tagId);
      }

      setPage({ ...page, tags: newTags });

      return { oldTags };
    },

    onError: (_err, _vars, context) => {
      if (page && context?.oldTags) {
        setPage({ ...page, tags: context.oldTags });
      }
    },

    // 重试配置
    retry: {
      maxRetries: 2,
      initialDelay: 500,
    },

    // 错误消息格式化
    getErrorMessage: (error) => {
      return error instanceof Error ? error.message : '更新标签失败，请重试';
    },
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
  return useOptimisticMutation({
    mutationFn: async (params: { tagsToAdd: string[]; tagsToRemove: string[] }) => {
      if (!page) throw new Error('Page not loaded');
      const result = await currentPageService.updatePageTags(page.id, params);
      return result.newPage;
    },

    onMutate: (_params) => {
      if (!page) return { previousPage: null };
      // 保存当前页面状态用于回滚
      return { previousPage: page };
    },

    onSuccess: (newPage) => {
      // 更新缓存
      setPage(newPage);
      // 调用成功回调
      onSuccess?.(newPage);
    },

    onError: (error, _params, context) => {
      console.error('更新标签失败:', error);
      // 回滚到之前的页面状态
      if (context?.previousPage) {
        setPage(context.previousPage);
      }
    },

    retry: {
      maxRetries: 2,
      initialDelay: 500,
    },

    getErrorMessage: (error) => {
      return error instanceof Error ? error.message : '更新标签失败，请重试';
    },
  });
}

