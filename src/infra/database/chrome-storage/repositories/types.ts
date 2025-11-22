/**
 * Repository 模式接口定义
 * 提供统一的数据访问抽象层，屏蔽底层存储实现
 */

import { GameplayTag, TaggedPage } from '../../../../shared/types/gameplayTag';

/**
 * 通用 Repository 接口
 * @template T 实体类型，必须包含 id 字段
 */
export interface IRepository<T extends { id: string }> {
  /**
   * 获取所有实体
   */
  getAll(): Promise<T[]>;

  /**
   * 根据 ID 获取实体
   */
  getById(id: string): Promise<T | null>;

  /**
   * 保存实体（创建或更新）
   */
  save(item: T): Promise<void>;

  /**
   * 删除实体
   */
  delete(id: string): Promise<void>;

  /**
   * 批量保存实体
   */
  saveBatch(items: T[]): Promise<void>;
}

/**
 * 标签 Repository 接口
 * 扩展通用接口，添加标签特定的查询方法
 */
export interface ITagRepository extends IRepository<GameplayTag> {
  /**
   * 根据名称查找标签（忽略大小写）
   */
  findByName(name: string): Promise<GameplayTag | null>;

  /**
   * 根据颜色查找标签
   */
  findByColor(color: string): Promise<GameplayTag[]>;
}

/**
 * 页面 Repository 接口
 * 扩展通用接口，添加页面特定的查询方法
 */
export interface IPageRepository extends IRepository<TaggedPage> {
  /**
   * 根据 URL 查找页面
   */
  findByUrl(url: string): Promise<TaggedPage | null>;
}

