import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../shared/types/gameplayTag';
import { logger } from '../infra/logger';
import { storageService, STORAGE_KEYS } from './storageService';
import { timeService } from './timeService';
import { ITagRepository, IPageRepository } from '../infra/database/chrome-storage/repositories/types';
import { ChromeTagRepository, ChromePageRepository } from '../infra/database/chrome-storage/repositories/ChromeStorageRepository';
import { cacheMonitor } from './cacheMonitor';

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
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('GameplayStore: 监听器执行失败', error);
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
      this.tags = data.tags ?? {};
      this.pages = data.pages ?? {};
      this._isInitialized = true; // 标记为已初始化
      this.notifyListeners(); // 通知 UI
    } catch (error) {
      console.error('GameplayStore 初始化失败:', error);
      this._isInitialized = false; // 失败时重置
      throw error;
    }
  }

  /**
   * 强制更新数据（即使已经初始化）
   * 用于同步服务在后台更新数据时使用
   */
  public updateData(data: { tags?: TagsCollection | null; pages?: PageCollection | null }): void {
    try {
      if (data.tags !== undefined) {
        this.tags = data.tags ?? {};
      }
      if (data.pages !== undefined) {
        this.pages = data.pages ?? {};
      }
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
    
    // 关键：只标记，不保存
    this.markDirty();
    
    this.notifyListeners(); // 通知 UI
    return tag;
  }

  // 绑定关系管理（对称）
  public bindTags(tagIdA: string, tagIdB: string): boolean {
    if (tagIdA === tagIdB) return false;
    const a = this.tags[tagIdA];
    const b = this.tags[tagIdB];
    if (!a || !b) return false;
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
    a.bindings = a.bindings.filter(id => id !== tagIdB);
    b.bindings = b.bindings.filter(id => id !== tagIdA);
    a.updatedAt = timeService.now();
    b.updatedAt = timeService.now();
    this.markDirty();
    this.notifyListeners(); // 通知 UI
    return true;
  }

  public getBoundTags(tagId: string): GameplayTag[] {
    const tag = this.tags[tagId];
    if (!tag) return [];
    return tag.bindings.map(id => this.tags[id]).filter(Boolean) as GameplayTag[];
  }

  public getAllTags(): GameplayTag[] {
    return Object.values(this.tags);
  }

  public getTagById(id: string): GameplayTag | undefined {
    return this.tags[id];
  }

  /**
   * 根据名称查找标签（忽略大小写）
   */
  public findTagByName(name: string): GameplayTag | undefined {
    if (!name) return undefined;
    const trimmedName = name.trim().toLowerCase();
    return this.getAllTags().find(tag => tag.name.toLowerCase() === trimmedName);
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
    tag.name = trimmedName;
    tag.updatedAt = timeService.now();
    this.markDirty();
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

    if (!this.pages[pageId].tags.includes(tagId)) {
      this.pages[pageId].tags.push(tagId);
      this.pages[pageId].updatedAt = timeService.now();
      log.debug('addTagToPage: added', { pageId, tagId, tagsCount: this.pages[pageId].tags.length });
      this.markDirty();
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

    const index = this.pages[pageId].tags.indexOf(tagId);
    if (index > -1) {
      this.pages[pageId].tags.splice(index, 1);
      this.pages[pageId].updatedAt = timeService.now();
      log.debug('removeTagFromPage: removed', { pageId, tagId, tagsCount: this.pages[pageId].tags.length });
      this.markDirty();
      this.notifyListeners(); // 通知 UI
      return true;
    } else {
      log.info('removeTagFromPage: not present', { pageId, tagId });
      return false;
    }
  }

  public createOrUpdatePage(url: string, title: string, domain: string, favicon?: string): TaggedPage {
    const pageId = this.generatePageId(url);
    
    if (this.pages[pageId]) {
      // 更新现有页面，保持原有的标签数据和手动编辑标记
      const existingTags = this.pages[pageId].tags; // 保存现有标签
      const existingTitleManuallyEdited = this.pages[pageId].titleManuallyEdited; // 保存手动编辑标记
      this.pages[pageId] = {
        ...this.pages[pageId], // 保持所有现有属性
        title,
        updatedAt: timeService.now(),
        tags: existingTags, // 确保标签不被覆盖
        titleManuallyEdited: existingTitleManuallyEdited, // 保持手动编辑标记
        ...(favicon && { favicon })
      };
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
        titleManuallyEdited: false // 新创建的页面默认未手动编辑
      };
    }

    this.markDirty();
    this.notifyListeners(); // 通知 UI
    return this.pages[pageId];
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

    // 返回包含该标签的页面（不再包含子标签聚合）
    const result: TaggedPage[] = [];

    for (const page of Object.values(this.pages)) {
      if (page.tags && page.tags.length > 0 && page.tags.includes(tagId)) {
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
      for (const tagId of page.tags) {
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
      updatedAt: timeService.now()
    };
    this.markDirty();
    this.notifyListeners(); // 通知 UI
    
    return true;
  }

  public clearAllData(): void {
    this.tags = {};
    this.pages = {};
    this._isInitialized = false; // 重置初始化状态，允许重新初始化
    this._isDirty = false; // 重置脏标记
    
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
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 已移除层级递归收集

  // loadFromStorage 已移除，数据加载现在在 background.ts 中完成

  /**
   * 辅助方法：标记数据为脏
   */
  private markDirty(): void {
    this._isDirty = true;
  }

  /**
   * 提供给外部（中间件）调用的提交方法
   * 只有当数据脏了时，才写入 Storage
   */
  public async commit(): Promise<void> {
    if (!this._isDirty) return;
    
    await this.saveToStorage();
    this._isDirty = false;
    console.log('[GameplayStore] Transaction committed to storage.');
  }

  private async saveToStorage(): Promise<void> {
    try {
      // 如果 Repository 已设置，使用 Repository
      if (this.tagRepo && this.pageRepo) {
        await this.tagRepo.saveBatch(Object.values(this.tags));
        await this.pageRepo.saveBatch(Object.values(this.pages));
      } else {
        // 否则使用传统的存储方式（向后兼容）
        const dataToSave = {
          [STORAGE_KEYS.TAGS]: this.tags,
          [STORAGE_KEYS.PAGES]: this.pages
        };
        
        await storageService.setMultiple(dataToSave);
      }
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
        
        this._isInitialized = false; // 强制重新初始化
        this.initialize({
          tags: tagsCollection,
          pages: pagesCollection
        });
      } else {
        // 否则使用传统的存储方式（向后兼容）
        const storageData = await storageService.getMultiple([
          STORAGE_KEYS.TAGS,
          STORAGE_KEYS.PAGES
        ]);
        this._isInitialized = false; // 强制重新初始化
        // initialize 内部会调用 notifyListeners，这里不需要重复调用
        this.initialize({
          tags: storageData[STORAGE_KEYS.TAGS] as TagsCollection | null,
          pages: storageData[STORAGE_KEYS.PAGES] as PageCollection | null
        });
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

      this.tags = mergedTags;
      this.pages = mergedPages;
    } else {
      // 覆盖模式：完全替换现有数据
      this.tags = imported.tags;
      this.pages = imported.pages;
    }

    this.markDirty();
    this.notifyListeners(); // 通知 UI

    return {
        success: true,
        imported: {
          tagsCount: Object.keys(imported.tags).length,
          pagesCount: Object.keys(imported.pages).length
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
    const tagToDelete = this.tags[tagId];
    if (!tagToDelete) {
      return false; // 标签不存在
    }

    // 1. 从所有页面中移除引用
    Object.values(this.pages).forEach(page => {
      const index = page.tags.indexOf(tagId);
      if (index > -1) {
        page.tags.splice(index, 1);
        page.updatedAt = timeService.now();
      }
    });

    // 2. 清理与其他标签的绑定关系
    if (tagToDelete.bindings && tagToDelete.bindings.length > 0) {
      tagToDelete.bindings.forEach(otherId => {
        const otherTag = this.tags[otherId];
        if (otherTag) {
          otherTag.bindings = otherTag.bindings.filter(id => id !== tagId);
          otherTag.updatedAt = timeService.now();
        }
      });
    }

    // 3. 删除标签本身
    delete this.tags[tagId];
    this.markDirty();
    this.notifyListeners(); // 通知 UI
    return true;
  }

  /**
   * 清理所有未使用的标签
   */
  public cleanupUnusedTags(): void {
    
    const allTagIds = Object.keys(this.tags);
    const usedTagIds = new Set<string>();
    
    // 收集所有被页面使用的标签ID
    Object.values(this.pages).forEach(page => {
      page.tags.forEach(tagId => {
        usedTagIds.add(tagId);
      });
    });
    
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
