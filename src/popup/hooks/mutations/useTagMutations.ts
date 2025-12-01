/**
 * 标签相关 Mutation Hooks
 * 封装标签操作的乐观更新逻辑，简化组件代码
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentPageService } from '../../../services/popup/currentPageService';
import type { GameplayTag } from '../../../shared/types/gameplayTag';
import { queryKeys } from '../../../lib/queryKeys';
import { updateTagInCollection, removeTagFromCollection, addTagToCollection } from '../../utils/optimisticUpdate';

/**
 * 更新标签名称 Hook
 */
export function useUpdateTag(
  onOptimisticUpdate?: (tagId: string, newName: string) => void,
  onRollback?: (tagId: string, oldName: string) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagId, newName }: { tagId: string; newName: string; oldName?: string }) => {
      return currentPageService.updateTag(tagId, newName);
    },
    onMutate: async ({ tagId, newName, oldName }) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.allTags });

      // 获取旧数据快照
      const previousTags = queryClient.getQueryData<GameplayTag[]>(queryKeys.allTags) || [];
      const currentTag = previousTags.find(t => t.id === tagId);
      
      if (!currentTag) {
        throw new Error('Tag not found');
      }

      // 先更新 Storage 中的标签集合（本地优先）
      await updateTagInCollection(tagId, (tag) => ({ ...tag, name: newName }));

      // 更新缓存
      const updatedTags = previousTags.map(tag => 
        tag.id === tagId ? { ...tag, name: newName } : tag
      );
      queryClient.setQueryData(queryKeys.allTags, updatedTags);

      // 乐观更新：立即更新 UI
      onOptimisticUpdate?.(tagId, newName);

      // 注意：实际的更新操作由 mutationFn 完成，onMutate 只负责乐观更新

      return { tagId, oldName: oldName || currentTag.name, previousTags };
    },
    onError: (error, variables, context) => {
      console.error('更新标签失败:', error);
      
      // 回滚缓存
      if (context?.previousTags) {
        queryClient.setQueryData(queryKeys.allTags, context.previousTags);
      }

      // 回滚 Storage
      if (context?.oldName) {
        updateTagInCollection(variables.tagId, (tag) => ({ ...tag, name: context.oldName! }))
          .catch(console.error);
      }
      
      // 回滚：恢复旧名称
      if (context?.oldName) {
        onRollback?.(variables.tagId, context.oldName);
      }
    },
    onSettled: () => {
      // 使用 setQueryData 而非 invalidateQueries，已在 onMutate 中更新
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagId }: { tagId: string; tag?: GameplayTag }) => {
      return currentPageService.deleteTag(tagId);
    },
    onMutate: async ({ tagId, tag }) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.allTags });

      // 获取旧数据快照
      const previousTags = queryClient.getQueryData<GameplayTag[]>(queryKeys.allTags) || [];
      const tagToDelete = tag || previousTags.find(t => t.id === tagId);
      
      if (!tagToDelete) {
        throw new Error('Tag not found');
      }

      // 先更新 Storage 中的标签集合（本地优先）
      await removeTagFromCollection(tagId);

      // 更新缓存
      const updatedTags = previousTags.filter(t => t.id !== tagId);
      queryClient.setQueryData(queryKeys.allTags, updatedTags);

      // 乐观更新：立即从列表中移除
      onOptimisticUpdate?.(tagId);

      // 注意：实际的删除操作由 mutationFn 完成，onMutate 只负责乐观更新

      return { tagId, tag: tagToDelete, previousTags };
    },
    onError: (error, _variables, context) => {
      console.error('删除标签失败:', error);
      
      // 回滚缓存
      if (context?.previousTags) {
        queryClient.setQueryData(queryKeys.allTags, context.previousTags);
      }

      // 回滚 Storage
      if (context?.tag) {
        addTagToCollection(context.tag).catch(console.error);
      }
      
      // 回滚：恢复标签到列表
      if (context?.tag) {
        onRollback?.(context.tag);
      }
    },
    onSettled: () => {
      // 使用 setQueryData 而非 invalidateQueries，已在 onMutate 中更新
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagName: string): Promise<GameplayTag> => {
      return currentPageService.createTag(tagName);
    },
    onMutate: async (tagName) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.allTags });

      // 获取旧数据快照
      const previousTags = queryClient.getQueryData<GameplayTag[]>(queryKeys.allTags) || [];

      // 创建临时标签对象用于乐观更新
      // 注意：这里我们创建一个临时对象，实际 ID 会在成功后由服务器返回
      const tempTag: GameplayTag = {
        id: `temp-${Date.now()}`, // 临时 ID
        name: tagName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        bindings: [],
      };

      // 先更新 Storage 中的标签集合（本地优先）
      await addTagToCollection(tempTag);

      // 更新缓存
      const updatedTags = [...previousTags, tempTag];
      queryClient.setQueryData(queryKeys.allTags, updatedTags);

      // 乐观更新：立即添加到列表
      onOptimisticUpdate?.(tempTag);

      // 注意：实际的创建操作由 mutationFn 完成，onMutate 只负责乐观更新

      return { tempTagId: tempTag.id, tagName, previousTags, tempTag };
    },
    onSuccess: (createdTag, _tagName, context) => {
      if (!context) return;

      // 用真实的标签替换临时标签
      const previousTags = context.previousTags || [];
      const updatedTags = previousTags.map(tag => 
        tag.id === context.tempTagId ? createdTag : tag
      );
      queryClient.setQueryData(queryKeys.allTags, updatedTags);

      // 更新 Storage
      removeTagFromCollection(context.tempTagId).catch(console.error);
      addTagToCollection(createdTag).catch(console.error);
    },
    onError: (error, _tagName, context) => {
      console.error('创建标签失败:', error);
      
      // 回滚缓存
      if (context?.previousTags) {
        queryClient.setQueryData(queryKeys.allTags, context.previousTags);
      }

      // 回滚 Storage
      if (context?.tempTagId) {
        removeTagFromCollection(context.tempTagId).catch(console.error);
      }
      
      // 回滚：移除临时标签
      if (context?.tempTagId) {
        onRollback?.(context.tempTagId);
      }
    },
    onSettled: () => {
      // 使用 setQueryData 而非 invalidateQueries，已在 onMutate/onSuccess 中更新
    },
    retry: 2,
  });
}

