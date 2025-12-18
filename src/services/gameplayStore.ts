import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../shared/types/gameplayTag';
import { logger } from '../infra/logger';
import { storageService, STORAGE_KEYS } from './storageService';
import { timeService } from './timeService';
import { ITagRepository, IPageRepository } from '../infra/database/chrome-storage/repositories/types';
import { ChromeTagRepository, ChromePageRepository } from '../infra/database/chrome-storage/repositories/ChromeStorageRepository';
import { cacheMonitor } from './cacheMonitor';
import { normalizeTagsCollection, normalizePageCollection } from '../shared/utils/dataNormalizer';

type ChangeListener = () => void;

/**
 * GameplayStore - 游戏化标签存储库
 * 负责管理标签和页面的内存状态，包含业务规则和领域逻辑
 * 
 * 原名称: TagManager
 * 新名称: GameplayStore (更准确地反映其作为有状态内存存储库的职责)
 */
export class GameplayStore {
  private static instance: GameplayStore;
  private tags: TagsCollection = {};
  private pages: PageCollection = {};

  private _isInitialized = false;
  private _isDirty = false; // 脏标记
  private listeners: Set<ChangeListener> = new Set();
  
  // Repository 层（可选，用于未来扩展）
  private tagRepo: ITagRepository | null = null;
  private pageRepo: IPageRepository | null = null;
  
  // 防抖提交相关
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY = 500; // 500ms 防抖延迟
  private pendingCommit: Promise<void> | null = null; // 跟踪待处理的提交
  
  // 增量存储：跟踪变化的页面和标签 ID
  private _changedPageIds: Set<string> = new Set();
  private _changedTagIds: Set<string> = new Set();
  
  // 内存索引：提升查询性能
  private _tagToPages: Map<string, Set<string>> = new Map(); // tagId -> Set<pageId>
  private _tagNameToId: Map<string, string> = new Map(); // tagName (lowercase) -> tagId
  
  // page_index 内存缓存：避免每次写入都读取 storage
  private _pageIndexCache: string[] | null = null;
  private _deletedPageIds: Set<string> = new Set(); // 跟踪已删除的页面 ID，用于更新 page_index
  
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  private constructor() {
    // 构造函数中不进行异步操作
    // Repository 延迟初始化，保持向后兼容
  }
  
  /**
   * 设置 Repository（用于测试和未来扩展）
   * 如果不设置，将使用传统的存储方式
   */
  public setRepositories(
    tagRepo: ITagRepository | null,
    pageRepo: IPageRepository | null
  ): void {
    this.tagRepo = tagRepo;
    this.pageRepo = pageRepo;
    
    // 如果设置了 Chrome Repository，注册到缓存监控
    if (tagRepo instanceof ChromeTagRepository && pageRepo instanceof ChromePageRepository) {
      cacheMonitor.setRepositories(tagRepo, pageRepo);
    }
  }
  

  public static getInstance(): GameplayStore {
    if (!GameplayStore.instance) {
      GameplayStore.instance = new GameplayStore();
    }
    return GameplayStore.instance;
  }

