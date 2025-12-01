/**
 * 数据规范化模块
 * 
 * 职责：统一处理数据格式问题，确保数据在进入 GameplayStore 之前符合类型定义
 * 
 * 架构原则：
 * - SSOT (Single Source of Truth)：数据格式在单一入口点统一处理
 * - 类型安全：使用 TypeScript 类型守卫确保类型安全
 * - 防御性编程：兼容旧数据格式，自动修复格式问题
 */

import type { GameplayTag, TaggedPage, TagsCollection, PageCollection } from '../types/gameplayTag';
import { createLogger } from './logger';

const logger = createLogger('DataNormalizer');

/**
 * 类型守卫：检查是否为有效的 TaggedPage
 */
export function isValidTaggedPage(page: unknown): page is TaggedPage {
  if (!page || typeof page !== 'object') {
    return false;
  }

  const p = page as Record<string, unknown>;
  
  // 必需字段检查
  if (typeof p.id !== 'string' || !p.id) return false;
  if (typeof p.url !== 'string' || !p.url) return false;
  if (typeof p.title !== 'string') return false;
  if (typeof p.domain !== 'string') return false;
  if (typeof p.createdAt !== 'number') return false;
  if (typeof p.updatedAt !== 'number') return false;
  
  // tags 必须是数组
  if (!Array.isArray(p.tags)) return false;
  
  // tags 数组中的每个元素必须是字符串
  if (!p.tags.every((tag: unknown) => typeof tag === 'string')) return false;
  
  return true;
}

/**
 * 类型守卫：检查是否为有效的 GameplayTag
 */
export function isValidGameplayTag(tag: unknown): tag is GameplayTag {
  if (!tag || typeof tag !== 'object') {
    return false;
  }

  const t = tag as Record<string, unknown>;
  
  // 必需字段检查
  if (typeof t.id !== 'string' || !t.id) return false;
  if (typeof t.name !== 'string' || !t.name) return false;
  if (typeof t.createdAt !== 'number') return false;
  if (typeof t.updatedAt !== 'number') return false;
  
  // bindings 必须是数组
  if (!Array.isArray(t.bindings)) return false;
  
  // bindings 数组中的每个元素必须是字符串
  if (!t.bindings.every((binding: unknown) => typeof binding === 'string')) return false;
  
  return true;
}

/**
 * 类型守卫：检查是否为有效的 TagsCollection
 */
