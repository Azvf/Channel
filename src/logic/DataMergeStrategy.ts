import { TagsCollection, PageCollection } from '../types/gameplayTag';
import { logger } from '../services/logger';

const log = logger('DataMergeStrategy');

/**
 * 数据合并策略（纯函数）
 * 负责合并本地和云端数据，基于 Last-Write-Wins 策略
 * 
 * @param local 本地数据集合
 * @param cloud 云端数据集合
 * @param pendingDeleteKeys 待删除项的键列表（格式：'type:id'），用于识别已删除的项，避免"僵尸数据"复活
 * @returns 合并后的数据集合
 */
export function mergeDataStrategy(
  local: { tags: TagsCollection; pages: PageCollection },
  cloud: { tags: TagsCollection; pages: PageCollection },
  pendingDeleteKeys: string[] = [],
): { tags: TagsCollection; pages: PageCollection } {
  const mergedTags: TagsCollection = {};
  const mergedPages: PageCollection = {};

  // 构建待删除项的集合（用于快速查找）
  const pendingDeletes = new Set<string>(pendingDeleteKeys);

  // 合并标签：保留 updatedAt 更大的版本
  const allTagIds = new Set([
    ...Object.keys(local.tags || {}),
    ...Object.keys(cloud.tags || {}),
  ]);

  for (const tagId of allTagIds) {
    const localTag = local.tags?.[tagId];
    const cloudTag = cloud.tags?.[tagId];
    const isPendingDelete = pendingDeletes.has(`tag:${tagId}`);

    // 如果该标签在待删除队列中，且云端也没有，则跳过（不恢复）
    if (isPendingDelete && !cloudTag) {
      log.info('跳过已删除的标签（避免僵尸数据复活）', { tagId });
      continue;
    }

    if (!localTag && cloudTag) {
      // [防御] 如果这是本次同步刚提交删除的项，即使云端返回了数据（可能是旧缓存），我们也应当忽略
      if (isPendingDelete) {
        log.info('忽略刚删除的项（防御云端旧数据复活）', { tagId });
        continue;
      }
      // 只有云端有：检查云端是否标记为删除
      if (cloudTag.deleted) {
        // 云端已删，本地也应该删（不加入 mergedTags，相当于删除）
        log.info('云端已删除标签，本地同步删除', { tagId });
        continue;
      }
      // 使用云端数据
      mergedTags[tagId] = cloudTag;
    } else if (localTag && !cloudTag) {
      // 只有本地有：可能是新建的未同步数据，保留
      // 但如果云端已物理删除（且不在待删除队列中），说明是旧数据，应该删除
      // 由于我们已经先上传了待删除操作，如果云端真的删除了，这里 cloudTag 应该不存在
      // 如果不在待删除队列中，且本地数据很旧，可能是僵尸数据
      // 为了安全，我们保留本地数据（因为可能是新建的）
      mergedTags[tagId] = localTag;
    } else if (localTag && cloudTag) {
      // 检查云端是否标记为删除
      if (cloudTag.deleted) {
        // 云端已删，本地也应该删
        // 除非本地有更新的操作且时间晚于云端删除时间（冲突处理），简单起见先以云端为准
        log.info('云端已删除标签，本地同步删除', { tagId });
        continue;
      }
      // 双方都有：保留 updatedAt 更大的版本
      mergedTags[tagId] =
        localTag.updatedAt >= cloudTag.updatedAt ? localTag : cloudTag;
    }
  }

  // 合并页面：保留 updatedAt 更大的版本
  const allPageIds = new Set([
    ...Object.keys(local.pages || {}),
    ...Object.keys(cloud.pages || {}),
  ]);

  for (const pageId of allPageIds) {
    const localPage = local.pages?.[pageId];
    const cloudPage = cloud.pages?.[pageId];
    const isPendingDelete = pendingDeletes.has(`page:${pageId}`);

    // 如果该页面在待删除队列中，且云端也没有，则跳过（不恢复）
    if (isPendingDelete && !cloudPage) {
      log.info('跳过已删除的页面（避免僵尸数据复活）', { pageId });
      continue;
    }

    if (!localPage && cloudPage) {
      // [防御] 如果这是本次同步刚提交删除的项，即使云端返回了数据（可能是旧缓存），我们也应当忽略
      if (isPendingDelete) {
        log.info('忽略刚删除的项（防御云端旧数据复活）', { pageId });
        continue;
      }
      // 只有云端有：检查云端是否标记为删除
      if (cloudPage.deleted) {
        // 云端已删，本地也应该删（不加入 mergedPages，相当于删除）
        log.info('云端已删除页面，本地同步删除', { pageId });
        continue;
      }
      // 使用云端数据
      mergedPages[pageId] = cloudPage;
    } else if (localPage && !cloudPage) {
      // 只有本地有：可能是新建的未同步数据，保留
      mergedPages[pageId] = localPage;
    } else if (localPage && cloudPage) {
      // 检查云端是否标记为删除
      if (cloudPage.deleted) {
        // 云端已删，本地也应该删
        // 除非本地有更新的操作且时间晚于云端删除时间（冲突处理），简单起见先以云端为准
        log.info('云端已删除页面，本地同步删除', { pageId });
        continue;
      }
      // 双方都有：保留 updatedAt 更大的版本
      mergedPages[pageId] =
        localPage.updatedAt >= cloudPage.updatedAt ? localPage : cloudPage;
    }
  }

  return { tags: mergedTags, pages: mergedPages };
}

