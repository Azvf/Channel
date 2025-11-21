/**
 * CurrentPageService - 当前页面服务
 * 封装所有与当前页面相关的底层操作，提供统一的接口给 UI 层使用
 * 
 * [重构] 使用 RPC 客户端替代原有的消息传递机制
 */

import { createRpcClient } from '../../rpc/client';
import { IBackgroundApi } from '../../rpc/protocol';

// 创建全类型安全的客户端
const backgroundApi = createRpcClient<IBackgroundApi>();

/**
 * CurrentPageService 类
 * 保留原有接口以保持向后兼容，但底层使用 RPC 客户端
 */
class CurrentPageService {
  /**
   * 获取当前页面信息（会自动注册页面）
   */
  async getCurrentPage() {
    return backgroundApi.getCurrentPage();
  }

  /**
   * 获取所有标签
   */
  async getAllTags() {
    return backgroundApi.getAllTags();
  }

  /**
   * 更新标签名称
   */
  async updateTag(tagId: string, newName: string): Promise<void> {
    return backgroundApi.updateTag(tagId, newName);
  }

  /**
   * 删除一个标签
   */
  async deleteTag(tagId: string): Promise<void> {
    return backgroundApi.deleteTag(tagId);
  }

  /**
   * 获取所有标签的使用计数
   */
  async getAllTagUsageCounts(): Promise<Record<string, number>> {
    return backgroundApi.getAllTagUsageCounts();
  }

  /**
   * 仅创建新标签
   */
  async createTag(tagName: string) {
    return backgroundApi.createTag(tagName);
  }

  /**
   * 创建标签并添加到当前页面
   */
  async createTagAndAddToPage(tagName: string, pageId: string) {
    return backgroundApi.createTagAndAddToPage(tagName, pageId);
  }

  /**
   * 事务性更新页面标题和标签
   */
  async updatePageDetails(
    pageId: string,
    details: { title: string; tagsToAdd: string[]; tagsToRemove: string[] },
  ): Promise<void> {
    return backgroundApi.updatePageDetails(pageId, details);
  }

  /**
   * 批量更新页面标签
   */
  async updatePageTags(
    pageId: string,
    payload: { tagsToAdd: string[]; tagsToRemove: string[] },
  ) {
    return backgroundApi.updatePageTags(pageId, payload);
  }

  /**
   * 从当前页面移除标签
   */
  async removeTagFromPage(pageId: string, tagId: string): Promise<void> {
    return backgroundApi.removeTagFromPage(pageId, tagId);
  }

  /**
   * 获取所有已标记的页面
   */
  async getAllTaggedPages() {
    return backgroundApi.getAllTaggedPages();
  }

  /**
   * 请求 Service Worker 导出所有数据
   */
  async exportData(): Promise<string> {
    return backgroundApi.exportData();
  }

  /**
   * 请求 Service Worker 导入数据
   */
  async importData(
    jsonData: string,
    mergeMode: boolean
  ): Promise<{ tagsCount: number; pagesCount: number }> {
    return backgroundApi.importData(jsonData, mergeMode);
  }

  /**
   * 更新页面标题
   */
  async updatePageTitle(pageId: string, title: string): Promise<void> {
    return backgroundApi.updatePageTitle(pageId, title);
      }

  /**
   * 获取用户统计数据（今日标记数量与 streak）
   */
  async getUserStats(): Promise<{ todayCount: number; streak: number }> {
    return backgroundApi.getUserStats();
  }
}

// 导出单例实例
export const currentPageService = new CurrentPageService();

// 也导出 RPC 客户端，供直接使用（推荐）
export { backgroundApi };
