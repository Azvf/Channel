/**
 * 标签相关 Mutation Hooks
 * 封装标签操作的乐观更新逻辑，简化组件代码
 */

import { useMutation } from '@tanstack/react-query';
import { currentPageService } from '../../../services/popup/currentPageService';
import type { GameplayTag } from '../../../shared/types/gameplayTag';

/**
 * 更新标签名称 Hook
 */
export function useUpdateTag(
  onOptimisticUpdate?: (tagId: string, newName: string) => void,
  onRollback?: (tagId: string, oldName: string) => void
) {
  return useMutation({
    mutationFn: async ({ tagId, newName }: { tagId: string; newName: string; oldName?: string }) => {
      return currentPageService.updateTag(tagId, newName);
    },

    onMutate: async ({ tagId, newName, oldName }: { tagId: string; newName: string; oldName?: string }) => {
      // 乐观更新：立即更新 UI
      onOptimisticUpdate?.(tagId, newName);
      
      // 返回旧名称用于回滚
      return { tagId, oldName: oldName || '' };
    },

    onError: (error, variables, context) => {
      console.error('更新标签失败:', error);
      
      // 回滚：恢复旧名称
      if (context?.oldName) {
        onRollback?.(variables.tagId, context.oldName);
      }
    },

    onSettled: () => {
      // 最终结算：可以在这里触发数据刷新
      // 但为了保持乐观更新的效果，我们不在成功时立即刷新
      // 而是依赖 storage 事件或后台同步
    },

    retry: 2,
  });
}

/**
 * 删除标签 Hook
 */
export function useDeleteTag(
  onOptimisticUpdate?: (tagId: string) => void,
  onRollback?: (tag: GameplayTag) => void
) {
  return useMutation({
    mutationFn: async ({ tagId }: { tagId: string; tag?: GameplayTag }) => {
      return currentPageService.deleteTag(tagId);
    },

    onMutate: async ({ tagId, tag }: { tagId: string; tag?: GameplayTag }) => {
      // 乐观更新：立即从列表中移除
      onOptimisticUpdate?.(tagId);
      
      // 返回标签对象用于回滚
      return { tagId, tag: tag || null };
    },

    onError: (_error, _variables, context) => {
      console.error('删除标签失败:', _error);
      
      // 回滚：恢复标签到列表
      if (context?.tag) {
        onRollback?.(context.tag);
      }
    },

    onSettled: () => {
      // 最终结算
    },

    retry: 2,
  });
}

/**
 * 创建标签 Hook
 */
export function useCreateTag(
  onOptimisticUpdate?: (tag: GameplayTag) => void,
  onRollback?: (tagId: string) => void
) {
  return useMutation({
    mutationFn: async (tagName: string): Promise<GameplayTag> => {
      return currentPageService.createTag(tagName);
    },

    onMutate: async (tagName) => {
      // 创建临时标签对象用于乐观更新
      // 注意：这里我们创建一个临时对象，实际 ID 会在成功后由服务器返回
      const tempTag: GameplayTag = {
        id: `temp-${Date.now()}`, // 临时 ID
        name: tagName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        bindings: [],
      };
      
      // 乐观更新：立即添加到列表
      onOptimisticUpdate?.(tempTag);
      
      return { tempTagId: tempTag.id, tagName };
    },

    onSuccess: (_createdTag, _tagName, _context) => {
      // 成功时，用真实的标签替换临时标签
      // 这需要在调用方处理，因为我们需要更新列表中的标签
      // 这里我们只返回创建的标签
    },

    onError: (error, _tagName, context) => {
      console.error('创建标签失败:', error);
      
      // 回滚：移除临时标签
      if (context?.tempTagId) {
        onRollback?.(context.tempTagId);
      }
    },

    onSettled: () => {
      // 最终结算
    },

    retry: 2,
  });
}

