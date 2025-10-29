import { GameplayTag, TaggedPage, TagHierarchy, PageCollection } from '../types/gameplayTag';

export class TagManager {
  private static instance: TagManager;
  private tags: TagHierarchy = {};
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

  // 标签管理
  public createTag(name: string, parentId?: string, description?: string, color?: string): GameplayTag {
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
    
    // 检查是否包含无效字符
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5._-]+$/.test(trimmedName)) {
      throw new Error('标签名称只能包含字母、数字、中文、点、下划线和连字符');
    }
    
    const fullName = parentId ? `${this.tags[parentId].fullName}.${trimmedName}` : trimmedName;
    const id = this.generateTagId(fullName);
    
    const tag: GameplayTag = {
      id,
      name: trimmedName,
      fullName,
      parent: parentId,
      children: [],
      description,
      color: color || this.generateColor(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tags[id] = tag;

    // 如果有父标签，更新父标签的子标签列表
    if (parentId && this.tags[parentId]) {
      this.tags[parentId].children.push(id);
      this.tags[parentId].updatedAt = Date.now();
    }

    // 不在这里调用saveToStorage，让调用者处理
    return tag;
  }

  public updateTagParent(tagId: string, newParentId?: string): boolean {
    const tag = this.tags[tagId];
    if (!tag) return false;
    
    const oldParentId = tag.parent;
    
    // 从旧父标签的子标签列表中移除
    if (oldParentId && this.tags[oldParentId]) {
      const index = this.tags[oldParentId].children.indexOf(tagId);
      if (index > -1) {
        this.tags[oldParentId].children.splice(index, 1);
        this.tags[oldParentId].updatedAt = Date.now();
      }
    }
    
    // 更新标签的父标签关系
    tag.parent = newParentId;
    tag.fullName = newParentId ? `${this.tags[newParentId].fullName}.${tag.name}` : tag.name;
    tag.updatedAt = Date.now();
    
    // 添加到新父标签的子标签列表
    if (newParentId && this.tags[newParentId]) {
      if (!this.tags[newParentId].children.includes(tagId)) {
        this.tags[newParentId].children.push(tagId);
        this.tags[newParentId].updatedAt = Date.now();
      }
    }
    
    return true;
  }

  public getAllTags(): GameplayTag[] {
    return Object.values(this.tags);
  }

  public getTagById(id: string): GameplayTag | undefined {
    return this.tags[id];
  }

  public getTagsByParent(parentId?: string): GameplayTag[] {
    return Object.values(this.tags).filter(tag => tag.parent === parentId);
  }

  public getTagHierarchy(): GameplayTag[] {
    // 返回根标签及其所有子标签的层次结构
    const rootTags = this.getTagsByParent();
    return this.buildHierarchy(rootTags);
  }

  private buildHierarchy(tags: GameplayTag[]): GameplayTag[] {
    const result: GameplayTag[] = [];
    
    for (const tag of tags) {
      result.push(tag);
      const children = this.getTagsByParent(tag.id);
      if (children.length > 0) {
        result.push(...this.buildHierarchy(children));
      }
    }
    
    return result;
  }

  // 页面管理
  public addTagToPage(pageId: string, tagId: string): boolean {
    if (!this.tags[tagId]) {
      return false;
    }

    if (!this.pages[pageId]) {
      return false;
    }

    if (!this.pages[pageId].tags.includes(tagId)) {
      this.pages[pageId].tags.push(tagId);
      this.pages[pageId].updatedAt = Date.now();
      // 不在这里调用saveToStorage，让调用者处理
      return true;
    } else {
      return false;
    }
  }

  public removeTagFromPage(pageId: string, tagId: string): boolean {
    if (!this.pages[pageId]) {
      return false;
    }

    const index = this.pages[pageId].tags.indexOf(tagId);
    if (index > -1) {
      this.pages[pageId].tags.splice(index, 1);
      this.pages[pageId].updatedAt = Date.now();
      // 不在这里调用saveToStorage，让调用者处理
      
      return true;
    } else {
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

    // 获取标签及其所有子标签的页面
    const tagAndChildren = this.getTagAndChildren(tagId);
    const result: TaggedPage[] = [];

    for (const page of Object.values(this.pages)) {
      // 确保页面有标签且匹配目标标签
      if (page.tags && page.tags.length > 0 && page.tags.some(pageTagId => tagAndChildren.includes(pageTagId))) {
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
  private generateTagId(fullName: string): string {
    return fullName.toLowerCase().replace(/[^a-z0-9.]/g, '_');
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

  private getTagAndChildren(tagId: string): string[] {
    const result = [tagId];
    const tag = this.tags[tagId];
    
    if (tag) {
      for (const childId of tag.children) {
        result.push(...this.getTagAndChildren(childId));
      }
    }
    
    return result;
  }

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

    const tag = this.tags[tagId];

    // 递归删除所有子标签
    if (tag.children && tag.children.length > 0) {
      // 创建副本以避免在迭代时修改数组
      const childrenToDelete = [...tag.children];
      childrenToDelete.forEach(childId => this.deleteTag(childId));
    }

    // 从父标签的子标签列表中移除
    if (tag.parent && this.tags[tag.parent]) {
      const parentTag = this.tags[tag.parent];
      const childIndex = parentTag.children.indexOf(tagId);
      if (childIndex > -1) {
        parentTag.children.splice(childIndex, 1);
        parentTag.updatedAt = Date.now();
      }
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
        // 同时添加所有父标签ID
        this.addParentTagIds(tagId, usedTagIds);
      });
    });
    
    // 找出未使用的标签
    const unusedTagIds = allTagIds.filter(tagId => !usedTagIds.has(tagId));
    
    
    // 按层级排序，先删除子标签，再删除父标签
    const sortedUnusedTagIds = this.sortTagsByHierarchy(unusedTagIds);
    
    // 删除未使用的标签
    sortedUnusedTagIds.forEach(tagId => {
      this.deleteTag(tagId);
    });
    
  }

  /**
   * 按层级排序标签，子标签在前，父标签在后
   */
  private sortTagsByHierarchy(tagIds: string[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    
    const addTagAndChildren = (tagId: string) => {
      if (visited.has(tagId)) return;
      visited.add(tagId);
      
      const tag = this.tags[tagId];
      if (tag && tag.children) {
        // 先添加所有子标签
        tag.children.forEach(childId => {
          if (tagIds.includes(childId)) {
            addTagAndChildren(childId);
          }
        });
      }
      
      // 再添加当前标签
      sorted.push(tagId);
    };
    
    tagIds.forEach(tagId => addTagAndChildren(tagId));
    return sorted;
  }

  /**
   * 递归添加父标签ID到集合中
   */
  private addParentTagIds(tagId: string, usedTagIds: Set<string>): void {
    const tag = this.tags[tagId];
    if (tag && tag.parent && this.tags[tag.parent]) {
      usedTagIds.add(tag.parent);
      this.addParentTagIds(tag.parent, usedTagIds);
    }
  }
}
