import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../types/gameplayTag';
import { logger } from './logger';
import { storageService, STORAGE_KEYS } from './storageService';

export class TagManager {
  private static instance: TagManager;
  private tags: TagsCollection = {};
  private pages: PageCollection = {};

  // 添加一个 promise 来跟踪初始化状态
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // 构造函数中不进行异步操作
  }

  public static getInstance(): TagManager {
    if (!TagManager.instance) {
      TagManager.instance = new TagManager();
    }
    return TagManager.instance;
  }

  // 修改 initialize 方法使其幂等
  public async initialize(): Promise<void> {
    if (this.initPromise) {
      // 如果已经在初始化中，或已完成，则直接等待
      return this.initPromise;
    }
    
    // 开始初始化，并保存 promise
    this.initPromise = (async () => {
      try {
        await this.loadFromStorage();
      } catch (error) {
        // 如果失败，重置 promise 允许重试
        this.initPromise = null;
        console.error('TagManager 初始化失败:', error);
        throw error; // 重新抛出错误
      }
    })();
    
    return this.initPromise;
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

  /**
   * 从 Chrome tabs API 获取当前标签页并注册页面
   */
  public async getCurrentTabAndRegisterPage(resolvedUrl?: string): Promise<TaggedPage> {
    try {
      // 检查 chrome.tabs API 是否可用
      if (!chrome.tabs || !chrome.tabs.query) {
        throw new Error('Chrome tabs API 不可用');
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tabs || tabs.length === 0) {
        throw new Error('无法获取当前标签页：没有活动的标签页');
      }

      const tab = tabs[0];
      
      if (!tab || !tab.id) {
        throw new Error('无法获取当前标签页：标签页 ID 无效');
      }

      // 检查 URL 是否有效（某些页面如 chrome:// 可能没有 URL）
      if (!tab.url) {
        throw new Error('无法获取当前页面：页面 URL 不可用（可能是 Chrome 内部页面）');
      }
      
      const pageUrl = resolvedUrl || tab.url;

      return this.createOrUpdatePage(
        pageUrl,
        tab.title || '无标题',
        new URL(pageUrl).hostname,
        tab.favIconUrl
      );
    } catch (error) {
      const log = logger('TagManager');
      log.error('getCurrentTabAndRegisterPage failed', { error });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`获取当前页面失败: ${String(error)}`);
    }
  }

  /**
   * 确保页面已注册（如果不存在则创建）
   */
  public async ensurePageRegistered(pageId?: string): Promise<TaggedPage> {
    if (pageId) {
      const page = this.getPageById(pageId);
      if (page) {
        return page;
      }
    }
    
    // 页面不存在，从当前标签页创建
    return await this.getCurrentTabAndRegisterPage();
  }

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
    
    return true;
  }

  public clearAllData(): void {
    this.tags = {};
    this.pages = {};
  }

  public getDataStats(): { tagsCount: number; pagesCount: number } {
    return {
      tagsCount: Object.keys(this.tags).length,
      pagesCount: Object.keys(this.pages).length
    };
  }

  // 私有方法
  private generateTagId(name: string): string {
    const trimmedName = name.trim();
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

  private async loadFromStorage(): Promise<void> {
    try {
      const storageData = await storageService.getMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES
      ]);

      this.tags = (storageData[STORAGE_KEYS.TAGS] as TagsCollection | null) || {};
      this.pages = (storageData[STORAGE_KEYS.PAGES] as PageCollection | null) || {};
      
    } catch (error) {
      console.error('加载存储数据失败:', error);
    }
  }

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
    await this.loadFromStorage();
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
   * 检查并清理未使用的标签
   */
  private checkAndCleanupUnusedTag(tagId: string): void {
    // 检查标签是否还被任何页面使用
    const isTagUsed = Object.values(this.pages).some(page => page.tags.includes(tagId));
    
    if (!isTagUsed) {
      this.deleteTag(tagId);
    } else {
    }
  }

  /**
   * 删除标签及其所有子标签
   */
  private deleteTag(tagId: string): void {
    if (!this.tags[tagId]) {
      return;
    }

    // 清理与其他标签的绑定关系
    const tag = this.tags[tagId];
    if (tag.bindings && tag.bindings.length > 0) {
      tag.bindings.forEach(otherId => {
        const other = this.tags[otherId];
        if (other) {
          other.bindings = other.bindings.filter(id => id !== tagId);
          other.updatedAt = Date.now();
        }
      });
    }

    // 删除标签本身
    delete this.tags[tagId];
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
