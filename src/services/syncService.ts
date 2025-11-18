import { supabase } from '../lib/supabase';
import { TagManager } from './tagManager';
import { authService } from './authService';
import { storageService, STORAGE_KEYS } from './storageService';
import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../types/gameplayTag';
import { logger } from './logger';

const log = logger('SyncService');

/**
 * 同步变更类型
 */
type SyncChangeType = 'tag' | 'page';

/**
 * 同步变更操作
 */
type SyncChangeOperation = 'create' | 'update' | 'delete';

/**
 * 待同步的变更项
 */
interface PendingChange {
  type: SyncChangeType;
  operation: SyncChangeOperation;
  id: string;
  data?: GameplayTag | TaggedPage;
  timestamp: number;
}

/**
 * 同步状态
 */
interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingChangesCount: number;
  error: string | null;
}

/**
 * 数据同步服务
 * 负责本地数据与云端数据的双向同步
 */
class SyncService {
  private static instance: SyncService;
  private tagManager: TagManager;
  private isInitialized = false;
  private isSubscribed = false;
  private syncState: SyncState = {
    isSyncing: false,
    lastSyncAt: null,
    pendingChangesCount: 0,
    error: null,
  };
  private pendingChanges: PendingChange[] = [];
  private realtimeChannels: { tags?: any; pages?: any } = {};
  // 防止循环更新的标志位
  private isApplyingRemoteChange = false;
  // 记录最近处理的变更，避免重复处理（格式：'type:id:updatedAt'）
  private recentProcessedChanges = new Set<string>();
  // 最近处理的变更记录的最大数量（防止内存泄漏）
  private readonly MAX_RECENT_CHANGES = 100;
  // 跟踪当前用户ID，用于检测用户切换
  private currentUserId: string | null = null;

