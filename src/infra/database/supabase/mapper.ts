// ==========================================
// Database Mapper - 防腐层 (Anti-Corruption Layer)
// ==========================================
// 
// 职责：将数据库物理形态（snake_case）转换为领域模型（camelCase）
// 
// 架构原则：
// 1. UI 层严禁直接依赖 database.types.ts
// 2. 所有数据库查询结果必须经过 Mapper 转换
// 3. 所有写入操作必须使用 toDB* 函数转换
// 
// ==========================================

import type { Database } from '@/shared/types/database.types';
import type { GameplayTag, TaggedPage } from '@/shared/types/gameplayTag';
import { timeService } from '@/services/timeService';

// ==========================================
// Tags 映射
// ==========================================

type TagRow = Database['public']['Tables']['tags']['Row'];
type TagInsert = Database['public']['Tables']['tags']['Insert'];
type TagUpdate = Database['public']['Tables']['tags']['Update'];

/**
 * 将数据库行转换为领域模型
 * 
 * @param row - 数据库原始行数据
 * @returns 领域模型 GameplayTag
 */
export const toDomainTag = (row: TagRow): GameplayTag => {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    bindings: row.bindings ?? [],
    createdAt: row.created_at ?? timeService.now(),
    updatedAt: row.updated_at ?? timeService.now(),
    deleted: row.deleted ?? false,
  };
};

/**
 * 将领域模型转换为数据库插入格式
 * 
 * @param tag - 领域模型 GameplayTag
 * @param userId - 用户 ID
 * @returns 数据库插入格式
 */
export const toDBTag = (tag: GameplayTag, userId: string): TagInsert => {
  return {
    id: tag.id,
    user_id: userId,
    name: tag.name,
    description: tag.description ?? null,
    color: tag.color ?? null,
    bindings: tag.bindings ?? [],
    created_at: tag.createdAt,
    updated_at: tag.updatedAt,
    deleted: tag.deleted ?? false,
  };
};

/**
 * 将领域模型转换为数据库更新格式
 * 
 * @param tag - 领域模型 GameplayTag
 * @returns 数据库更新格式
 */
export const toDBTagUpdate = (tag: Partial<GameplayTag>): TagUpdate => {
  const update: TagUpdate = {};
  
  if (tag.name !== undefined) update.name = tag.name;
  if (tag.description !== undefined) update.description = tag.description ?? null;
  if (tag.color !== undefined) update.color = tag.color ?? null;
  if (tag.bindings !== undefined) update.bindings = tag.bindings;
  if (tag.createdAt !== undefined) update.created_at = tag.createdAt;
  if (tag.updatedAt !== undefined) update.updated_at = tag.updatedAt;
  if (tag.deleted !== undefined) update.deleted = tag.deleted;
  
  return update;
};

// ==========================================
// Pages 映射
// ==========================================

type PageRow = Database['public']['Tables']['pages']['Row'];
type PageInsert = Database['public']['Tables']['pages']['Insert'];
type PageUpdate = Database['public']['Tables']['pages']['Update'];

/**
 * 将数据库行转换为领域模型
 * 
 * @param row - 数据库原始行数据
 * @returns 领域模型 TaggedPage
 */
export const toDomainPage = (row: PageRow): TaggedPage => {
  // domain 在数据库中可能是 null，但领域模型要求非空字符串
  // 如果为 null，尝试从 URL 提取域名，否则使用空字符串
  let domain = row.domain ?? '';
  if (!domain && row.url) {
    try {
      const urlObj = new URL(row.url);
      domain = urlObj.hostname;
    } catch {
      domain = '';
    }
  }
  
  // title 在数据库中可能是 null，但领域模型要求非空字符串
  // 如果为 null，尝试从 URL 提取标题，否则使用空字符串
  let title = row.title ?? '';
  if (!title && row.url) {
    try {
      const urlObj = new URL(row.url);
      title = urlObj.hostname;
    } catch {
      title = '';
    }
  }
  
  return {
    id: row.id,
    url: row.url,
    title,
    domain,
    tags: row.tags ?? [],
    createdAt: row.created_at ?? timeService.now(),
    updatedAt: row.updated_at ?? timeService.now(),
    favicon: row.favicon ?? undefined,
    description: row.description ?? undefined,
    deleted: row.deleted ?? false,
  };
};

/**
 * 将领域模型转换为数据库插入格式
 * 
 * @param page - 领域模型 TaggedPage
 * @param userId - 用户 ID
 * @returns 数据库插入格式
 */
export const toDBPage = (page: TaggedPage, userId: string): PageInsert => {
  return {
    id: page.id,
    user_id: userId,
    url: page.url,
    title: page.title,
    domain: page.domain,
    tags: page.tags ?? [],
    created_at: page.createdAt,
    updated_at: page.updatedAt,
    favicon: page.favicon ?? null,
    description: page.description ?? null,
    deleted: page.deleted ?? false,
  };
};

/**
 * 将领域模型转换为数据库更新格式
 * 
 * @param page - 领域模型 TaggedPage
 * @returns 数据库更新格式
 */
export const toDBPageUpdate = (page: Partial<TaggedPage>): PageUpdate => {
  const update: PageUpdate = {};
  
  if (page.url !== undefined) update.url = page.url;
  if (page.title !== undefined) update.title = page.title;
  if (page.domain !== undefined) update.domain = page.domain;
  if (page.tags !== undefined) update.tags = page.tags;
  if (page.createdAt !== undefined) update.created_at = page.createdAt;
  if (page.updatedAt !== undefined) update.updated_at = page.updatedAt;
  if (page.favicon !== undefined) update.favicon = page.favicon ?? null;
  if (page.description !== undefined) update.description = page.description ?? null;
  if (page.deleted !== undefined) update.deleted = page.deleted;
  
  return update;
};

