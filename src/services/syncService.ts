import { supabase } from '../infra/database/supabase';
import { GameplayStore } from './gameplayStore';
import { authService } from './authService';
import { storageService, STORAGE_KEYS } from './storageService';
import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../shared/types/gameplayTag';
import { logger } from '../infra/logger';
import { mergeDataStrategy, mergeTagFields, computeHash, ShadowMap } from '../core/strategies/DataMergeStrategy';
import { SupabaseQueryBuilder } from '../core/strategies/SupabaseQueryBuilder';
import { timeService } from './timeService';

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
export class SyncService {
  private static instance: SyncService;
  private gameplayStore: GameplayStore;
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
  // 同步锁 (防止并发)
  private lockId: string | null = null;
  private readonly LOCK_TIMEOUT = 5 * 60 * 1000; // 5分钟超时
  // [新增] 最大重试次数，防止无限递归
  private readonly MAX_LOCK_RETRIES = 10;

  private constructor() {
    this.gameplayStore = GameplayStore.getInstance();
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
   * 手动触发全量同步 (Scheme F+ + Scheme D)
   * 
   * 架构：
   * 1. 获取锁 (防止并发)
   * 2. 时间校准 (确保时间准确)
   * 3. 策略路由 (决定是增量还是全量)
   * 4. 执行同步 (全量或增量)
   * 5. 释放锁
   */
  public async syncAll(): Promise<void> {
    // 获取锁
    await this.acquireLock();

    try {
      // 时间校准 (确保时间准确)
      await timeService.calibrate();

      const authState = authService.getState();
      if (!authState.isAuthenticated || !authState.user) {
        log.info('用户未登录，跳过同步');
        return;
      }

      if (this.syncState.isSyncing) {
        log.warn('同步已在进行中，跳过');
        return;
      }

      this.syncState.isSyncing = true;
      this.syncState.error = null;

      try {
        log.info('开始同步流程...');

        // 策略路由：决定是增量还是全量
        if (await this.shouldTriggerFullSync()) {
          await this.performFullSync();
        } else {
          await this.performIncrementalSync();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '同步失败';
        this.syncState.error = errorMessage;
        log.error('同步失败', { error: errorMessage });
        throw error;
      } finally {
        this.syncState.isSyncing = false;
      }
    } finally {
      // 释放锁
      await this.releaseLock();
    }
  }

  /**
   * 获取同步锁 (防止并发)
   * [优化] 增加 retryCount 防止无限递归，添加指数退避策略
   * @param retryCount 当前重试次数
   */
  private async acquireLock(retryCount = 0): Promise<void> {
    const lockId = `${Date.now()}-${Math.random()}`;
    const lockData = await storageService.get<{ id: string; timestamp: number }>(STORAGE_KEYS.SYNC_LOCK);

    // 检查是否已有锁
    if (lockData) {
      const lockAge = timeService.now() - lockData.timestamp;
      
      // 1. 锁超时检查：如果锁已超时，强行清除它
      if (lockAge > this.LOCK_TIMEOUT) {
        log.warn('检测到超时的僵尸锁，强制清除', { lockAge, lockId: lockData.id });
        await storageService.remove(STORAGE_KEYS.SYNC_LOCK);
        // 清除后立即重试一次，不增加计数
        return this.acquireLock(retryCount);
      } 
      
      // 2. 重试限制检查
      if (retryCount >= this.MAX_LOCK_RETRIES) {
        log.error('获取同步锁失败：超过最大重试次数', { retryCount, maxRetries: this.MAX_LOCK_RETRIES });
        throw new Error('System busy: Unable to acquire sync lock after multiple attempts.');
      }

      // 3. 等待并重试 (使用简单的线性等待，避免指数退避导致的过长延迟)
      // 对于 Service Worker 环境，保持 1 秒间隔是合理的选择
      log.warn('同步锁被占用，等待释放...', { 
        lockId: lockData.id, 
        attempt: retryCount + 1, 
        maxRetries: this.MAX_LOCK_RETRIES,
        lockAge 
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
      
      return this.acquireLock(retryCount + 1);
    }

    // 获取锁
    this.lockId = lockId;
    await storageService.set(STORAGE_KEYS.SYNC_LOCK, {
      id: lockId,
      timestamp: timeService.now(),
    });
    log.debug('同步锁已获取', { lockId, retries: retryCount });
  }

  /**
   * 释放同步锁
   */
  private async releaseLock(): Promise<void> {
    if (this.lockId) {
      const lockData = await storageService.get<{ id: string }>(STORAGE_KEYS.SYNC_LOCK);
      // 只有锁是自己的才释放
      if (lockData && lockData.id === this.lockId) {
        await storageService.remove(STORAGE_KEYS.SYNC_LOCK);
        log.debug('同步锁已释放', { lockId: this.lockId });
      }
      this.lockId = null;
    }
  }

  /**
   * 判断是否应该触发全量同步 (Scheme F+)
   * 
   * 条件：
   * 1. 周期性 (7天)
   * 2. Shadow Map 丢失 (首次运行或数据损坏)
   */
  private async shouldTriggerFullSync(): Promise<boolean> {
    const lastFullSync = await storageService.get<number>(STORAGE_KEYS.SYNC_LAST_FULL_SYNC) || 0;
    const now = timeService.now();

    // 条件1: 周期性 (7天)
    if (now - lastFullSync > 7 * 24 * 3600 * 1000) {
      log.info('触发全量同步：周期性检查', { lastFullSync, now, daysSinceLastSync: (now - lastFullSync) / (24 * 3600 * 1000) });
      return true;
    }

    // 条件2: Shadow Map 丢失 (首次运行或数据损坏)
    const shadowMap = await storageService.get<ShadowMap>(STORAGE_KEYS.SYNC_SHADOW_MAP);
    if (!shadowMap || Object.keys(shadowMap).length === 0) {
      log.info('触发全量同步：Shadow Map 丢失');
      return true;
    }

    return false;
  }

  /**
   * [核心] 全量同步与三路合并 (Scheme F+)
   */
  private async performFullSync(): Promise<void> {
    log.info('[Sync] Performing Full 3-Way Sync...');

    const authState = authService.getState();
    if (!authState.isAuthenticated || !authState.user) {
      throw new Error('用户未登录');
    }

    // 1. 拉取全量 Cloud 数据
    const cloudData = await this.fetchAllFromCloud(authState.user.id);

    // 2. 获取 Local 数据
    const localData = this.gameplayStore.getAllData();

    // 3. 获取 Shadow Map (基准)
    const shadowMap: ShadowMap = await storageService.get<ShadowMap>(STORAGE_KEYS.SYNC_SHADOW_MAP) || {};
    const newShadowMap: ShadowMap = {};

    // 4. 执行合并 (针对 Tags)
    const mergedTags: TagsCollection = {};
    const allTagIds = new Set([...Object.keys(localData.tags), ...Object.keys(cloudData.tags)]);

    for (const id of allTagIds) {
      const local = localData.tags[id];
      const remote = cloudData.tags[id];
      const baseEntry = shadowMap[`tag:${id}`];

      if (local && remote) {
        // 双方存在：智能合并
        const merged = mergeTagFields(local, remote, baseEntry?.h);
        mergedTags[id] = merged;
        // 更新 Shadow
        newShadowMap[`tag:${id}`] = { h: computeHash(merged), u: merged.updatedAt };
      } else if (local && !remote) {
        // 仅本地有：保留本地 (视为未同步的新数据)
        mergedTags[id] = local;
        newShadowMap[`tag:${id}`] = { h: computeHash(local), u: local.updatedAt };
      } else if (!local && remote) {
        // 仅云端有：下载到本地
        if (!remote.deleted) {
          mergedTags[id] = remote;
          newShadowMap[`tag:${id}`] = { h: computeHash(remote), u: remote.updatedAt };
        }
      }
    }

    // 5. 对 Pages 执行类似的合并逻辑 (简化版本，使用 LWW)
    const mergedPages: PageCollection = {};
    const allPageIds = new Set([...Object.keys(localData.pages), ...Object.keys(cloudData.pages)]);

    for (const id of allPageIds) {
      const local = localData.pages[id];
      const remote = cloudData.pages[id];

      if (local && remote) {
        // 双方存在：LWW
        mergedPages[id] = local.updatedAt >= remote.updatedAt ? local : remote;
      } else if (local && !remote) {
        mergedPages[id] = local;
      } else if (!local && remote) {
        if (!remote.deleted) {
          mergedPages[id] = remote;
        }
      }
    }

    // 6. 应用结果 (原子化写入)
    this.gameplayStore.updateData({ tags: mergedTags, pages: mergedPages });
    await this.gameplayStore.commit();

    // 7. 更新 Shadow Map 和 时间戳
    await storageService.set(STORAGE_KEYS.SYNC_SHADOW_MAP, newShadowMap);
    await storageService.set(STORAGE_KEYS.SYNC_LAST_FULL_SYNC, timeService.now());

    // 8. 推送差异 (如果有需要上传的变更)
    const userId = authState.user.id;
    await this.uploadPendingChanges(userId);

    this.syncState.lastSyncAt = timeService.now();
    this.syncState.pendingChangesCount = this.pendingChanges.length;
    log.info('全量同步完成', {
      tagsCount: Object.keys(mergedTags).length,
      pagesCount: Object.keys(mergedPages).length,
      shadowMapSize: Object.keys(newShadowMap).length,
    });
  }

  /**
   * 增量同步 (保留现有逻辑)
   */
  private async performIncrementalSync(): Promise<void> {
    log.info('[Sync] Performing Incremental Sync...');

    const authState = authService.getState();
    if (!authState.isAuthenticated || !authState.user) {
      throw new Error('用户未登录');
    }

    // 1. 获取上次同步时间游标
    const lastSyncTs = await storageService.get<number>(STORAGE_KEYS.SYNC_LAST_TIMESTAMP) || 0;

    // 2. 计算本次拉取的起始时间 (引入 2 分钟缓冲，防止时钟漂移漏数据)
    // 如果是 0 (首次)，则保持 0 以拉取全量
    const fetchCursor = lastSyncTs > 0 ? lastSyncTs - 2 * 60 * 1000 : 0;

    // 记录当前时间作为新的游标 (在请求发出前记录，确保不漏掉同步期间产生的数据)
    const newSyncTs = timeService.now();

    // 3. 保存待删除项信息（在 uploadPendingChanges 清空队列之前）
    // 用于后续合并时识别已删除的项，避免"僵尸数据"复活
    const pendingDeletesBeforeUpload = this.pendingChanges
      .filter((change) => change.operation === 'delete')
      .map((change) => `${change.type}:${change.id}`);

    // 4. 先上传本地变更 (Push)
    await this.uploadPendingChanges(authState.user.id);

    // 5. 拉取云端数据 (Pull - Incremental)
    const cloudData = await this.fetchFromCloud(authState.user.id, fetchCursor);
    const cloudCount = Object.keys(cloudData.tags).length + Object.keys(cloudData.pages).length;

    if (cloudCount === 0 && this.pendingChanges.length === 0) {
      log.info('端云数据均无变更，跳过合并');
      // 依然要更新时间戳，防止下次还要扫描很久以前的数据
      await storageService.set(STORAGE_KEYS.SYNC_LAST_TIMESTAMP, newSyncTs);
      this.syncState.lastSyncAt = newSyncTs;
      this.syncState.pendingChangesCount = this.pendingChanges.length;
      return;
    }

    // 6. 从本地获取数据（全量）
    const localData = this.gameplayStore.getAllData();

    // 7. 合并数据
    // 注意：这里 localData 是全量的，但 cloudData 是增量的（只有变动项）
    // mergeDataStrategy 逻辑天然支持这种模式，因为：
    // - 如果云端没返回某条数据（因为它没变），cloudTag 为空
    // - 逻辑：else if (localTag && !cloudTag) { mergedTags[tagId] = localTag; }
    // - 结果：保留了本地未变动的旧数据。完全正确！
    const merged = mergeDataStrategy(localData, cloudData, pendingDeletesBeforeUpload);

    // 8. 更新本地数据库
    this.gameplayStore.updateData(merged);
    await this.gameplayStore.commit();

    // 9. [关键] 只有在所有步骤成功后，才更新游标
    await storageService.set(STORAGE_KEYS.SYNC_LAST_TIMESTAMP, newSyncTs);

    this.syncState.lastSyncAt = newSyncTs;
    this.syncState.pendingChangesCount = this.pendingChanges.length;
    log.info('增量同步完成', {
      mode: fetchCursor > 0 ? 'Incremental' : 'Full',
      fetchedItems: cloudCount,
      tagsCount: Object.keys(merged.tags || {}).length,
      pagesCount: Object.keys(merged.pages || {}).length,
    });
  }

  /**
   * 从云端拉取全量数据 (用于全量同步)
   */
  private async fetchAllFromCloud(userId: string): Promise<{
    tags: TagsCollection;
    pages: PageCollection;
  }> {
    return this.fetchFromCloud(userId, 0); // sinceTimestamp = 0 表示全量拉取
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
   * 从云端拉取数据（包括已删除的记录，用于同步）
   * @param userId 用户ID
   * @param sinceTimestamp 增量同步游标（时间戳，毫秒）。如果为0，则执行全量拉取
   */
  private async fetchFromCloud(userId: string, sinceTimestamp: number = 0): Promise<{
    tags: TagsCollection;
    pages: PageCollection;
  }> {
    try {
      // 使用 Query Builder 构建查询
      const tagsQuery = SupabaseQueryBuilder.buildFetchQuery(supabase, 'tags', userId, sinceTimestamp);
      const pagesQuery = SupabaseQueryBuilder.buildFetchQuery(supabase, 'pages', userId, sinceTimestamp);

      if (sinceTimestamp > 0) {
        log.info('执行增量拉取', { since: new Date(sinceTimestamp).toISOString() });
      } else {
        log.info('执行全量拉取 (首次同步或重置)');
      }

      // C. 执行并行请求
      const { data: tagsData, error: tagsError } = await tagsQuery;
      const { data: pagesData, error: pagesError } = await pagesQuery;

      if (tagsError) throw tagsError;
      if (pagesError) throw pagesError;

      // 转换为本地格式（保留 deleted 字段）
      const tags: TagsCollection = {};
      if (tagsData) {
        for (const row of tagsData) {
          tags[row.id] = {
            id: row.id,
            name: row.name,
            description: row.description || undefined,
            color: row.color || undefined,
            bindings: row.bindings || [],
            createdAt: row.created_at || timeService.now(),
            updatedAt: row.updated_at || timeService.now(),
            deleted: row.deleted || false,
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
            createdAt: row.created_at || timeService.now(),
            updatedAt: row.updated_at || timeService.now(),
            favicon: row.favicon || undefined,
            description: row.description || undefined,
            deleted: row.deleted || false,
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
        .update({ deleted: true, updated_at: timeService.now() })
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
        .update({ deleted: true, updated_at: timeService.now() })
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
      timestamp: timeService.now(),
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
   * 统一使用软删除逻辑
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
      const { eventType, new: newRecord } = payload;

      // 我们只关心 INSERT 和 UPDATE，因为我们不再执行物理 DELETE
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (type === 'tag') {
          // 检查软删除：如果 deleted = true，则从本地删除
          if (newRecord.deleted === true) {
            const tagId = newRecord.id;
            const changeKey = `tag:${tagId}:delete:${newRecord.updated_at || timeService.now()}`;
            
            // 检查是否已处理过
            if (this.recentProcessedChanges.has(changeKey)) {
              log.debug('已处理过该软删除变更，跳过', { tagId });
              return;
            }

            const tag = this.gameplayStore.getTagById(tagId);
            if (tag) {
              this.isApplyingRemoteChange = true;
              try {
                log.info('收到标签软删除事件', { tagId });
                this.gameplayStore.deleteTag(tagId);
                await this.gameplayStore.commit();
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
            createdAt: newRecord.created_at || timeService.now(),
            updatedAt: newRecord.updated_at || timeService.now(),
          };

          // 生成变更键，用于去重
          const changeKey = `tag:${tag.id}:${tag.updatedAt}`;
          
          // 检查是否已处理过（避免重复处理）
          if (this.recentProcessedChanges.has(changeKey)) {
            log.debug('已处理过该变更，跳过', { tagId: tag.id, updatedAt: tag.updatedAt });
            return;
          }

          // 检查本地是否有更新（避免循环同步）
          const localTag = this.gameplayStore.getTagById(tag.id);
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
              const existingTags = this.gameplayStore.getAllTags().reduce((acc, t) => {
                acc[t.id] = t;
                return acc;
              }, {} as TagsCollection);
              const existingPages = this.gameplayStore.getTaggedPages().reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
              }, {} as PageCollection);

              existingTags[tag.id] = tag;
              this.gameplayStore.updateData({ tags: existingTags, pages: existingPages });
              await this.gameplayStore.commit();
              this.recordProcessedChange(changeKey);
            } finally {
              this.isApplyingRemoteChange = false;
            }
          }
        } else if (type === 'page') {
          // 检查软删除：如果 deleted = true，则从本地删除
          if (newRecord.deleted === true) {
            const pageId = newRecord.id;
            log.info('收到页面软删除事件', { pageId });
            // 页面删除通常不需要特殊处理，因为 GameplayStore 不直接删除页面
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
            createdAt: newRecord.created_at || timeService.now(),
            updatedAt: newRecord.updated_at || timeService.now(),
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
          const localPage = this.gameplayStore.getPageById(page.id);
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
              const existingTags = this.gameplayStore.getAllTags().reduce((acc, t) => {
                acc[t.id] = t;
                return acc;
              }, {} as TagsCollection);
              const existingPages = this.gameplayStore.getTaggedPages().reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
              }, {} as PageCollection);

              existingPages[page.id] = page;
              this.gameplayStore.updateData({ tags: existingTags, pages: existingPages });
              await this.gameplayStore.commit();
              this.recordProcessedChange(changeKey);
            } finally {
              this.isApplyingRemoteChange = false;
            }
          }
        }
      }
      // 移除了 eventType === 'DELETE' 的分支
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
      this.gameplayStore.clearAllData();
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
        STORAGE_KEYS.SYNC_LAST_TIMESTAMP, // [新增] 必须清除游标
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

