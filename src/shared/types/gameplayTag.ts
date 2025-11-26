// GameplayTag 系统类型定义
export interface GameplayTag {
  id: string;
  name: string; // 允许包含空格
  description?: string;
  color?: string; // 标签颜色
  createdAt: number;
  updatedAt: number;
  // 绑定关系：存储与本标签绑定的其他标签ID（双向绑定由管理器保证）
  bindings: string[];
  deleted?: boolean; // 标记是否已删除（用于同步）
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
  deleted?: boolean; // 标记是否已删除（用于同步）
  titleManuallyEdited?: boolean; // 标记标题是否被用户手动编辑过
}

export interface TagsCollection {
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