export function isValidTagsCollection(collection: unknown): collection is TagsCollection {
  if (!collection || typeof collection !== 'object') {
    return false;
  }

  // 检查是否为普通对象（不是数组）
  if (Array.isArray(collection)) {
    return false;
  }

  const coll = collection as Record<string, unknown>;
  
  // 检查每个值是否为有效的 GameplayTag
  for (const key in coll) {
    if (!isValidGameplayTag(coll[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * 类型守卫：检查是否为有效的 PageCollection
 */
export function isValidPageCollection(collection: unknown): collection is PageCollection {
  if (!collection || typeof collection !== 'object') {
    return false;
  }

  // 检查是否为普通对象（不是数组）
  if (Array.isArray(collection)) {
    return false;
  }

  const coll = collection as Record<string, unknown>;
  
  // 检查每个值是否为有效的 TaggedPage
  for (const key in coll) {
    if (!isValidTaggedPage(coll[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * 规范化 TaggedPage：修复格式问题，返回有效的 TaggedPage 或 null
 */
export function normalizeTaggedPage(page: unknown): TaggedPage | null {
  if (!page || typeof page !== 'object') {
    // 降级为 debug 级别，因为数据已自动修复（返回 null）
    logger.debug('normalizeTaggedPage: page is not an object', { pageType: typeof page });
    return null;
  }

  const p = page as Record<string, unknown>;
  
  // 必需字段检查和修复
  const id = typeof p.id === 'string' && p.id ? p.id : null;
  const url = typeof p.url === 'string' && p.url ? p.url : null;
  const title = typeof p.title === 'string' ? p.title : '';
  const domain = typeof p.domain === 'string' ? p.domain : '';
  const createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now();
  const updatedAt = typeof p.updatedAt === 'number' ? p.updatedAt : Date.now();
  
  // 如果缺少必需字段，返回 null
  if (!id || !url) {
    // 降级为 debug 级别，因为数据已自动修复（返回 null）
    logger.debug('normalizeTaggedPage: missing required fields', { hasId: !!id, hasUrl: !!url });
    return null;
  }
  
  // 修复 tags 字段：确保是字符串数组
  let tags: string[] = [];
  if (Array.isArray(p.tags)) {
    tags = p.tags.filter((tag: unknown) => typeof tag === 'string') as string[];
  } else if (p.tags !== undefined && p.tags !== null) {
    // 如果不是数组但有值，记录警告并重置为空数组
    logger.warn('normalizeTaggedPage: tags is not an array, resetting to empty array', { 
      pageId: id, 
      tags: p.tags 
    });
  }
  
  // 构建规范化后的页面对象
  const normalized: TaggedPage = {
    id,
    url,
    title,
    domain,
    tags,
    createdAt,
    updatedAt,
  };
  
  // 可选字段
  if (typeof p.favicon === 'string') {
    normalized.favicon = p.favicon;
  }
  if (typeof p.description === 'string') {
    normalized.description = p.description;
  }
  if (typeof p.coverImage === 'string') {
    normalized.coverImage = p.coverImage;
  }
  if (typeof p.deleted === 'boolean') {
    normalized.deleted = p.deleted;
  }
  if (typeof p.titleManuallyEdited === 'boolean') {
    normalized.titleManuallyEdited = p.titleManuallyEdited;
  }
  
  return normalized;
}

/**
 * 规范化 TaggedPage（用于乐观更新等场景）
 * 
 * 接受 Partial<TaggedPage>，确保返回完整的 TaggedPage 对象
 * 与 normalizeTaggedPage(unknown) 不同，此函数假设输入已经是部分有效的 TaggedPage
 * 主要用于乐观更新、对象合并等场景
 * 
 * @param page - 部分 TaggedPage 对象
 * @returns 完整的 TaggedPage 对象，确保 tags 始终是数组
 */
export function normalizeTaggedPagePartial(page: Partial<TaggedPage>): TaggedPage {
  const now = Date.now();
  
  return {
    id: page.id ?? '',
    url: page.url ?? '',
    title: page.title ?? '',
    domain: page.domain ?? '',
    tags: Array.isArray(page.tags) ? page.tags : [], // 关键：确保 tags 始终是数组
    createdAt: page.createdAt ?? now,
    updatedAt: page.updatedAt ?? now,
    favicon: page.favicon,
    description: page.description,
    coverImage: page.coverImage,
    deleted: page.deleted ?? false,
    titleManuallyEdited: page.titleManuallyEdited,
  };
}

/**
 * 规范化 GameplayTag：修复格式问题，返回有效的 GameplayTag 或 null
 */
export function normalizeGameplayTag(tag: unknown): GameplayTag | null {
  if (!tag || typeof tag !== 'object') {
    logger.warn('normalizeGameplayTag: tag is not an object', { tag });
    return null;
  }

  const t = tag as Record<string, unknown>;
  
  // 必需字段检查和修复
  const id = typeof t.id === 'string' && t.id ? t.id : null;
  const name = typeof t.name === 'string' && t.name ? t.name : null;
  const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
  const updatedAt = typeof t.updatedAt === 'number' ? t.updatedAt : Date.now();
  
  // 如果缺少必需字段，返回 null
  if (!id || !name) {
    logger.warn('normalizeGameplayTag: missing required fields', { id, name, tag });
    return null;
  }
  
  // 修复 bindings 字段：确保是字符串数组
  let bindings: string[] = [];
  if (Array.isArray(t.bindings)) {
    bindings = t.bindings.filter((binding: unknown) => typeof binding === 'string') as string[];
  } else if (t.bindings !== undefined && t.bindings !== null) {
    // 如果不是数组但有值，记录警告并重置为空数组
    logger.warn('normalizeGameplayTag: bindings is not an array, resetting to empty array', { 
      tagId: id, 
      bindings: t.bindings 
    });
  }
  
  // 构建规范化后的标签对象
  const normalized: GameplayTag = {
    id,
    name,
    bindings,
    createdAt,
    updatedAt,
  };
  
  // 可选字段
  if (typeof t.description === 'string') {
    normalized.description = t.description;
  }
  if (typeof t.color === 'string') {
    normalized.color = t.color;
  }
  if (typeof t.deleted === 'boolean') {
    normalized.deleted = t.deleted;
  }
  
  return normalized;
}

/**
 * 规范化 TagsCollection：修复格式问题，返回有效的 TagsCollection
 */
export function normalizeTagsCollection(collection: unknown): TagsCollection {
  const normalized: TagsCollection = {};
  
  if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
    logger.warn('normalizeTagsCollection: invalid collection type', { collection });
    return normalized;
  }

  const coll = collection as Record<string, unknown>;
  
  // 规范化每个标签
  for (const key in coll) {
    const normalizedTag = normalizeGameplayTag(coll[key]);
    if (normalizedTag) {
      normalized[key] = normalizedTag;
    } else {
      logger.warn('normalizeTagsCollection: skipping invalid tag', { key, tag: coll[key] });
    }
  }
  
  return normalized;
}

/**
 * 规范化 PageCollection：修复格式问题，返回有效的 PageCollection
 */
export function normalizePageCollection(collection: unknown): PageCollection {
  const normalized: PageCollection = {};
  
  if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
    // 降级为 debug 级别，因为可能是正常的空数据或原子化存储场景
    logger.debug('normalizePageCollection: invalid collection type (may be empty or atomic storage)', { 
      collectionType: Array.isArray(collection) ? 'array' : typeof collection 
    });
    return normalized;
  }

  const coll = collection as Record<string, unknown>;
  
  // 收集所有无效页面的信息，批量报告
  const invalidPages: Array<{ key: string; reason: string }> = [];
  
  // 规范化每个页面
  for (const key in coll) {
    const pageValue = coll[key];
    
    // 跳过明显无效的值（null, undefined, 非对象）
    if (!pageValue || typeof pageValue !== 'object') {
      invalidPages.push({ key, reason: 'not an object' });
      continue;
    }
    
    const normalizedPage = normalizeTaggedPage(pageValue);
    if (normalizedPage) {
      normalized[key] = normalizedPage;
    } else {
      // 检查是否是缺少必需字段
      const p = pageValue as Record<string, unknown>;
      const hasId = typeof p.id === 'string' && p.id;
      const hasUrl = typeof p.url === 'string' && p.url;
      const reason = !hasId || !hasUrl ? 'missing required fields' : 'invalid format';
      invalidPages.push({ key, reason });
    }
  }
  
  // 批量报告无效页面（只在有无效页面时报告）
  if (invalidPages.length > 0) {
    // 降级为 debug 级别，因为数据已自动修复（无效页面被跳过）
    logger.debug('normalizePageCollection: skipped invalid pages', { 
      count: invalidPages.length,
      invalidPages: invalidPages.slice(0, 10) // 只报告前 10 个，避免日志过长
    });
  }
  
  return normalized;
}

