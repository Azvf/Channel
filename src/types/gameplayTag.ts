// GameplayTag 系统类型定义
export interface GameplayTag {
  id: string;
  name: string;
  fullName: string; // 完整路径，如 "Technology.Frontend.JavaScript"
  parent?: string; // 父标签ID
  children: string[]; // 子标签ID列表
  description?: string;
  color?: string; // 标签颜色
  createdAt: number;
  updatedAt: number;
}

export interface TaggedPage {
  id: string;
  url: string;
  title: string;
  domain: string;
  tags: string[]; // 标签ID列表
  createdAt: number;
  updatedAt: number;
  favicon?: string;
  description?: string;
}

export interface TagHierarchy {
  [tagId: string]: GameplayTag;
}

export interface PageCollection {
  [pageId: string]: TaggedPage;
}

// 标签操作类型
export type TagOperation = 'add' | 'remove' | 'create' | 'delete' | 'update';

// 消息类型
export interface TagMessage {
  action: 'addTagToPage' | 'removeTagFromPage' | 'getTaggedPages' | 'createTag' | 'getAllTags' | 'getPageInfo';
  data?: any;
}

export interface TagResponse {
  success: boolean;
  data?: any;
  error?: string;
}
