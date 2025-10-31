import { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../types/gameplayTag';
import { logger } from './logger';

export class TagManager {
  private static instance: TagManager;
  private tags: TagsCollection = {};
  private pages: PageCollection = {};
  private readonly STORAGE_KEYS = {
    TAGS: 'gameplay_tags',
    PAGES: 'tagged_pages'
  };

  private constructor() {
    // 构造函数中不进行异步操作，改为在首次使用时加载
  }

  public static getInstance(): TagManager {
    if (!TagManager.instance) {
      TagManager.instance = new TagManager();
    }
    return TagManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadFromStorage();
  }

  // 标签管理（无父子层级）
  public createTag(name: string, description?: string, color?: string): GameplayTag {
    // 验证标签名称
    if (!name || !name.trim()) {
      throw new Error('标签名称不能为空');
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error('标签名称不能为空');
    }
    
    if (trimmedName.length > 50) {
      throw new Error('标签名称不能超过50个字符');
    }
    
    // 检查是否包含无效字符（允许空格）
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5._\- ]+$/.test(trimmedName)) {
      throw new Error('标签名称只能包含字母、数字、中文、点、下划线、连字符和空格');
    }

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
    return name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
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
      const storageData = await chrome.storage.local.get([
        this.STORAGE_KEYS.TAGS,
        this.STORAGE_KEYS.PAGES
      ]);

      this.tags = storageData[this.STORAGE_KEYS.TAGS] || {};
      this.pages = storageData[this.STORAGE_KEYS.PAGES] || {};
      
    } catch (error) {
      console.error('加载存储数据失败:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const dataToSave = {
        [this.STORAGE_KEYS.TAGS]: this.tags,
        [this.STORAGE_KEYS.PAGES]: this.pages
      };
      
      await chrome.storage.local.set(dataToSave);
      
      // 验证保存是否成功
      const verification = await chrome.storage.local.get([this.STORAGE_KEYS.TAGS, this.STORAGE_KEYS.PAGES]);
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

  // 测试存储功能
  public async testStorage(): Promise<void> {
    
    // 保存当前状态
    await this.saveToStorage();
    
    // 验证保存
    const verification = await chrome.storage.local.get([this.STORAGE_KEYS.TAGS, this.STORAGE_KEYS.PAGES]);
    
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