  /**
   * 订阅数据变化事件
   * @param listener 变化监听器
   * @returns 取消订阅的函数
   */
  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器数据已变化
   */
  private notifyListeners(): void {
    // 使用 Array.from 来获取索引，因为 Set.forEach 不提供索引参数
    Array.from(this.listeners).forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error(`[GameplayStore] 监听器执行失败:`, error);
      }
    });
  }

  /**
   * (重构) 使用传入的数据同步初始化 GameplayStore
   * 保持幂等性（防止重复初始化）
   */
  public initialize(data: { tags?: TagsCollection | null; pages?: PageCollection | null }): void {
    if (this._isInitialized) {
      return; // 已经初始化
    }
    
    try {
      // 数据规范化：在数据进入 GameplayStore 之前统一规范化
      this.tags = normalizeTagsCollection(data.tags ?? {});
      this.pages = normalizePageCollection(data.pages ?? {});
      
      // 构建内存索引
      this.rebuildIndices();
      
      // 初始化 page_index 缓存（异步加载，不阻塞初始化）
      this.loadPageIndexCache().catch((error) => {
        console.warn('[GameplayStore] 加载 page_index 缓存失败（不影响初始化）:', error);
      });
      
      this._isInitialized = true; // 标记为已初始化
      this.notifyListeners(); // 通知 UI
    } catch (error) {
      console.error('GameplayStore 初始化失败:', error);
      this._isInitialized = false; // 失败时重置
      throw error;
    }
  }
  
  /**
   * 加载 page_index 到内存缓存
   * 如果 page_index 不存在，从现有页面数据重建
   */
  private async loadPageIndexCache(): Promise<void> {
    try {
      const pageIndex = await storageService.get<string[]>('page_index');
      if (pageIndex && pageIndex.length > 0) {
        this._pageIndexCache = pageIndex;
      } else {
        // 如果 page_index 不存在，从现有页面数据重建
        this._pageIndexCache = Object.keys(this.pages);
        // 异步保存重建的索引（不阻塞）
        storageService.set('page_index', this._pageIndexCache).catch((error) => {
          console.warn('[GameplayStore] 保存重建的 page_index 失败:', error);
        });
      }
    } catch (_error) {
      // 如果读取失败，从现有页面数据重建
      this._pageIndexCache = Object.keys(this.pages);
    }
  }
  
  /**
   * 重建内存索引（用于初始化和数据更新后）
   * 性能优化：维护标签到页面的反向索引和标签名称索引，将查询操作从 O(N) 降到 O(1) 或 O(M)
   * 
   * 注意：数据规范化由 normalizeTagsCollection 和 normalizePageCollection 保证，
   * 这里不再需要防御性检查
   */
  private rebuildIndices(): void {
    this._tagToPages.clear();
    this._tagNameToId.clear();
    
    // 构建标签名称索引：优化 findTagByName 从 O(N) 到 O(1)
    for (const [tagId, tag] of Object.entries(this.tags)) {
      this._tagNameToId.set(tag.name.toLowerCase(), tagId);
    }
    
    // 构建标签到页面的反向索引：优化 getTaggedPages 从 O(N) 到 O(M)，M 是使用该标签的页面数
    for (const [pageId, page] of Object.entries(this.pages)) {
      const tags = Array.isArray(page.tags) ? page.tags : [];
      for (const tagId of tags) {
        if (!this._tagToPages.has(tagId)) {
          this._tagToPages.set(tagId, new Set());
        }
        this._tagToPages.get(tagId)!.add(pageId);
      }
    }
  }

  /**
   * 强制更新数据（即使已经初始化）
   * 用于同步服务在后台更新数据时使用
   */
  public updateData(data: { tags?: TagsCollection | null; pages?: PageCollection | null }): void {
    try {
      if (data.tags !== undefined) {
        // 数据规范化：在数据进入 GameplayStore 之前统一规范化
        this.tags = normalizeTagsCollection(data.tags ?? {});
      }
      if (data.pages !== undefined) {
        // 数据规范化：在数据进入 GameplayStore 之前统一规范化
        this.pages = normalizePageCollection(data.pages ?? {});
      }
      
      // 重建索引以保持一致性
      this.rebuildIndices();
      
      this.notifyListeners(); // 通知 UI
    } catch (error) {
      console.error('GameplayStore 更新数据失败:', error);
      throw error;
    }
  }

  // 标签管理（无父子层级）
  public createTag(name: string, description?: string, color?: string): GameplayTag {
    // 使用封装好的验证接口
    const validation = this.validateTagName(name);
    if (!validation.valid) {
      throw new Error(validation.error || '标签名称验证失败');
    }
    
    const trimmedName = name.trim();
    const id = this.generateTagId(trimmedName);
    
    const tag: GameplayTag = {
      id,
      name: trimmedName,
      description,
      color: color || this.generateColor(),
      createdAt: timeService.now(),
      updatedAt: timeService.now(),
      bindings: []
    };

    this.tags[id] = tag;
    
    // 更新标签名称索引
    this._tagNameToId.set(trimmedName.toLowerCase(), id);
    
    // 关键：只标记，不保存
    this.markDirty(undefined, id);
    
    this.notifyListeners(); // 通知 UI
    return tag;
  }

  // 绑定关系管理（对称）
  public bindTags(tagIdA: string, tagIdB: string): boolean {
    if (tagIdA === tagIdB) return false;
    const a = this.tags[tagIdA];
    const b = this.tags[tagIdB];
    if (!a || !b) return false;
    // 确保 bindings 是数组
    if (!Array.isArray(a.bindings)) a.bindings = [];
    if (!Array.isArray(b.bindings)) b.bindings = [];
    if (!a.bindings.includes(tagIdB)) a.bindings.push(tagIdB);
    if (!b.bindings.includes(tagIdA)) b.bindings.push(tagIdA);
    a.updatedAt = timeService.now();
    b.updatedAt = timeService.now();
    this.markDirty();
    this.notifyListeners(); // 通知 UI
    return true;
  }

  public unbindTags(tagIdA: string, tagIdB: string): boolean {
    const a = this.tags[tagIdA];
    const b = this.tags[tagIdB];
    if (!a || !b) return false;
    // 确保 bindings 是数组
    if (!Array.isArray(a.bindings)) a.bindings = [];
    if (!Array.isArray(b.bindings)) b.bindings = [];
    a.bindings = a.bindings.filter(id => id !== tagIdB);
    b.bindings = b.bindings.filter(id => id !== tagIdA);
    a.updatedAt = timeService.now();
    b.updatedAt = timeService.now();
    this.markDirty(undefined, tagIdA);
    this.markDirty(undefined, tagIdB);
    this.notifyListeners(); // 通知 UI
    return true;
  }

  public getBoundTags(tagId: string): GameplayTag[] {
    const tag = this.tags[tagId];
    if (!tag) return [];
    const bindings = Array.isArray(tag.bindings) ? tag.bindings : [];
    return bindings.map(id => this.tags[id]).filter(Boolean) as GameplayTag[];
  }

  public getAllTags(): GameplayTag[] {
    return Object.values(this.tags);
  }

  public getTagById(id: string): GameplayTag | undefined {
    return this.tags[id];
  }

  /**
   * 根据名称查找标签（忽略大小写）
   * 使用内存索引优化：从 O(N) 降到 O(1)
   */
  public findTagByName(name: string): GameplayTag | undefined {
    if (!name) return undefined;
    const trimmedName = name.trim().toLowerCase();
    const tagId = this._tagNameToId.get(trimmedName);
    return tagId ? this.tags[tagId] : undefined;
  }

  /**
   * [新增] 更新标签名称
   * @param tagId 要更新的标签ID
   * @param newName 新的标签名称
   * @returns 成功或失败
   */
  public updateTagName(tagId: string, newName: string): { success: boolean; error?: string } {
    const tag = this.tags[tagId];
    if (!tag) {
      return { success: false, error: '标签不存在' };
    }

    // 1. 验证新名称
    const validation = this.validateTagName(newName);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const trimmedName = newName.trim();

    // 2. 检查新名称是否与*其他*标签冲突
    const existing = this.findTagByName(trimmedName);
    if (existing && existing.id !== tagId) {
      return { success: false, error: `标签名称 "${trimmedName}" 已存在` };
    }

    // 3. 更新名称
    const oldName = tag.name.toLowerCase();
    tag.name = trimmedName;
    tag.updatedAt = timeService.now();
    
    // 更新标签名称索引
    this._tagNameToId.delete(oldName);
    this._tagNameToId.set(trimmedName.toLowerCase(), tagId);
    
    this.markDirty(undefined, tagId);
    this.notifyListeners(); // 通知 UI

    return { success: true };
  }

  /**
   * 验证标签名称
   */
  public validateTagName(name: string): { valid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { valid: false, error: '请输入标签名称' };
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return { valid: false, error: '标签名称不能为空' };
    }
    
    if (trimmedName.length > 50) {
      return { valid: false, error: '标签名称不能超过50个字符' };
    }
    
    return { valid: true };
  }

  /**
   * 创建标签并添加到页面（高级方法）
   * 如果标签已存在同名，则使用现有标签并添加到页面
   */
  public createTagAndAddToPage(tagName: string, pageId: string): GameplayTag {
    // 使用封装好的验证接口
    const validation = this.validateTagName(tagName);
    if (!validation.valid) {
      throw new Error(validation.error || '标签名称验证失败');
    }
    
    const trimmedName = tagName.trim();
    
    // 查找是否已存在同名标签（忽略大小写）
    const existing = this.findTagByName(trimmedName);
    
    if (existing) {
      // 使用现有标签并添加到页面
      this.addTagToPage(pageId, existing.id);
      return existing;
    }
    
    // 创建新标签（内部会再次验证，但不会重复 trim）
    const newTag = this.createTag(trimmedName);
    this.addTagToPage(pageId, newTag.id);
    return newTag;
  }

  // [修复] 移除 getCurrentTabAndRegisterPage
  // public async getCurrentTabAndRegisterPage(...) { ... }

  // [修复] 移除 ensurePageRegistered
  // public async ensurePageRegistered(...) { ... }

  /**
   * 添加或移除标签到页面（统一接口）
   */
  public toggleTagOnPage(pageId: string, tagId: string, add: boolean): boolean {
    return add 
      ? this.addTagToPage(pageId, tagId)
      : this.removeTagFromPage(pageId, tagId);
  }

  // 已移除层级相关API

  // 页面管理
  public addTagToPage(pageId: string, tagId: string): boolean {
    const log = logger('GameplayStore');
    if (!this.tags[tagId]) {
      log.warn('addTagToPage: tag not found', { pageId, tagId });
      return false;
    }

    if (!this.pages[pageId]) {
      log.warn('addTagToPage: page not found', { pageId, tagId });
      return false;
    }

    // 确保 tags 是数组
    if (!Array.isArray(this.pages[pageId].tags)) {
      this.pages[pageId].tags = [];
    }

    if (!this.pages[pageId].tags.includes(tagId)) {
      this.pages[pageId].tags.push(tagId);
      this.pages[pageId].updatedAt = timeService.now();
      
      // 更新标签到页面的反向索引
      if (!this._tagToPages.has(tagId)) {
        this._tagToPages.set(tagId, new Set());
      }
      this._tagToPages.get(tagId)!.add(pageId);
      
      log.debug('addTagToPage: added', { pageId, tagId, tagsCount: this.pages[pageId].tags.length });
      this.markDirty(pageId);
      this.notifyListeners(); // 通知 UI
      return true;
    } else {
      log.info('addTagToPage: already exists', { pageId, tagId });
      return false;
    }
  }

  public removeTagFromPage(pageId: string, tagId: string): boolean {
    const log = logger('GameplayStore');
    if (!this.pages[pageId]) {
      log.warn('removeTagFromPage: page not found', { pageId, tagId });
      return false;
    }

    // 确保 tags 是数组
    if (!Array.isArray(this.pages[pageId].tags)) {
      this.pages[pageId].tags = [];
    }

    const index = this.pages[pageId].tags.indexOf(tagId);
    if (index > -1) {
      this.pages[pageId].tags.splice(index, 1);
      this.pages[pageId].updatedAt = timeService.now();
      
      // 更新标签到页面的反向索引
      const pageSet = this._tagToPages.get(tagId);
      if (pageSet) {
        pageSet.delete(pageId);
        // 如果该标签没有关联任何页面，清理索引条目（可选优化）
        if (pageSet.size === 0) {
          this._tagToPages.delete(tagId);
        }
      }
      
      log.debug('removeTagFromPage: removed', { pageId, tagId, tagsCount: this.pages[pageId].tags.length });
      this.markDirty(pageId);
      this.notifyListeners(); // 通知 UI
      return true;
    } else {
      log.info('removeTagFromPage: not present', { pageId, tagId });
      return false;
    }
  }

  public createOrUpdatePage(url: string, title: string, domain: string, favicon?: string, coverImage?: string): TaggedPage {
    const pageId = this.generatePageId(url);
    const log = logger('GameplayStore');
    
    if (this.pages[pageId]) {
      // 检查页面是否真的需要更新
      const existingPage = this.pages[pageId];
      const existingTags = existingPage.tags; // 保存现有标签
      const existingTitleManuallyEdited = existingPage.titleManuallyEdited; // 保存手动编辑标记
      
      log.debug('[createOrUpdatePage] 页面已存在，检查更新:', {
        pageId,
        existingTitle: existingPage.title,
        newTitle: title,
        existingTitleSource: existingPage.titleSource,
        existingTags: existingTags.length,
        existingUpdatedAt: existingPage.updatedAt,
      });
      
      // 比较需要更新的字段，判断是否真的发生了变化
      const titleChanged = existingPage.title !== title;
      const faviconChanged = favicon !== undefined && existingPage.favicon !== favicon;
      const coverImageChanged = coverImage !== undefined && existingPage.coverImage !== coverImage;
      const hasChanges = titleChanged || faviconChanged || coverImageChanged;
      
      log.debug('[createOrUpdatePage] 变化检查:', {
        pageId,
        titleChanged,
        faviconChanged,
        coverImageChanged,
        hasChanges,
      });
      
      // 只有数据真正变化时才更新和标记 dirty
      if (hasChanges) {
        this.pages[pageId] = {
          ...existingPage, // 保持所有现有属性
          ...(titleChanged && { title }),
          ...(titleChanged && { updatedAt: timeService.now() }),
          tags: existingTags, // 确保标签不被覆盖
          titleManuallyEdited: existingTitleManuallyEdited, // 保持手动编辑标记
          titleSource: existingPage.titleSource, // 保持titleSource（除非明确设置）
          ...(favicon && { favicon }),
          ...(coverImage && { coverImage })
        };
        this.markDirty(pageId);
        this.notifyListeners(); // 通知 UI
        
        log.debug('[createOrUpdatePage] 页面已更新:', {
          pageId,
          newTitle: this.pages[pageId].title,
          newTitleSource: this.pages[pageId].titleSource,
          newUpdatedAt: this.pages[pageId].updatedAt,
        });
      } else {
        // 数据未变化，不标记 dirty，但仍通知监听器（保持 UI 一致性）
        log.debug('[createOrUpdatePage] 页面数据未变化，直接返回:', {
          pageId,
          title: existingPage.title,
          titleSource: existingPage.titleSource,
          updatedAt: existingPage.updatedAt,
        });
        this.notifyListeners();
      }
    } else {
      // 创建新页面（默认 titleManuallyEdited 为 undefined/false）
      this.pages[pageId] = {
        id: pageId,
        url,
        title,
        domain,
        tags: [],
        createdAt: timeService.now(),
        updatedAt: timeService.now(),
        favicon,
        coverImage,
        titleManuallyEdited: false // 新创建的页面默认未手动编辑
      };
      this.markDirty(pageId); // 新页面需要保存
      this.notifyListeners(); // 通知 UI
      
      log.debug('[createOrUpdatePage] 创建新页面:', {
        pageId,
        title,
        titleSource: this.pages[pageId].titleSource,
      });
    }

    const returnedPage = this.pages[pageId];
    log.debug('[createOrUpdatePage] 返回页面:', {
      pageId: returnedPage.id,
      title: returnedPage.title,
      titleSource: returnedPage.titleSource,
      tags: returnedPage.tags.length,
      updatedAt: returnedPage.updatedAt,
    });
    
    return returnedPage;
  }

  /**
   * 批量添加页面（用于后台增量加载）
   * 将新页面添加到现有页面集合中，不覆盖已存在的页面
   * @param newPages 要添加的页面集合
   */
  public addPages(newPages: PageCollection): void {
    const log = logger('GameplayStore');
    
    if (!this._isInitialized) {
      console.warn('[GameplayStore] addPages: Store 未初始化，跳过添加');
      return;
    }
    
    let addedCount = 0;
    for (const [pageId, page] of Object.entries(newPages)) {
      // 只添加不存在的页面，避免覆盖已有数据
      if (!this.pages[pageId]) {
        this.pages[pageId] = page;
        // 更新索引
        this._tagToPages = new Map(); // 重置索引，后续会通过rebuildIndices重建
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      // 重建索引以包含新页面
      this.rebuildIndices();
      this.notifyListeners(); // 通知 UI
      log.debug('addPages: 添加了页面', { addedCount, totalPages: Object.keys(this.pages).length });
    }
  }

  /**
   * 更新页面的 coverImage
   * 只在创建新页面或现有页面没有 coverImage 时更新（避免覆盖已有值）
   */
  public updatePageCoverImage(pageId: string, coverImage: string): boolean {
    if (!pageId || !coverImage) {
      return false;
    }

    const page = this.pages[pageId];
    if (!page) {
      return false;
    }

    // ✅ 关键改进：校验数据一致性
    // 策略：
    // 1. 如果页面没有 coverImage，直接更新
    // 2. 如果页面已有 coverImage，但新的 coverImage 不同，也更新（确保数据一致性）
    // 3. 如果 coverImage 相同，跳过更新（避免不必要的写入）
    if (!page.coverImage || page.coverImage !== coverImage) {
      this.pages[pageId] = {
        ...page,
        coverImage,
        updatedAt: timeService.now(),
      };

      this.markDirty(pageId);
      this.notifyListeners(); // 通知 UI
      return true;
    }

    return false; // coverImage 未变化，不更新
  }

  /**
   * 获取所有数据 (用于同步服务)
   * @returns 包含所有 tags 和 pages 的对象
   */
  public getAllData(): { tags: TagsCollection; pages: PageCollection } {
    return {
      tags: { ...this.tags },
      pages: { ...this.pages },
    };
  }

  public getTaggedPages(tagId?: string): TaggedPage[] {
    if (!tagId) {
      // 返回所有有标签的页面，过滤掉没有标签的页面
      return Object.values(this.pages).filter(page => page.tags && page.tags.length > 0);
    }

    // 使用内存索引优化：从 O(N) 降到 O(M)，M 是使用该标签的页面数
    const pageIds = this._tagToPages.get(tagId);
    if (!pageIds || pageIds.size === 0) {
      return [];
    }

    const result: TaggedPage[] = [];
    for (const pageId of pageIds) {
      const page = this.pages[pageId];
      if (page) {
        result.push(page);
      }
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * [新增] 获取所有标签的使用计数（高性能）
   * @returns 一个 { tagId: count } 格式的记录
   */
  public getAllTagUsageCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    // 初始化所有标签计数为 0
    for (const tagId in this.tags) {
      counts[tagId] = 0;
    }

    // 遍历所有页面，累加计数
    for (const page of Object.values(this.pages)) {
      const tags = Array.isArray(page.tags) ? page.tags : [];
      for (const tagId of tags) {
        if (counts[tagId] !== undefined) {
          counts[tagId]++;
        }
      }
    }

    return counts;
  }

  public getPageById(pageId: string): TaggedPage | undefined {
    return this.pages[pageId];
  }

  /**
   * [架构修复] 新增：根据 URL 获取页面
   * 用于在创建/更新前检查页面是否存在，防止元数据（如自定义标题）被覆盖
   */
  public getPageByUrl(url: string): TaggedPage | undefined {
    const id = this.generatePageId(url);
    return this.pages[id];
  }

  /**
   * 更新页面标题
   * @param pageId - 页面ID
   * @param title - 新标题
   * @param isManualEdit - 是否是用户手动编辑（默认为 false）
   */
  public updatePageTitle(pageId: string, title: string, isManualEdit = false): boolean {
    const page = this.pages[pageId];
    if (!page) {
      return false;
    }
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return false;
    }
    
    this.pages[pageId] = {
      ...page,
      title: trimmedTitle,
      // 如果是手动编辑则设置为 true，如果是自动更新则设置为 false（清除标记）
      titleManuallyEdited: isManualEdit ? true : false,
      // 如果是手动编辑，设置titleSource为manual_edit；如果是自动更新，保持原有titleSource
      titleSource: isManualEdit ? 'manual_edit' : page.titleSource,
      updatedAt: timeService.now()
    };
    this.markDirty(pageId);
    this.notifyListeners(); // 通知 UI
    
    return true;
  }

  /**
   * 设置页面Title来源
   * @param pageId - 页面ID
   * @param source - Title来源：'auto' | 'user_operation' | 'manual_edit'
   */
  public setPageTitleSource(pageId: string, source: 'auto' | 'user_operation' | 'manual_edit'): boolean {
    const page = this.pages[pageId];
    if (!page) {
      return false;
    }
    
    this.pages[pageId] = {
      ...page,
      titleSource: source,
      updatedAt: timeService.now()
    };
    this.markDirty(pageId);
    this.notifyListeners(); // 通知 UI
    
    return true;
  }

  public clearAllData(): void {
    this.tags = {};
    this.pages = {};
    this._isInitialized = false; // 重置初始化状态，允许重新初始化
    this._isDirty = false; // 重置脏标记
    
    // 清空变化跟踪集合
    this._changedPageIds.clear();
    this._changedTagIds.clear();
    
    // 清空内存索引
    this._tagToPages.clear();
    this._tagNameToId.clear();
    
    // ✅ 修复：强制断开所有订阅，防止测试间污染和监听器泄漏
    this.listeners.clear();
    
    // 注意：清空后再 notify 也没有意义了，因为没有 listener 了
    // 如果业务需要通知"数据被清空"，应该在 clear 之前 notify，或者设计专门的 reset 事件
  }

  public getDataStats(): { tagsCount: number; pagesCount: number } {
    return {
      tagsCount: Object.keys(this.tags).length,
      pagesCount: Object.keys(this.pages).length
    };
  }

  /**
   * 获取用户激励统计数据（今日标记数量与连续天数）
   */
  public getUserStats(): { todayCount: number; streak: number } {
    const allPages = Object.values(this.pages);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

    const todayCount = allPages.filter(page =>
      typeof page.createdAt === 'number' &&
      page.createdAt >= todayStart &&
      page.createdAt < tomorrowStart
    ).length;

    const streak = this.calculateStreak(allPages);

    return { todayCount, streak };
  }

  /**
   * 计算连续标记天数
   * 如果今天没有标记但昨天有，继续 streak；
   * 如果今天和昨天都没有标记， streak 置为 0。
   */
  private calculateStreak(pages: TaggedPage[]): number {
    if (!pages.length) {
      return 0;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const markedDays = new Set<number>();

    pages.forEach((page: TaggedPage) => {
      if (typeof page.createdAt !== 'number') {
        return;
      }

      const day = new Date(page.createdAt);
      day.setHours(0, 0, 0, 0);
      markedDays.add(day.getTime());
    });

    if (!markedDays.size) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const yesterdayStart = todayStart - dayMs;

    let startDay: number | null = null;

    if (markedDays.has(todayStart)) {
      startDay = todayStart;
    } else if (markedDays.has(yesterdayStart)) {
      startDay = yesterdayStart;
    } else {
      return 0;
    }

    let streak = 0;
    let pointer = startDay;

    while (markedDays.has(pointer)) {
      streak += 1;
      pointer -= dayMs;
    }

    return streak;
  }

  // 私有方法
  private generateTagId(name: string): string {
    const trimmedName = name.trim();
    // eslint-disable-next-line no-control-regex
    const hasNonAscii = /[^\x00-\x7F]/.test(trimmedName);

    if (hasNonAscii) {
      try {
        return `tag_${this.encodeToBase64(trimmedName)}`;
      } catch (error) {
        console.error('Base64 编码失败，回退到安全字符编码:', error);
      }
    }

    return trimmedName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
  }

  private encodeToBase64(value: string): string {
    if (typeof globalThis !== 'undefined') {
      const globalRef: any = globalThis as any;

      if (typeof globalRef.TextEncoder !== 'undefined' && typeof globalRef.btoa === 'function') {
        const encoder = new globalRef.TextEncoder();
        const bytes = encoder.encode(value);
        let binary = '';
        bytes.forEach((byte: number) => {
          binary += String.fromCharCode(byte);
        });
        return globalRef.btoa(binary);
      }

      if (typeof globalRef.Buffer !== 'undefined') {
        return globalRef.Buffer.from(value, 'utf-8').toString('base64');
      }
    }

    throw new Error('Base64 encoding is not supported in the current environment');
  }

  private generatePageId(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '');
  }

  private generateColor(): string {
    const colors = [
      'oklch(0.70 0.20 25)',   // OKLCH: 红色
      'oklch(0.75 0.15 180)',   // OKLCH: 青色
      'oklch(0.70 0.15 220)',   // OKLCH: 蓝色
      'oklch(0.75 0.12 150)',   // OKLCH: 绿色
      'oklch(0.85 0.15 90)',    // OKLCH: 黄色
      'oklch(0.75 0.12 300)',   // OKLCH: 紫色
      'oklch(0.75 0.10 160)',   // OKLCH: 青绿色
      'oklch(0.80 0.15 85)',    // OKLCH: 黄绿色
      'oklch(0.70 0.10 310)',   // OKLCH: 淡紫色
      'oklch(0.75 0.12 210)',   // OKLCH: 天蓝色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 已移除层级递归收集

  // loadFromStorage 已移除，数据加载现在在 background.ts 中完成

  /**
   * 辅助方法：标记数据为脏
   * @param pageId - 可选的页面 ID，用于增量存储跟踪
   * @param tagId - 可选的标签 ID，用于增量存储跟踪
   */
  private markDirty(pageId?: string, tagId?: string): void {
    this._isDirty = true;
    if (pageId) {
      this._changedPageIds.add(pageId);
    }
    if (tagId) {
      this._changedTagIds.add(tagId);
    }
  }

  /**
   * 立即提交方法（用于关键操作，如 importData）
   * 只有当数据脏了时，才写入 Storage
   */
  public async commitImmediate(): Promise<void> {
    // 清除防抖定时器，如果有的话
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // 等待任何待处理的提交完成
    if (this.pendingCommit) {
      await this.pendingCommit;
    }
    
    // 执行立即提交
    if (!this._isDirty) return;
    
    await this.saveToStorage();
    this._isDirty = false;
    console.log('[GameplayStore] Transaction committed to storage (immediate).');
  }

  /**
   * 防抖提交方法（用于批量写操作，减少存储写入频率）
   * 短时间内多次修改只提交一次
   */
  public async commitDebounced(): Promise<void> {
    // 如果已有待处理的提交，返回同一个 Promise
    if (this.pendingCommit) {
      return this.pendingCommit;
    }
    
    // 清除之前的防抖定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // 创建新的提交 Promise
    this.pendingCommit = new Promise<void>((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          if (this._isDirty) {
            await this.saveToStorage();
            this._isDirty = false;
            console.log('[GameplayStore] Transaction committed to storage (debounced).');
          }
        } catch (error) {
          console.error('[GameplayStore] Debounced commit failed:', error);
        } finally {
          this.debounceTimer = null;
          this.pendingCommit = null;
          resolve();
        }
      }, this.DEBOUNCE_DELAY);
    });
    
    return this.pendingCommit;
  }

  /**
   * 向后兼容的提交方法（默认使用防抖提交）
   * 只有当数据脏了时，才写入 Storage
   */
  public async commit(): Promise<void> {
    return this.commitDebounced();
  }

  private async saveToStorage(): Promise<void> {
    try {
      // 如果 Repository 已设置，使用 Repository
      if (this.tagRepo && this.pageRepo) {
        // Repository 模式：如果使用增量存储，只保存变化的数据
        if (this._changedTagIds.size > 0 || this._changedPageIds.size > 0) {
          const changedTags = Array.from(this._changedTagIds)
            .map(id => this.tags[id])
            .filter(Boolean);
          const changedPages = Array.from(this._changedPageIds)
            .map(id => this.pages[id])
            .filter(Boolean);
          
          if (changedTags.length > 0) {
            await this.tagRepo.saveBatch(changedTags);
          }
          if (changedPages.length > 0) {
            await this.pageRepo.saveBatch(changedPages);
          }
        } else {
          // 没有变化跟踪，保存全部（向后兼容）
          await this.tagRepo.saveBatch(Object.values(this.tags));
          await this.pageRepo.saveBatch(Object.values(this.pages));
        }
      } else {
        // 原子化存储模式：分片存储，每个页面独立 key
        // 这样可以避免 8MB 配额限制，并且单页更新从 O(N) 降低到 O(1)
        const useAtomicStorage = true; // 启用原子化存储
        
        if (useAtomicStorage) {
          // 增量存储：只保存变化的标签和页面
          
          // 1. 保存标签：如果有变化的标签，只保存变化的；否则保存全部
          if (this._changedTagIds.size > 0) {
            // 只保存变化的标签，但仍需要保存完整的标签集合（因为存储是单个 key）
            await storageService.set(STORAGE_KEYS.TAGS, this.tags);
          } else if (this._changedTagIds.size === 0 && Object.keys(this.tags).length > 0) {
            // 如果没有变化跟踪但有标签数据，保存全部（首次保存或向后兼容）
            await storageService.set(STORAGE_KEYS.TAGS, this.tags);
          }
          
          // 2. 增量保存页面：只保存变化的页面
          if (this._changedPageIds.size > 0) {
            // 批量保存变化的页面（使用 setMultiple 提升性能）
            const pageDataToSave: Record<string, TaggedPage> = {};
            const changedPageIds = Array.from(this._changedPageIds);
            
            for (const pageId of changedPageIds) {
              const page = this.pages[pageId];
              if (page) {
                const urlHash = this.generatePageId(page.url);
                pageDataToSave[`page::${urlHash}`] = page;
              }
            }
            
            // 分批保存（每批 100 个，避免超过存储限制）
            const BATCH_SIZE = 100;
            const keys = Object.keys(pageDataToSave);
            for (let i = 0; i < keys.length; i += BATCH_SIZE) {
              const batch = keys.slice(i, i + BATCH_SIZE);
              const batchData: Record<string, TaggedPage> = {};
              for (const key of batch) {
                batchData[key] = pageDataToSave[key];
              }
              await storageService.setMultiple(batchData);
            }
            
            // 3. 更新索引：使用内存缓存，避免每次读取 storage
            // 如果缓存未初始化，从 storage 加载（仅首次）
            if (this._pageIndexCache === null) {
              this._pageIndexCache = await storageService.get<string[]>('page_index') || [];
            }
            
            // 更新内存缓存：添加新页面，移除已删除页面
            const pageIndexSet = new Set(this._pageIndexCache);
            
            // 添加新页面
            changedPageIds.forEach(id => {
              if (this.pages[id]) {
                pageIndexSet.add(id);
              }
            });
            
            // 移除已删除页面
            this._deletedPageIds.forEach(id => {
              pageIndexSet.delete(id);
            });
            
            this._pageIndexCache = Array.from(pageIndexSet);
            
            // 异步写入 storage（不阻塞）
            storageService.set('page_index', this._pageIndexCache).catch((error) => {
              console.error('[GameplayStore] 更新 page_index 失败:', error);
            });
            
            // 清空已删除页面集合
            this._deletedPageIds.clear();
          }
          // 如果没有页面变化（_changedPageIds 为空），不保存页面（增量存储优化）
        } else {
          // 传统存储方式（向后兼容）
          const dataToSave = {
            [STORAGE_KEYS.TAGS]: this.tags,
            [STORAGE_KEYS.PAGES]: this.pages
          };
          await storageService.setMultiple(dataToSave);
        }
      }
      
      // 提交后清空变化跟踪集合
      this._changedPageIds.clear();
      this._changedTagIds.clear();
    } catch (error) {
      console.error('保存存储数据失败:', error);
      // 注意：这里不抛出错误，以保持向后兼容性
      // 调用方可以通过检查 _isDirty 状态来判断是否保存成功
    }
  }


  // 重新加载存储数据
  public async reloadFromStorage(): Promise<void> {
    // 此方法现在必须获取数据并重新初始化
    try {
      // 如果 Repository 已设置，使用 Repository
      if (this.tagRepo && this.pageRepo) {
        const tags = await this.tagRepo.getAll();
        const pages = await this.pageRepo.getAll();
        
        // 转换为 Collection 格式
        const tagsCollection: TagsCollection = {};
        const pagesCollection: PageCollection = {};
        
        tags.forEach((tag: GameplayTag) => {
          tagsCollection[tag.id] = tag;
        });
        
        pages.forEach((page: TaggedPage) => {
          pagesCollection[page.id] = page;
        });
        
        // 数据规范化：在数据进入 GameplayStore 之前统一规范化
        const normalizedTags = normalizeTagsCollection(tagsCollection);
        const normalizedPages = normalizePageCollection(pagesCollection);
        
        this._isInitialized = false; // 强制重新初始化
        this.initialize({
          tags: normalizedTags,
          pages: normalizedPages
        });
      } else {
        // 原子化存储模式：从分片存储读取
        const useAtomicStorage = true; // 启用原子化存储
        
        if (useAtomicStorage) {
          // 1. 读取标签（保持传统方式）
          const tags = await storageService.get<TagsCollection>(STORAGE_KEYS.TAGS);
          
          // 2. 读取索引，然后批量读取所有页面
          const pageIndex = await storageService.get<string[]>('page_index') || [];
          
          // 3. 批量读取所有页面数据（page_id 就是 url_hash）
          const pagePromises = pageIndex.map(async (pageId) => {
            // page_id 就是通过 generatePageId(url) 生成的，与原子化存储的 key 一致
            const atomicKey = `page::${pageId}`;
            const page = await storageService.get<TaggedPage>(atomicKey);
            return page;
          });
          
          const pages = (await Promise.all(pagePromises)).filter((page): page is TaggedPage => page !== null);
          
          // 转换为 Collection 格式
          const pagesCollection: PageCollection = {};
          pages.forEach((page: TaggedPage) => {
            pagesCollection[page.id] = page;
          });
          
          // 数据规范化：在数据进入 GameplayStore 之前统一规范化
          const normalizedTags = normalizeTagsCollection(tags || {});
          const normalizedPages = normalizePageCollection(pagesCollection);
          
          this._isInitialized = false; // 强制重新初始化
          this.initialize({
            tags: normalizedTags,
            pages: normalizedPages
          });
        } else {
          // 传统存储方式（向后兼容）
          const storageData = await storageService.getMultiple([
            STORAGE_KEYS.TAGS,
            STORAGE_KEYS.PAGES
          ]);
          
          // 数据规范化：在数据进入 GameplayStore 之前统一规范化
          const normalizedTags = normalizeTagsCollection(storageData[STORAGE_KEYS.TAGS] as TagsCollection | null ?? {});
          const normalizedPages = normalizePageCollection(storageData[STORAGE_KEYS.PAGES] as PageCollection | null ?? {});
          
          this._isInitialized = false; // 强制重新初始化
          // initialize 内部会调用 notifyListeners，这里不需要重复调用
          this.initialize({
            tags: normalizedTags,
            pages: normalizedPages
          });
        }
      }
    } catch (error) {
      console.error('重新加载存储数据失败:', error);
      // 注意：这里不抛出错误，以保持向后兼容性
      // 调用方可以通过检查 isInitialized 状态来判断是否加载成功
    }
  }

  /**
   * 导出所有标签和页面数据为 JSON 字符串
   * @returns 包含所有标签和页面数据的 JSON 字符串
   */
  public exportData(): string {
    const exportData = {
      tags: this.tags,
      pages: this.pages,
      version: '1.0',
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 从 JSON 字符串导入标签和页面数据
   * @param jsonData JSON 字符串
   * @param mergeMode 是否合并模式（true: 合并到现有数据, false: 覆盖现有数据）
   * @returns 导入结果
   */
  public async importData(jsonData: string, mergeMode: boolean = false): Promise<{ success: boolean; error?: string; imported?: { tagsCount: number; pagesCount: number } }> {
    try {
      const imported = JSON.parse(jsonData);
      
      // 验证数据结构
      if (!imported.tags || !imported.pages) {
        return { success: false, error: '无效的数据格式：缺少 tags 或 pages 字段' };
      }

      if (typeof imported.tags !== 'object' || typeof imported.pages !== 'object') {
        return { success: false, error: '无效的数据格式：tags 和 pages 必须是对象' };
      }

      if (mergeMode) {
        // 合并模式：合并到现有数据
        const mergedTags = { ...this.tags };
        const mergedPages = { ...this.pages };

        // 合并标签，如果ID相同则保留现有的
        for (const [tagId, tag] of Object.entries(imported.tags)) {
          if (!mergedTags[tagId]) {
            mergedTags[tagId] = tag as GameplayTag;
          }
        }

        // 合并页面，如果ID相同则保留现有的
        for (const [pageId, page] of Object.entries(imported.pages)) {
          if (!mergedPages[pageId]) {
            mergedPages[pageId] = page as TaggedPage;
          }
        }

        // 数据规范化：在数据进入 GameplayStore 之前统一规范化
        this.tags = normalizeTagsCollection(mergedTags);
        this.pages = normalizePageCollection(mergedPages);
      } else {
        // 覆盖模式：完全替换现有数据
        // 数据规范化：在数据进入 GameplayStore 之前统一规范化
        this.tags = normalizeTagsCollection(imported.tags ?? {});
        this.pages = normalizePageCollection(imported.pages ?? {});
      }

    // 批量导入：标记所有导入的标签和页面
    this._isDirty = true;
    // 标记所有导入的标签
    for (const tagId of Object.keys(this.tags)) {
      this._changedTagIds.add(tagId);
    }
    // 标记所有导入的页面
    for (const pageId of Object.keys(this.pages)) {
      this._changedPageIds.add(pageId);
    }
    
    // 重建索引以保持一致性
    this.rebuildIndices();
    
    this.notifyListeners(); // 通知 UI

    return {
        success: true,
        imported: {
          tagsCount: Object.keys(this.tags).length,
          pagesCount: Object.keys(this.pages).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入数据解析失败'
      };
    }
  }

  // 测试存储功能
  public async testStorage(): Promise<void> {
    // 保存当前状态
    await this.commit();
    // 存储服务会自动处理保存，无需验证
  }

  // Tag生命周期管理

  /**
   * [修改] 删除标签及其所有引用（公开方法）
   * @param tagId 要删除的标签ID
   * @returns 成功或失败
   */
  public deleteTag(tagId: string): boolean {
    const startTime = performance.now();
    const tagToDelete = this.tags[tagId];
    if (!tagToDelete) {
      return false; // 标签不存在
    }

    // 性能监控：收集受影响的页面数量
    const pageIds = this._tagToPages.get(tagId);
    const affectedPageCount = pageIds ? pageIds.size : 0;
    const bindingsCount = Array.isArray(tagToDelete.bindings) ? tagToDelete.bindings.length : 0;

    // 1. 批量处理页面更新：先收集所有需要更新的页面，然后批量更新
    // 优化：减少 markDirty 调用次数，批量处理页面更新
    const affectedPageIds: string[] = [];
    if (pageIds) {
      const now = timeService.now();
      for (const pageId of pageIds) {
        const page = this.pages[pageId];
        if (page) {
          // 确保 tags 是数组
          if (!Array.isArray(page.tags)) {
            page.tags = [];
          }
          const index = page.tags.indexOf(tagId);
          if (index > -1) {
            page.tags.splice(index, 1);
            page.updatedAt = now; // 使用统一的时间戳
            affectedPageIds.push(pageId);
          }
        }
      }
      // 批量标记所有受影响的页面为 dirty
      affectedPageIds.forEach(pageId => {
        this.markDirty(pageId);
      });
      // 清理索引
      this._tagToPages.delete(tagId);
    }

    // 2. 清理与其他标签的绑定关系
    const bindings = Array.isArray(tagToDelete.bindings) ? tagToDelete.bindings : [];
    if (bindings.length > 0) {
      const now = timeService.now();
      bindings.forEach(otherId => {
        const otherTag = this.tags[otherId];
        if (otherTag) {
          // 确保 bindings 是数组
          if (!Array.isArray(otherTag.bindings)) {
            otherTag.bindings = [];
          }
          otherTag.bindings = otherTag.bindings.filter(id => id !== tagId);
          otherTag.updatedAt = now; // 使用统一的时间戳
          this.markDirty(undefined, otherId);
        }
      });
    }

    // 3. 删除标签本身
    delete this.tags[tagId];
    
    // 更新标签名称索引
    this._tagNameToId.delete(tagToDelete.name.toLowerCase());
    
    this.markDirty(undefined, tagId);
    
    // 性能监控：记录删除操作耗时
    const duration = performance.now() - startTime;
    if (duration > 10 || affectedPageCount > 10) {
      console.log(`[GameplayStore] deleteTag 性能监控:`, {
        tagId,
        duration: `${duration.toFixed(2)}ms`,
        affectedPages: affectedPageCount,
        affectedBindings: bindingsCount,
      });
    }
    
    // 只在最后调用一次 notifyListeners，减少 UI 重渲染次数
    this.notifyListeners(); // 通知 UI
    return true;
  }

  /**
   * 删除页面
   * 会清理页面与标签的关联关系
   */
  public deletePage(pageId: string): boolean {
    const pageToDelete = this.pages[pageId];
    if (!pageToDelete) {
      return false; // 页面不存在
    }

    const log = logger('GameplayStore');

    // 1. 清理页面与标签的关联关系（从索引中移除）
    const tags = Array.isArray(pageToDelete.tags) ? pageToDelete.tags : [];
    for (const tagId of tags) {
      const pageSet = this._tagToPages.get(tagId);
      if (pageSet) {
        pageSet.delete(pageId);
        // 如果该标签没有关联任何页面，清理索引条目
        if (pageSet.size === 0) {
          this._tagToPages.delete(tagId);
        }
      }
    }

    // 2. 删除页面本身
    delete this.pages[pageId];
    
    // 3. 标记为已删除，用于在 saveToStorage 时从 page_index 移除
    this._deletedPageIds.add(pageId);
    
    this.markDirty(pageId);
    this.notifyListeners(); // 通知 UI
    
    log.debug('deletePage: removed', { pageId, hadTags: tags.length });
    return true;
  }

  /**
   * 清理所有未使用的标签
   * 使用索引优化：从 O(N×M) 降到 O(N)
   */
  public cleanupUnusedTags(): void {
    const allTagIds = Object.keys(this.tags);
    const usedTagIds = new Set<string>();
    
    // 使用索引收集所有被页面使用的标签ID（O(N) 而不是 O(N×M)）
    for (const [tagId, pageIds] of this._tagToPages.entries()) {
      if (pageIds.size > 0) {
        usedTagIds.add(tagId);
      }
    }
    
    // 找出未使用的标签
    const unusedTagIds = allTagIds.filter(tagId => !usedTagIds.has(tagId));
    
    // 直接删除未使用的标签
    unusedTagIds.forEach(tagId => {
      this.deleteTag(tagId);
    });
  }
  // 移除层级相关辅助方法
}

// 导出单例实例
export const gameplayStore = GameplayStore.getInstance();

// 向后兼容：导出别名（保持旧代码可以继续工作）
/** @deprecated 使用 gameplayStore 替代 */
export const tagManager = gameplayStore;
/** @deprecated 使用 GameplayStore 替代 */
export { GameplayStore as TagManager };