  private constructor() {
    this.tagManager = TagManager.getInstance();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * 初始化同步服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 加载待同步队列
      await this.loadPendingChanges();

      // 监听认证状态变化
      authService.subscribe(async (authState) => {
        if (authState.isAuthenticated && authState.user) {
          // 检测用户切换
          const newUserId = authState.user.id;
          if (this.currentUserId !== null && this.currentUserId !== newUserId) {
            // 用户切换：清空本地数据并重置状态
            log.warn('检测到用户切换，清空本地数据', {
              oldUserId: this.currentUserId,
              newUserId,
            });
            // 等待数据清空完成后再继续
            await this.handleUserSwitch();
          }
          this.currentUserId = newUserId;
          this.startRealtimeSubscription();
          // syncAll 是异步的，但不阻塞，让它在后台执行
          this.syncAll().catch((error) => {
            log.error('同步失败', { error });
          });
        } else {
          // 用户登出：清空当前用户ID
          if (this.currentUserId !== null) {
            log.info('用户登出，清空用户ID');
            this.currentUserId = null;
          }
          this.stopRealtimeSubscription();
        }
      });

      // 如果已登录，立即开始同步
      const authState = authService.getState();
      if (authState.isAuthenticated && authState.user) {
        this.currentUserId = authState.user.id;
        this.startRealtimeSubscription();
        this.syncAll();
      }

      this.isInitialized = true;
      log.info('SyncService 初始化完成');
    } catch (error) {
      log.error('SyncService 初始化失败', { error });
      throw error;
    }
  }

  /**
   * 获取同步状态
   */
  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * 手动触发全量同步
   */
  public async syncAll(): Promise<void> {
    if (this.syncState.isSyncing) {
      log.warn('同步已在进行中，跳过');
      return;
    }

    const authState = authService.getState();
    if (!authState.isAuthenticated || !authState.user) {
      log.info('用户未登录，跳过同步');
      return;
    }

    this.syncState.isSyncing = true;
    this.syncState.error = null;

    try {
      log.info('开始全量同步...');

      // 1. 保存待删除项信息（在 uploadPendingChanges 清空队列之前）
      // 用于后续合并时识别已删除的项，避免"僵尸数据"复活
      const pendingDeletesBeforeUpload = this.pendingChanges
        .filter((change) => change.operation === 'delete')
        .map((change) => `${change.type}:${change.id}`);

      // 2. 先上传本地待同步变更（包括删除操作）
      // 这样可以确保删除操作先同步到云端，避免后续合并时"僵尸数据"复活
      await this.uploadPendingChanges(authState.user.id);

      // 3. 从云端拉取最新数据（此时已包含刚才上传的删除操作）
      const cloudData = await this.fetchFromCloud(authState.user.id);

      // 4. 从本地获取数据
      const localData = {
        tags: this.tagManager.getAllTags().reduce((acc, tag) => {
          acc[tag.id] = tag;
          return acc;
        }, {} as TagsCollection),
        pages: this.tagManager.getTaggedPages().reduce((acc, page) => {
          acc[page.id] = page;
          return acc;
        }, {} as PageCollection),
      };

      // 5. 合并数据（基于 updatedAt，并考虑待删除项）
      // 使用上传前的待删除项列表，因为 uploadPendingChanges 可能已清空队列
      const merged = this.mergeData(
        localData,
        cloudData,
        pendingDeletesBeforeUpload,
      );

      // 6. 更新本地数据
      this.tagManager.initialize(merged);
      await this.tagManager.syncToStorage();

      this.syncState.lastSyncAt = Date.now();
      this.syncState.pendingChangesCount = this.pendingChanges.length;
      log.info('全量同步完成', {
        tagsCount: Object.keys(merged.tags || {}).length,
        pagesCount: Object.keys(merged.pages || {}).length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      this.syncState.error = errorMessage;
      log.error('全量同步失败', { error: errorMessage });
      throw error;
    } finally {
      this.syncState.isSyncing = false;
    }
  }

  /**
   * 标记标签变更（在 TagManager 操作后调用）
   */
  public async markTagChange(
    operation: SyncChangeOperation,
    tagId: string,
    tag?: GameplayTag,
  ): Promise<void> {
    const authState = authService.getState();
    if (!authState.isAuthenticated) {
      // 未登录时，只保存到待同步队列
      this.addPendingChange('tag', operation, tagId, tag);
      return;
    }

    try {
      // 已登录时，立即同步到云端
      await this.syncTagToCloud(operation, tagId, tag, authState.user!.id);
    } catch (error) {
      // 同步失败时，加入待同步队列
      log.warn('标签同步失败，加入待同步队列', { tagId, error });
      this.addPendingChange('tag', operation, tagId, tag);
    }
  }

  /**
   * 标记页面变更（在 TagManager 操作后调用）
   */
  public async markPageChange(
    operation: SyncChangeOperation,
    pageId: string,
    page?: TaggedPage,
  ): Promise<void> {
    const authState = authService.getState();
    if (!authState.isAuthenticated) {
      // 未登录时，只保存到待同步队列
      this.addPendingChange('page', operation, pageId, page);
      return;
    }

    try {
      // 已登录时，立即同步到云端
      await this.syncPageToCloud(operation, pageId, page, authState.user!.id);
    } catch (error) {
      // 同步失败时，加入待同步队列
      log.warn('页面同步失败，加入待同步队列', { pageId, error });
      this.addPendingChange('page', operation, pageId, page);
    }
  }

  /**
   * 从云端拉取数据（只拉取未删除的记录）
   */
  private async fetchFromCloud(userId: string): Promise<{
    tags: TagsCollection;
    pages: PageCollection;
  }> {
    try {
      // 拉取标签（只拉取 deleted = false 的记录）
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false);

      if (tagsError) throw tagsError;

      // 拉取页面（只拉取 deleted = false 的记录）
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false);

      if (pagesError) throw pagesError;

      // 转换为本地格式
      const tags: TagsCollection = {};
      if (tagsData) {
        for (const row of tagsData) {
          // 双重保险：即使查询已过滤，也检查 deleted 字段
          if (row.deleted === true) {
            log.warn('发现已删除的标签（应该已被过滤）', { tagId: row.id });
            continue;
          }
          tags[row.id] = {
            id: row.id,
            name: row.name,
            description: row.description || undefined,
            color: row.color || undefined,
            bindings: row.bindings || [],
            createdAt: row.created_at || Date.now(),
            updatedAt: row.updated_at || Date.now(),
          };
        }
      }

      const pages: PageCollection = {};
      if (pagesData) {
        for (const row of pagesData) {
          // 双重保险：即使查询已过滤，也检查 deleted 字段
          if (row.deleted === true) {
            log.warn('发现已删除的页面（应该已被过滤）', { pageId: row.id });
            continue;
          }
          pages[row.id] = {
            id: row.id,
            url: row.url,
            title: row.title || '',
            domain: row.domain || '',
            tags: row.tags || [],
            createdAt: row.created_at || Date.now(),
            updatedAt: row.updated_at || Date.now(),
            favicon: row.favicon || undefined,
            description: row.description || undefined,
          };
        }
      }

      return { tags, pages };
    } catch (error) {
      log.error('从云端拉取数据失败', { error });
      throw error;
    }
  }

  /**
   * 合并本地和云端数据（基于 updatedAt 时间戳）
   * @param pendingDeleteKeys 待删除项的键列表（格式：'type:id'），用于识别已删除的项，避免"僵尸数据"复活
   */
  private mergeData(
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
        // 只有云端有：使用云端数据
        mergedTags[tagId] = cloudTag;
      } else if (localTag && !cloudTag) {
        // 只有本地有：可能是新建的未同步数据，保留
        // 但如果云端已物理删除（且不在待删除队列中），说明是旧数据，应该删除
        // 由于我们已经先上传了待删除操作，如果云端真的删除了，这里 cloudTag 应该不存在
        // 如果不在待删除队列中，且本地数据很旧，可能是僵尸数据
        // 为了安全，我们保留本地数据（因为可能是新建的）
        mergedTags[tagId] = localTag;
      } else if (localTag && cloudTag) {
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
        // 只有云端有：使用云端数据
        mergedPages[pageId] = cloudPage;
      } else if (localPage && !cloudPage) {
        // 只有本地有：可能是新建的未同步数据，保留
        mergedPages[pageId] = localPage;
      } else if (localPage && cloudPage) {
        // 双方都有：保留 updatedAt 更大的版本
        mergedPages[pageId] =
          localPage.updatedAt >= cloudPage.updatedAt ? localPage : cloudPage;
      }
    }

    return { tags: mergedTags, pages: mergedPages };
  }

  /**
   * 同步标签到云端
   */
  private async syncTagToCloud(
    operation: SyncChangeOperation,
    tagId: string,
    tag: GameplayTag | undefined,
    userId: string,
  ): Promise<void> {
    if (operation === 'delete') {
      // 使用软删除：设置 deleted = true，而不是物理删除
      const { error } = await supabase
        .from('tags')
        .update({ deleted: true, updated_at: Date.now() })
        .eq('id', tagId)
        .eq('user_id', userId);

      if (error) throw error;
      log.info('标签已软删除', { tagId });
      return;
    }

    if (!tag) {
      log.warn('标签数据为空，跳过同步', { tagId, operation });
      return;
    }

    const { error } = await supabase.from('tags').upsert(
      {
        id: tag.id,
        user_id: userId,
        name: tag.name,
        description: tag.description || null,
        color: tag.color || null,
        bindings: tag.bindings || [],
        created_at: tag.createdAt,
        updated_at: tag.updatedAt,
        deleted: false, // 确保创建/更新时 deleted = false
      },
      {
        onConflict: 'id,user_id',
      },
    );

    if (error) throw error;
  }

  /**
   * 同步页面到云端
   */
  private async syncPageToCloud(
    operation: SyncChangeOperation,
    pageId: string,
    page: TaggedPage | undefined,
    userId: string,
  ): Promise<void> {
    if (operation === 'delete') {
      // 使用软删除：设置 deleted = true，而不是物理删除
      const { error } = await supabase
        .from('pages')
        .update({ deleted: true, updated_at: Date.now() })
        .eq('id', pageId)
        .eq('user_id', userId);

      if (error) throw error;
      log.info('页面已软删除', { pageId });
      return;
    }

    if (!page) {
      log.warn('页面数据为空，跳过同步', { pageId, operation });
      return;
    }

    const { error } = await supabase.from('pages').upsert(
      {
        id: page.id,
        user_id: userId,
        url: page.url,
        title: page.title,
        domain: page.domain,
        tags: page.tags || [],
        created_at: page.createdAt,
        updated_at: page.updatedAt,
        favicon: page.favicon || null,
        description: page.description || null,
        deleted: false, // 确保创建/更新时 deleted = false
      },
      {
        onConflict: 'id,user_id',
      },
    );

    if (error) throw error;
  }

  /**
   * 上传待同步的变更
   * 优先处理删除操作，避免"僵尸数据"复活
   */
  private async uploadPendingChanges(userId: string): Promise<void> {
    if (this.pendingChanges.length === 0) {
      return;
    }

    log.info('开始上传待同步变更', { count: this.pendingChanges.length });

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    // 优先处理删除操作，确保删除先同步到云端
    const sortedChanges = changes.sort((a, b) => {
      if (a.operation === 'delete' && b.operation !== 'delete') return -1;
      if (a.operation !== 'delete' && b.operation === 'delete') return 1;
      return 0;
    });

    for (const change of sortedChanges) {
      try {
        if (change.type === 'tag') {
          await this.syncTagToCloud(
            change.operation,
            change.id,
            change.data as GameplayTag | undefined,
            userId,
          );
        } else if (change.type === 'page') {
          await this.syncPageToCloud(
            change.operation,
            change.id,
            change.data as TaggedPage | undefined,
            userId,
          );
        }
      } catch (error) {
        // 失败时重新加入队列
        log.warn('上传变更失败，重新加入队列', { change, error });
        this.pendingChanges.push(change);
      }
    }

    await this.savePendingChanges();
    this.syncState.pendingChangesCount = this.pendingChanges.length;
  }

  /**
   * 添加待同步变更
   */
  private addPendingChange(
    type: SyncChangeType,
    operation: SyncChangeOperation,
    id: string,
    data?: GameplayTag | TaggedPage,
  ): void {
    this.pendingChanges.push({
      type,
      operation,
      id,
      data,
      timestamp: Date.now(),
    });

    this.syncState.pendingChangesCount = this.pendingChanges.length;
    this.savePendingChanges();
  }

  /**
   * 启动实时订阅
   */
  private startRealtimeSubscription(): void {
    if (this.isSubscribed) {
      return;
    }

    const authState = authService.getState();
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    const userId = authState.user.id;

    try {
      // 订阅 tags 表变化
      this.realtimeChannels.tags = supabase
        .channel('tags_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tags',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            log.info('收到 tags 表变化', { payload });
            this.handleRealtimeChange('tag', payload);
          },
        )
        .subscribe();

      // 订阅 pages 表变化
      this.realtimeChannels.pages = supabase
        .channel('pages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pages',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            log.info('收到 pages 表变化', { payload });
            this.handleRealtimeChange('page', payload);
          },
        )
        .subscribe();

      this.isSubscribed = true;
      log.info('实时订阅已启动');
    } catch (error) {
      log.error('启动实时订阅失败', { error });
    }
  }

  /**
   * 停止实时订阅
   */
  private stopRealtimeSubscription(): void {
    if (!this.isSubscribed) {
      return;
    }

    try {
      if (this.realtimeChannels.tags) {
        supabase.removeChannel(this.realtimeChannels.tags);
      }
      if (this.realtimeChannels.pages) {
        supabase.removeChannel(this.realtimeChannels.pages);
      }

      this.realtimeChannels = {};
      this.isSubscribed = false;
      log.info('实时订阅已停止');
    } catch (error) {
      log.error('停止实时订阅失败', { error });
    }
  }

  /**
   * 处理实时变更
   * 注意：由于使用软删除，DELETE 事件不会触发，需要检查 UPDATE 事件中的 deleted 字段
   */
  private async handleRealtimeChange(
    type: SyncChangeType,
    payload: any,
  ): Promise<void> {
    // 如果正在应用远程变更，忽略新的变更（防止嵌套调用）
    if (this.isApplyingRemoteChange) {
      log.warn('正在应用远程变更，忽略新的 Realtime 变更', { type });
      return;
    }

    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (type === 'tag') {
        // 处理物理删除（虽然现在使用软删除，但保留兼容性）
        if (eventType === 'DELETE') {
          const tagId = oldRecord?.id;
          if (tagId) {
            // 检查是否已处理过
            const changeKey = `tag:${tagId}:delete:${oldRecord?.updated_at || Date.now()}`;
            if (this.recentProcessedChanges.has(changeKey)) {
              log.debug('已处理过该删除变更，跳过', { tagId });
              return;
            }

            const tag = this.tagManager.getTagById(tagId);
            if (tag) {
              this.isApplyingRemoteChange = true;
              try {
                this.tagManager.deleteTag(tagId);
                await this.tagManager.syncToStorage();
                this.recordProcessedChange(changeKey);
              } finally {
                this.isApplyingRemoteChange = false;
              }
            }
          }
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
          // 检查软删除：如果 deleted = true，则从本地删除
          if (newRecord.deleted === true) {
            const tagId = newRecord.id;
            const changeKey = `tag:${tagId}:delete:${newRecord.updated_at || Date.now()}`;
            
            // 检查是否已处理过
            if (this.recentProcessedChanges.has(changeKey)) {
              log.debug('已处理过该软删除变更，跳过', { tagId });
              return;
            }

            const tag = this.tagManager.getTagById(tagId);
            if (tag) {
              this.isApplyingRemoteChange = true;
              try {
                log.info('收到标签软删除事件', { tagId });
                this.tagManager.deleteTag(tagId);
                await this.tagManager.syncToStorage();
                this.recordProcessedChange(changeKey);
              } finally {
                this.isApplyingRemoteChange = false;
              }
            }
            return;
          }

          // 处理创建/更新（deleted = false 或未设置）
          const tag: GameplayTag = {
            id: newRecord.id,
            name: newRecord.name,
            description: newRecord.description || undefined,
            color: newRecord.color || undefined,
            bindings: newRecord.bindings || [],
            createdAt: newRecord.created_at || Date.now(),
            updatedAt: newRecord.updated_at || Date.now(),
          };

          // 生成变更键，用于去重
          const changeKey = `tag:${tag.id}:${tag.updatedAt}`;
          
          // 检查是否已处理过（避免重复处理）
          if (this.recentProcessedChanges.has(changeKey)) {
            log.debug('已处理过该变更，跳过', { tagId: tag.id, updatedAt: tag.updatedAt });
            return;
          }

          // 检查本地是否有更新（避免循环同步）
          const localTag = this.tagManager.getTagById(tag.id);
          // 使用 <= 而不是 <，避免时间戳完全一致时的重复处理
          if (!localTag || localTag.updatedAt <= tag.updatedAt) {
            // 如果时间戳完全一致，检查内容是否相同（避免不必要的更新）
            if (localTag && localTag.updatedAt === tag.updatedAt) {
              const isSame = 
                localTag.name === tag.name &&
                localTag.description === tag.description &&
                localTag.color === tag.color &&
                JSON.stringify(localTag.bindings) === JSON.stringify(tag.bindings);
              
              if (isSame) {
                log.debug('本地数据与远程数据相同，跳过更新', { tagId: tag.id });
                this.recordProcessedChange(changeKey);
                return;
              }
            }

            this.isApplyingRemoteChange = true;
            try {
              // 更新本地数据：获取所有现有数据，然后更新特定标签
              const existingTags = this.tagManager.getAllTags().reduce((acc, t) => {
                acc[t.id] = t;
                return acc;
              }, {} as TagsCollection);
              const existingPages = this.tagManager.getTaggedPages().reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
              }, {} as PageCollection);

              existingTags[tag.id] = tag;
              this.tagManager.updateData({ tags: existingTags, pages: existingPages });
              await this.tagManager.syncToStorage();
              this.recordProcessedChange(changeKey);
            } finally {
              this.isApplyingRemoteChange = false;
            }
          }
        }
      } else if (type === 'page') {
        // 处理物理删除（虽然现在使用软删除，但保留兼容性）
        if (eventType === 'DELETE') {
          const pageId = oldRecord?.id;
          if (pageId) {
            // 页面删除通常不需要特殊处理，因为 TagManager 不直接删除页面
            log.info('收到页面物理删除事件', { pageId });
          }
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
          // 检查软删除：如果 deleted = true，则从本地删除
          if (newRecord.deleted === true) {
            const pageId = newRecord.id;
            log.info('收到页面软删除事件', { pageId });
            // 页面删除通常不需要特殊处理，因为 TagManager 不直接删除页面
            // 但我们可以从本地存储中移除它（如果需要）
            return;
          }

          // 处理创建/更新（deleted = false 或未设置）
          const page: TaggedPage = {
            id: newRecord.id,
            url: newRecord.url,
            title: newRecord.title || '',
            domain: newRecord.domain || '',
            tags: newRecord.tags || [],
            createdAt: newRecord.created_at || Date.now(),
            updatedAt: newRecord.updated_at || Date.now(),
            favicon: newRecord.favicon || undefined,
            description: newRecord.description || undefined,
          };

          // 生成变更键，用于去重
          const changeKey = `page:${page.id}:${page.updatedAt}`;
          
          // 检查是否已处理过（避免重复处理）
          if (this.recentProcessedChanges.has(changeKey)) {
            log.debug('已处理过该变更，跳过', { pageId: page.id, updatedAt: page.updatedAt });
            return;
          }

          // 检查本地是否有更新（避免循环同步）
          const localPage = this.tagManager.getPageById(page.id);
          // 使用 <= 而不是 <，避免时间戳完全一致时的重复处理
          if (!localPage || localPage.updatedAt <= page.updatedAt) {
            // 如果时间戳完全一致，检查内容是否相同（避免不必要的更新）
            if (localPage && localPage.updatedAt === page.updatedAt) {
              const isSame = 
                localPage.url === page.url &&
                localPage.title === page.title &&
                localPage.domain === page.domain &&
                JSON.stringify(localPage.tags) === JSON.stringify(page.tags) &&
                localPage.favicon === page.favicon &&
                localPage.description === page.description;
              
              if (isSame) {
                log.debug('本地数据与远程数据相同，跳过更新', { pageId: page.id });
                this.recordProcessedChange(changeKey);
                return;
              }
            }

            this.isApplyingRemoteChange = true;
            try {
              // 更新本地数据：获取所有现有数据，然后更新特定页面
              const existingTags = this.tagManager.getAllTags().reduce((acc, t) => {
                acc[t.id] = t;
                return acc;
              }, {} as TagsCollection);
              const existingPages = this.tagManager.getTaggedPages().reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
              }, {} as PageCollection);

              existingPages[page.id] = page;
              this.tagManager.updateData({ tags: existingTags, pages: existingPages });
              await this.tagManager.syncToStorage();
              this.recordProcessedChange(changeKey);
            } finally {
              this.isApplyingRemoteChange = false;
            }
          }
        }
      }
    } catch (error) {
      log.error('处理实时变更失败', { type, error });
      // 确保在出错时也重置标志位
      this.isApplyingRemoteChange = false;
    }
  }

  /**
   * 记录已处理的变更，避免重复处理
   */
  private recordProcessedChange(changeKey: string): void {
    this.recentProcessedChanges.add(changeKey);
    
    // 限制记录数量，防止内存泄漏
    // 当超过限制时，清空所有记录（去重主要用于防止短时间内重复，清空后重新开始也是安全的）
    if (this.recentProcessedChanges.size > this.MAX_RECENT_CHANGES) {
      log.debug('已处理变更记录数超过限制，清空记录', { size: this.recentProcessedChanges.size });
      this.recentProcessedChanges.clear();
      // 重新添加当前变更
      this.recentProcessedChanges.add(changeKey);
    }
  }

  /**
   * 加载待同步变更队列
   */
  private async loadPendingChanges(): Promise<void> {
    try {
      const data = await storageService.get<PendingChange[]>(
        STORAGE_KEYS.SYNC_PENDING_CHANGES || 'sync_pending_changes',
      );
      if (data && Array.isArray(data)) {
        this.pendingChanges = data;
        this.syncState.pendingChangesCount = data.length;
      }
    } catch (error) {
      log.warn('加载待同步变更队列失败', { error });
    }
  }

  /**
   * 保存待同步变更队列
   */
  private async savePendingChanges(): Promise<void> {
    try {
      await storageService.set(
        STORAGE_KEYS.SYNC_PENDING_CHANGES || 'sync_pending_changes',
        this.pendingChanges,
      );
    } catch (error) {
      log.warn('保存待同步变更队列失败', { error });
    }
  }

  /**
   * 处理用户切换：清空本地数据并重置状态
   * 防止上一个用户的数据泄露给新用户
   */
  private async handleUserSwitch(): Promise<void> {
    try {
      // 1. 停止实时订阅
      this.stopRealtimeSubscription();

      // 2. 清空 TagManager 数据
      this.tagManager.clearAllData();
      log.info('TagManager 数据已清空（用户切换）');

      // 3. 清空待同步队列（这些变更属于上一个用户）
      this.pendingChanges = [];
      await this.savePendingChanges();
      this.syncState.pendingChangesCount = 0;
      log.info('待同步队列已清空（用户切换）');

      // 4. 清空存储中的标签和页面数据
      await storageService.removeMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES,
        STORAGE_KEYS.SYNC_PENDING_CHANGES,
      ]);
      log.info('存储数据已清空（用户切换）');

      // 5. 重置同步状态
      this.syncState.lastSyncAt = null;
      this.syncState.error = null;
      this.recentProcessedChanges.clear();

      // 6. 重置 TagManager 初始化状态（允许重新初始化）
      // 注意：TagManager 没有公开的 reset 方法，但 clearAllData 已经清空了数据
      // 如果需要，可以在这里重新初始化 TagManager
    } catch (error) {
      log.error('处理用户切换失败', { error });
      throw error;
    }
  }
}

export const syncService = SyncService.getInstance();

