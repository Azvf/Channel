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
   * 发送消息到 background，带超时处理
   */
  private async sendMessageWithTimeout<T>(
    message: any,
    timeoutMs: number = 10000
  ): Promise<MessageResponse<T>> {
    // 检查 chrome.runtime 是否可用
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      throw new Error('Chrome runtime API 不可用');
    }

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`消息超时（${timeoutMs}ms），Service Worker 可能未运行。请尝试重新加载扩展。`));
      }, timeoutMs);
    });

    // 发送消息 Promise
    const messagePromise = new Promise<MessageResponse<T>>((resolve, reject) => {
      let responded = false;
      
      // 设置一个安全网：如果回调在超时前没有被调用，我们也会 reject
      const safetyTimeout = setTimeout(() => {
        if (!responded) {
          responded = true;
          reject(new Error('消息回调未执行，Service Worker 可能未响应'));
        }
      }, timeoutMs + 100); // 比 timeoutPromise 稍晚一点

      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (responded) {
            // 如果已经响应过了（比如超时），忽略这个回调
            return;
          }
          responded = true;
          clearTimeout(safetyTimeout);

          // 检查 chrome.runtime.lastError（可能表示 Service Worker 未运行）
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || '未知错误';
            reject(new Error(`Service Worker 错误: ${errorMsg}`));
            return;
          }

          // 检查响应是否存在
          if (response === undefined || response === null) {
            reject(new Error('未收到 background 的响应（响应为 null/undefined），请检查 Service Worker 是否运行'));
            return;
          }

          // 验证响应格式（至少应该有 success 字段或 error 字段）
          if (typeof response !== 'object') {
            reject(new Error(`无效的响应格式: ${typeof response}`));
            return;
          }

          // 确保响应有 success 字段（如果没有，添加默认值）
          const normalizedResponse: MessageResponse<T> = {
            success: response.success !== undefined ? response.success : false,
            data: response.data,
            error: response.error
          };

          resolve(normalizedResponse);
        });
      } catch (error) {
        if (!responded) {
          responded = true;
          clearTimeout(safetyTimeout);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });

    // 使用 Promise.race 实现超时
    return Promise.race([messagePromise, timeoutPromise]);
  }

  /**
   * 获取当前页面信息（会自动注册页面）
   */
  async getCurrentPage(): Promise<TaggedPage> {
    try {
      const response = await this.sendMessageWithTimeout<TaggedPage>({ 
        action: 'getCurrentPage' 
      });
      
      // 防御性检查：确保 response 存在
      if (!response) {
        throw new Error('响应为空，无法获取当前页面');
      }

      // 检查响应格式
      if (response.success !== undefined && response.success && response.data) {
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
      const response = await this.sendMessageWithTimeout<GameplayTag[]>({ 
        action: 'getAllTags' 
      });
      
      // 防御性检查：确保 response 存在
      if (!response) {
        throw new Error('响应为空，无法获取标签');
      }

      // 检查响应格式
      if (response.success !== undefined && response.success && response.data) {
        return response.data;
      }
      
      // 如果失败，返回错误
      const errorMsg = response.error || '获取所有标签失败';
      throw new Error(errorMsg);
    } catch (error) {
      console.error('获取所有标签失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 创建标签并添加到当前页面
   */
  async createTagAndAddToPage(tagName: string, pageId: string): Promise<GameplayTag> {
    try {
      const response = await this.sendMessageWithTimeout<GameplayTag>({
        action: 'createTagAndAddToPage',
        data: { tagName, pageId }
      });
      
      if (!response) {
        throw new Error('响应为空，无法创建标签');
      }

      if (response.success !== undefined && response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || '创建标签并添加到页面失败');
    } catch (error) {
      console.error('创建标签并添加到页面失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 批量更新页面标签
   */
  async updatePageTags(
    pageId: string,
    payload: { tagsToAdd: string[]; tagsToRemove: string[] },
  ): Promise<{ newPage: TaggedPage; newStats: { todayCount: number; streak: number } }> {
    try {
      const response = await this.sendMessageWithTimeout<{
        newPage: TaggedPage;
        newStats: { todayCount: number; streak: number };
      }>({
        action: 'updatePageTags',
        data: {
          pageId,
          tagsToAdd: payload.tagsToAdd,
          tagsToRemove: payload.tagsToRemove,
        },
      });

      if (!response) {
        throw new Error('响应为空，无法更新页面标签');
      }

      if (response.success !== undefined && response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || '批量更新页面标签失败');
    } catch (error) {
      console.error('批量更新页面标签失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 从当前页面移除标签
   */
  async removeTagFromPage(pageId: string, tagId: string): Promise<void> {
    try {
      const response = await this.sendMessageWithTimeout({
        action: 'removeTagFromPage',
        data: { pageId, tagId }
      });
      
      if (!response) {
        throw new Error('响应为空，无法移除标签');
      }

      if (response.success === undefined || !response.success) {
        throw new Error(response.error || '从页面移除标签失败');
      }
    } catch (error) {
      console.error('从页面移除标签失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 获取所有已标记的页面
   */
  async getAllTaggedPages(): Promise<TaggedPage[]> {
    try {
      const response = await this.sendMessageWithTimeout<TaggedPage[]>({ 
        action: 'getAllTaggedPages' 
      });
      
      if (!response) {
        throw new Error('响应为空，无法获取已标记页面');
      }

      if (response.success !== undefined && response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || '获取所有已标记页面失败');
    } catch (error) {
      console.error('获取所有已标记页面失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 请求 Service Worker 导出所有数据
   */
  async exportData(): Promise<string> {
    try {
      const response = await this.sendMessageWithTimeout<string>({
        action: 'exportData'
      });

      if (!response) {
        throw new Error('响应为空，无法导出数据');
      }

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || '导出数据失败');
    } catch (error) {
      console.error('导出数据失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 请求 Service Worker 导入数据
   */
  async importData(
    jsonData: string,
    mergeMode: boolean
  ): Promise<{ tagsCount: number; pagesCount: number }> {
    try {
      const response = await this.sendMessageWithTimeout<{ tagsCount: number; pagesCount: number }>({
        action: 'importData',
        data: { jsonData, mergeMode }
      });

      if (!response) {
        throw new Error('响应为空，无法导入数据');
      }

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || '导入数据失败');
    } catch (error) {
      console.error('导入数据失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 更新页面标题
   */
  async updatePageTitle(pageId: string, title: string): Promise<void> {
    try {
      const response = await this.sendMessageWithTimeout({
        action: 'updatePageTitle',
        data: { pageId, title }
      });
      
      if (!response) {
        throw new Error('响应为空，无法更新页面标题');
      }

      if (response.success === undefined || !response.success) {
        throw new Error(response.error || '更新页面标题失败');
      }
    } catch (error) {
      console.error('更新页面标题失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }
  /**
   * 获取用户统计数据（今日标记数量与 streak）
   */
  async getUserStats(): Promise<{ todayCount: number; streak: number }> {
    try {
      const response = await this.sendMessageWithTimeout<{ todayCount: number; streak: number }>({
        action: 'getUserStats'
      });

      if (!response) {
        throw new Error('响应为空，无法获取用户统计');
      }

      if (response.success !== undefined && response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || '获取用户统计失败');
    } catch (error) {
      console.error('获取用户统计失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }
}

// 导出单例实例
export const currentPageService = new CurrentPageService();


