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
      authService.subscribe((authState) => {
        if (authState.isAuthenticated) {
          this.startRealtimeSubscription();
          this.syncAll();
        } else {
          this.stopRealtimeSubscription();
        }
      });

      // 如果已登录，立即开始同步
      const authState = authService.getState();
      if (authState.isAuthenticated) {
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

      // 1. 从云端拉取最新数据
      const cloudData = await this.fetchFromCloud(authState.user.id);

      // 2. 从本地获取数据
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

      // 3. 合并数据（基于 updatedAt）
      const merged = this.mergeData(localData, cloudData);

      // 4. 更新本地数据
      this.tagManager.initialize(merged);
      await this.tagManager.syncToStorage();

      // 5. 上传本地变更到云端
      await this.uploadPendingChanges(authState.user.id);

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
   * 从云端拉取数据
   */
  private async fetchFromCloud(userId: string): Promise<{
    tags: TagsCollection;
    pages: PageCollection;
  }> {
    try {
      // 拉取标签
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId);

      if (tagsError) throw tagsError;

      // 拉取页面
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId);

      if (pagesError) throw pagesError;

      // 转换为本地格式
      const tags: TagsCollection = {};
      if (tagsData) {
        for (const row of tagsData) {
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
   */
  private mergeData(
    local: { tags: TagsCollection; pages: PageCollection },
    cloud: { tags: TagsCollection; pages: PageCollection },
  ): { tags: TagsCollection; pages: PageCollection } {
    const mergedTags: TagsCollection = {};
    const mergedPages: PageCollection = {};

    // 合并标签：保留 updatedAt 更大的版本
    const allTagIds = new Set([
      ...Object.keys(local.tags || {}),
      ...Object.keys(cloud.tags || {}),
    ]);

    for (const tagId of allTagIds) {
      const localTag = local.tags?.[tagId];
      const cloudTag = cloud.tags?.[tagId];

      if (!localTag && cloudTag) {
        mergedTags[tagId] = cloudTag;
      } else if (localTag && !cloudTag) {
        mergedTags[tagId] = localTag;
      } else if (localTag && cloudTag) {
        // 保留 updatedAt 更大的版本
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

      if (!localPage && cloudPage) {
        mergedPages[pageId] = cloudPage;
      } else if (localPage && !cloudPage) {
        mergedPages[pageId] = localPage;
      } else if (localPage && cloudPage) {
        // 保留 updatedAt 更大的版本
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
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', userId);

      if (error) throw error;
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
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)
        .eq('user_id', userId);

      if (error) throw error;
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
      },
      {
        onConflict: 'id,user_id',
      },
    );

    if (error) throw error;
  }

  /**
   * 上传待同步的变更
   */
  private async uploadPendingChanges(userId: string): Promise<void> {
    if (this.pendingChanges.length === 0) {
      return;
    }

    log.info('开始上传待同步变更', { count: this.pendingChanges.length });

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    for (const change of changes) {
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
   */
  private async handleRealtimeChange(
    type: SyncChangeType,
    payload: any,
  ): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (type === 'tag') {
        if (eventType === 'DELETE') {
          const tagId = oldRecord.id;
          const tag = this.tagManager.getTagById(tagId);
          if (tag) {
            this.tagManager.deleteTag(tagId);
            await this.tagManager.syncToStorage();
          }
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const tag: GameplayTag = {
            id: newRecord.id,
            name: newRecord.name,
            description: newRecord.description || undefined,
            color: newRecord.color || undefined,
            bindings: newRecord.bindings || [],
            createdAt: newRecord.created_at || Date.now(),
            updatedAt: newRecord.updated_at || Date.now(),
          };

          // 检查本地是否有更新（避免循环同步）
          const localTag = this.tagManager.getTagById(tag.id);
          if (!localTag || localTag.updatedAt < tag.updatedAt) {
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
            this.tagManager.initialize({ tags: existingTags, pages: existingPages });
            await this.tagManager.syncToStorage();
          }
        }
      } else if (type === 'page') {
        if (eventType === 'DELETE') {
          // 页面删除通常不需要特殊处理，因为 TagManager 不直接删除页面
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
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

          // 检查本地是否有更新（避免循环同步）
          const localPage = this.tagManager.getPageById(page.id);
          if (!localPage || localPage.updatedAt < page.updatedAt) {
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
            this.tagManager.initialize({ tags: existingTags, pages: existingPages });
            await this.tagManager.syncToStorage();
          }
        }
      }
    } catch (error) {
      log.error('处理实时变更失败', { type, error });
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
}

export const syncService = SyncService.getInstance();

