/**
 * 乐观更新框架
 * 封装本地优先写入流程，提供统一的乐观更新机制
 */

import { QueryClient, QueryKey } from '@tanstack/react-query';
import { storageService, StorageKey, STORAGE_KEYS } from '@/services/storageService';
import type { TaggedPage, PageCollection, GameplayTag, TagsCollection } from '@/shared/types/gameplayTag';

/**
 * 乐观更新上下文
 */
export interface OptimisticContext<TData> {
  previous: TData | undefined;
  queryKey: QueryKey;
  storageKey: StorageKey;
}

/**
 * 乐观更新配置
 */
export interface OptimisticUpdateConfig<TData, TVariables> {
  /** 查询键 */
  queryKey: QueryKey;
  /** 存储键 */
  storageKey: StorageKey;
  /** 数据转换函数：将变量转换为新数据 */
  transform: (variables: TVariables, previous: TData | undefined) => TData;
  /** 远端同步函数 */
  syncFn: (variables: TVariables) => Promise<void>;
  /** 错误处理回调 */
  onError?: (error: Error, context: OptimisticContext<TData>) => void;
}

/**
 * 乐观更新钩子函数
 */
export interface OptimisticUpdateHooks<TData, TVariables> {
  onMutate: (variables: TVariables) => Promise<OptimisticContext<TData>>;
  onError: (error: Error, variables: TVariables, context: OptimisticContext<TData> | undefined) => void;
  onSettled: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context: OptimisticContext<TData> | undefined
  ) => void;
}

/**
 * 创建乐观更新钩子函数
 * 
 * 实现本地优先写入流程：
 * 1. 取消正在进行的查询
 * 2. 获取旧数据快照
 * 3. 先写入 Chrome Storage（本地优先）
 * 4. 更新 TanStack Query 缓存
 * 5. 触发远端同步（fire-and-forget）
 */
export function createOptimisticUpdate<TData, TVariables>(
  queryClient: QueryClient,
  config: OptimisticUpdateConfig<TData, TVariables>
): OptimisticUpdateHooks<TData, TVariables> {
  return {
    /**
     * 乐观更新：本地优先写入
     */
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // 1. 取消正在进行的查询，防止旧数据覆盖新数据
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // 2. 获取旧数据快照
      const previous = queryClient.getQueryData<TData>(config.queryKey);

      // 3. 计算新数据
      const newData = config.transform(variables, previous);

      // 4. 先写入 Chrome Storage（本地优先）
      try {
        await storageService.set(config.storageKey, newData);
      } catch (error) {
        console.error('[OptimisticUpdate] 写入 Storage 失败:', error);
        // 如果写入 Storage 失败，仍然继续更新缓存，但记录错误
      }

      // 5. 更新 TanStack Query 缓存
      queryClient.setQueryData(config.queryKey, newData);

      // 6. 触发远端同步（fire-and-forget，不阻塞）
      config.syncFn(variables).catch((error) => {
        console.error('[OptimisticUpdate] 远端同步失败:', error);
        // 远端同步失败不影响本地更新，由后台重试机制处理
      });

      return {
        previous,
        queryKey: config.queryKey,
        storageKey: config.storageKey,
      };
    },

    /**
     * 错误回滚：恢复旧数据
     */
    onError: (error: Error, _variables: TVariables, context: OptimisticContext<TData> | undefined): void => {
      if (!context) {
        return;
      }

      // 回滚 Storage
      if (context.previous !== undefined) {
        storageService.set(context.storageKey, context.previous).catch((err) => {
          console.error('[OptimisticUpdate] 回滚 Storage 失败:', err);
        });
      }

      // 回滚缓存
      if (context.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }

      // 调用自定义错误处理
      config.onError?.(error, context);
    },

    /**
     * 最终结算：使用 setQueryData 而非 invalidateQueries
     * 避免不必要的 refetch，提升用户体验
     */
    onSettled: (
      data: TData | undefined | void,
      _error: Error | null,
      _variables: TVariables,
      context: OptimisticContext<TData> | undefined
    ): void => {
      // 如果 mutationFn 返回 void，data 可能是 undefined
      // 在这种情况下，我们不需要更新缓存，因为已经在 onMutate 中更新了
      if (data && context) {
        // 使用 setQueryData 直接更新缓存，而不是 invalidateQueries
        // 这样可以避免不必要的 refetch，提升用户体验
        queryClient.setQueryData(context.queryKey, data);
        
        // 同时更新 Storage，确保数据一致性
        storageService.set(context.storageKey, data).catch((err) => {
          console.error('[OptimisticUpdate] 更新 Storage 失败:', err);
        });
      }
    },
  };
}

/**
 * 更新页面集合中的单个页面
 * 用于更新 STORAGE_KEYS.PAGES 中的特定页面
 */
export async function updatePageInCollection(
  pageId: string,
  updater: (page: TaggedPage) => TaggedPage
): Promise<void> {
  const pages = await storageService.get<PageCollection>(STORAGE_KEYS.PAGES);
  if (!pages) {
    console.warn('[OptimisticUpdate] PAGES 集合不存在');
    return;
  }

  const page = pages[pageId];
  if (!page) {
    console.warn('[OptimisticUpdate] 页面不存在:', pageId);
    return;
  }

  const updatedPage = updater(page);
  const updatedPages: PageCollection = {
    ...pages,
    [pageId]: updatedPage,
  };

  await storageService.set(STORAGE_KEYS.PAGES, updatedPages);
}

/**
 * 更新标签集合中的单个标签
 * 用于更新 STORAGE_KEYS.TAGS 中的特定标签
 */
export async function updateTagInCollection(
  tagId: string,
  updater: (tag: GameplayTag) => GameplayTag
): Promise<void> {
  const tags = await storageService.get<TagsCollection>(STORAGE_KEYS.TAGS);
  if (!tags) {
    console.warn('[OptimisticUpdate] TAGS 集合不存在');
    return;
  }

  const tag = tags[tagId];
  if (!tag) {
    console.warn('[OptimisticUpdate] 标签不存在:', tagId);
    return;
  }

  const updatedTag = updater(tag);
  const updatedTags: TagsCollection = {
    ...tags,
    [tagId]: updatedTag,
  };

  await storageService.set(STORAGE_KEYS.TAGS, updatedTags);
}

/**
 * 从标签集合中删除标签
 */
export async function removeTagFromCollection(tagId: string): Promise<void> {
  const tags = await storageService.get<TagsCollection>(STORAGE_KEYS.TAGS);
  if (!tags) {
    console.warn('[OptimisticUpdate] TAGS 集合不存在');
    return;
  }

  if (!tags[tagId]) {
    console.warn('[OptimisticUpdate] 标签不存在:', tagId);
    return;
  }

  const updatedTags: TagsCollection = { ...tags };
  delete updatedTags[tagId];

  await storageService.set(STORAGE_KEYS.TAGS, updatedTags);
}

/**
 * 向标签集合中添加标签
 */
export async function addTagToCollection(tag: GameplayTag): Promise<void> {
  const tags = await storageService.get<TagsCollection>(STORAGE_KEYS.TAGS) || {};
  const updatedTags: TagsCollection = {
    ...tags,
    [tag.id]: tag,
  };

  await storageService.set(STORAGE_KEYS.TAGS, updatedTags);
}

