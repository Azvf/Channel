import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../types/gameplayTag';
import { logger } from './logger';
import { storageService, STORAGE_KEYS } from './storageService';

type ChangeListener = () => void;

export class TagManager {
  private static instance: TagManager;
  private tags: TagsCollection = {};
  private pages: PageCollection = {};

  private isInitialized = false;
  private listeners: Set<ChangeListener> = new Set();

  private constructor() {
    // 构造函数中不进行异步操作
  }

  public static getInstance(): TagManager {
    if (!TagManager.instance) {
      TagManager.instance = new TagManager();
    }
    return TagManager.instance;
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
        console.error('TagManager: 监听器执行失败', error);
      }
    });
  }

  /**
   * (重构) 使用传入的数据同步初始化 TagManager
   * 保持幂等性（防止重复初始化）
   */
  public initialize(data: { tags?: TagsCollection | null; pages?: PageCollection | null }): void {
    if (this.isInitialized) {
      return; // 已经初始化
    }
    
    try {
      this.tags = data.tags || {};
      this.pages = data.pages || {};
      this.isInitialized = true; // 标记为已初始化
      this.notifyListeners(); // 通知 UI
    } catch (error) {
      console.error('TagManager 初始化失败:', error);
      this.isInitialized = false; // 失败时重置
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
        this.tags = data.tags;
      }
      if (data.pages !== undefined) {
        this.pages = data.pages;
      }
      this.notifyListeners(); // 通知 UI
    } catch (error) {
      console.error('TagManager 更新数据失败:', error);
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bindings: []
    };

    this.tags[id] = tag;
    this.notifyListeners(); // 通知 UI

    // 不在这里调用saveToStorage，让调用者处理
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
    a.updatedAt = Date.now();
    b.updatedAt = Date.now();
    this.notifyListeners(); // 通知 UI
    return true;
  }

  public unbindTags(tagIdA: string, tagIdB: string): boolean {
    const a = this.tags[tagIdA];
    const b = this.tags[tagIdB];
    if (!a || !b) return false;
    a.bindings = a.bindings.filter(id => id !== tagIdB);
    b.bindings = b.bindings.filter(id => id !== tagIdA);
    a.updatedAt = Date.now();
    b.updatedAt = Date.now();
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
    tag.updatedAt = Date.now();
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
    const log = logger('TagManager');
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
      this.pages[pageId].updatedAt = Date.now();
      log.debug('addTagToPage: added', { pageId, tagId, tagsCount: this.pages[pageId].tags.length });
      this.notifyListeners(); // 通知 UI
      // 不在这里调用saveToStorage，让调用者处理
      return true;
    } else {
      log.info('addTagToPage: already exists', { pageId, tagId });
      return false;
    }
  }

  public removeTagFromPage(pageId: string, tagId: string): boolean {
    const log = logger('TagManager');
    if (!this.pages[pageId]) {
      log.warn('removeTagFromPage: page not found', { pageId, tagId });
      return false;
    }

    const index = this.pages[pageId].tags.indexOf(tagId);
    if (index > -1) {
      this.pages[pageId].tags.splice(index, 1);
      this.pages[pageId].updatedAt = Date.now();
      log.debug('removeTagFromPage: removed', { pageId, tagId, tagsCount: this.pages[pageId].tags.length });
      this.notifyListeners(); // 通知 UI
      // 不在这里调用saveToStorage，让调用者处理
      
      return true;
    } else {
      log.info('removeTagFromPage: not present', { pageId, tagId });
      return false;
    }
  }

  public createOrUpdatePage(url: string, title: string, domain: string, favicon?: string): TaggedPage {
    const pageId = this.generatePageId(url);
    
    if (this.pages[pageId]) {
      // 更新现有页面，保持原有的标签数据
      const existingTags = this.pages[pageId].tags; // 保存现有标签
      this.pages[pageId] = {
        ...this.pages[pageId], // 保持所有现有属性
        title,
        updatedAt: Date.now(),
        tags: existingTags, // 确保标签不被覆盖
        ...(favicon && { favicon })
      };
    } else {
      // 创建新页面
      this.pages[pageId] = {
        id: pageId,
        url,
        title,
        domain,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        favicon
      };
    }

    this.notifyListeners(); // 通知 UI
    // 不在这里调用saveToStorage，让调用者处理
    return this.pages[pageId];
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
   * 更新页面标题
   */
  public updatePageTitle(pageId: string, title: string): boolean {
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
      updatedAt: Date.now()
    };
    this.notifyListeners(); // 通知 UI
    
    return true;
  }

  public clearAllData(): void {
    this.tags = {};
    this.pages = {};
    this.isInitialized = false; // 重置初始化状态，允许重新初始化
    this.notifyListeners(); // 通知 UI
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

    pages.forEach(page => {
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

  private async saveToStorage(): Promise<void> {
    try {
      const dataToSave = {
        [STORAGE_KEYS.TAGS]: this.tags,
        [STORAGE_KEYS.PAGES]: this.pages
      };
      
      await storageService.setMultiple(dataToSave);
    } catch (error) {
      console.error('保存存储数据失败:', error);
    }
  }

  // 强制同步数据到存储
  public async syncToStorage(): Promise<void> {
    await this.saveToStorage();
  }

  // 重新加载存储数据
  public async reloadFromStorage(): Promise<void> {
    // 此方法现在必须获取数据并重新初始化
    try {
      const storageData = await storageService.getMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES
      ]);
      this.isInitialized = false; // 强制重新初始化
      // initialize 内部会调用 notifyListeners，这里不需要重复调用
      this.initialize({
        tags: storageData[STORAGE_KEYS.TAGS] as TagsCollection | null,
        pages: storageData[STORAGE_KEYS.PAGES] as PageCollection | null
      });
    } catch (error) {
      console.error('重新加载存储数据失败:', error);
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

      this.notifyListeners(); // 通知 UI
      // 保存到存储
      await this.saveToStorage();

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
    await this.saveToStorage();
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
        page.updatedAt = Date.now();
      }
    });

    // 2. 清理与其他标签的绑定关系
    if (tagToDelete.bindings && tagToDelete.bindings.length > 0) {
      tagToDelete.bindings.forEach(otherId => {
        const otherTag = this.tags[otherId];
        if (otherTag) {
          otherTag.bindings = otherTag.bindings.filter(id => id !== tagId);
          otherTag.updatedAt = Date.now();
        }
      });
    }

    // 3. 删除标签本身
    delete this.tags[tagId];
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
