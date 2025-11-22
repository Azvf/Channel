// src/rpc/protocol.ts
// 协议层：定义类型契约和错误标准

import type { GameplayTag, TaggedPage } from '../../types/gameplayTag';

/**
 * 标准化 JSON-RPC 2.0 请求结构
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  args: any[];
  meta?: {
    timeout?: number; // 支持调用级超时配置
    traceId?: string; // 用于全链路追踪
  };
}

/**
 * 标准化 JSON-RPC 2.0 响应结构
 */
export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: string;
  result?: T;
  error?: RpcErrorShape;
}

/**
 * 结构化错误对象 (类似 gRPC Status)
 */
export interface RpcErrorShape {
  code: number;    // 错误码 (e.g., 404, 500)
  message: string; // 人类可读信息
  data?: any;      // 附加数据
  stack?: string;  // 仅在开发模式传递
}

/**
 * 错误码枚举
 */
export enum RpcErrorCode {
  TIMEOUT = -32000,
  HANDLER_NOT_FOUND = -32601,
  INTERNAL_ERROR = -32603,
  TRANSACTION_FAILED = -32001,
  // JSON-RPC 2.0 标准错误码
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
}

/**
 * 自定义 RPC 异常类
 */
export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

/**
 * 核心服务接口契约
 * 注意：所有返回值必须是 Promise，因为跨进程通信是异步的
 */
export interface IBackgroundApi {
  // Tag 相关
  getAllTags(): Promise<GameplayTag[]>;
  createTag(name: string, description?: string, color?: string): Promise<GameplayTag>;
  deleteTag(tagId: string): Promise<void>;
  updateTag(tagId: string, newName: string): Promise<void>;
  getAllTagUsageCounts(): Promise<Record<string, number>>;
  
  // Page 相关
  getCurrentPage(): Promise<TaggedPage>;
  getAllTaggedPages(): Promise<TaggedPage[]>;
  updatePageTitle(pageId: string, title: string): Promise<void>;
  updatePageTags(pageId: string, payload: { 
    tagsToAdd: string[]; 
    tagsToRemove: string[] 
  }): Promise<{ newPage: TaggedPage; newStats: { todayCount: number; streak: number } }>;
  updatePageDetails(pageId: string, payload: {
    title: string;
    tagsToAdd: string[];
    tagsToRemove: string[];
  }): Promise<void>;
  addTagToPage(pageId: string, tagId: string): Promise<void>;
  removeTagFromPage(pageId: string, tagId: string): Promise<void>;
  createTagAndAddToPage(tagName: string, pageId: string): Promise<GameplayTag>;
  
  // Stats 相关
  getUserStats(): Promise<{ todayCount: number; streak: number }>;
  
  // Data 相关
  exportData(): Promise<string>;
  importData(jsonData: string, mergeMode: boolean): Promise<{ tagsCount: number; pagesCount: number }>;
  
  // Tab 相关 (保留用于兼容)
  getTabInfo(tabId: number | undefined): Promise<{ title: string; url: string; id: number | undefined }>;
}

/**
 * RPC 客户端选项
 */
export type RpcClientOptions = {
  timeout?: number; // 默认超时时间 (ms)
};

