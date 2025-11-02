/**
 * CurrentPageService - 当前页面服务
 * 封装所有与当前页面相关的底层操作，提供统一的接口给 UI 层使用
 */

import { TaggedPage, GameplayTag } from '../../types/gameplayTag';

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class CurrentPageService {
  /**
   * 获取当前页面信息（会自动注册页面）
   */
  async getCurrentPage(): Promise<TaggedPage> {
    try {
      // 检查 chrome.runtime 是否可用
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Chrome runtime API 不可用');
      }

      const response = await chrome.runtime.sendMessage({ 
        action: 'getCurrentPage' 
      }) as MessageResponse<TaggedPage> | undefined;
      
      // 检查响应是否存在
      if (!response) {
        throw new Error('未收到 background 的响应，请检查 Service Worker 是否运行');
      }
      
      // 检查响应格式
      if (response.success && response.data) {
        return response.data;
      }
      
      // 检查是否有错误信息
      const errorMsg = response.error || '获取当前页面失败';
      console.error('获取当前页面失败:', errorMsg, response);
      throw new Error(errorMsg);
    } catch (error) {
      console.error('获取当前页面失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<GameplayTag[]> {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'getAllTags' 
      }) as MessageResponse<GameplayTag[]>;
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || '获取所有标签失败');
    } catch (error) {
      console.error('获取所有标签失败:', error);
      throw error;
    }
  }

  /**
   * 创建标签并添加到当前页面
   */
  async createTagAndAddToPage(tagName: string, pageId: string): Promise<GameplayTag> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createTagAndAddToPage',
        data: { tagName, pageId }
      }) as MessageResponse<GameplayTag>;
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || '创建标签并添加到页面失败');
    } catch (error) {
      console.error('创建标签并添加到页面失败:', error);
      throw error;
    }
  }

  /**
   * 从当前页面移除标签
   */
  async removeTagFromPage(pageId: string, tagId: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'removeTagFromPage',
        data: { pageId, tagId }
      }) as MessageResponse;
      
      if (!response.success) {
        throw new Error(response.error || '从页面移除标签失败');
      }
    } catch (error) {
      console.error('从页面移除标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有已标记的页面
   */
  async getAllTaggedPages(): Promise<TaggedPage[]> {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'getAllTaggedPages' 
      }) as MessageResponse<TaggedPage[]>;
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || '获取所有已标记页面失败');
    } catch (error) {
      console.error('获取所有已标记页面失败:', error);
      throw error;
    }
  }

  /**
   * 更新页面标题
   */
  async updatePageTitle(pageId: string, title: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updatePageTitle',
        data: { pageId, title }
      }) as MessageResponse;
      
      if (!response.success) {
        throw new Error(response.error || '更新页面标题失败');
      }
    } catch (error) {
      console.error('更新页面标题失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const currentPageService = new CurrentPageService();

