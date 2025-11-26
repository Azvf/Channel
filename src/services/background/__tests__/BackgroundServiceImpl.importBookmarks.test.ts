// src/services/background/__tests__/BackgroundServiceImpl.importBookmarks.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BackgroundServiceImpl } from '../BackgroundServiceImpl';
import { GameplayStore } from '../../gameplayStore';
import { testHelpers } from '../../../test/helpers';

// Mock chrome API
const mockChrome = {
  runtime: {
    id: 'test-extension-id',
  },
  bookmarks: {
    getTree: jest.fn(),
  },
};

(global as any).chrome = mockChrome;

// Mock syncService
jest.mock('../../syncService', () => ({
  syncService: {
    syncAll: jest.fn(() => Promise.resolve()),
    markPageChange: jest.fn(() => ({})),
    markTagChange: jest.fn(() => ({})),
  },
}));

// Mock triggerBackgroundSync
jest.mock('../../../shared/rpc-protocol/server', () => ({
  triggerBackgroundSync: jest.fn(),
}));

describe('BackgroundServiceImpl.importBookmarks', () => {
  let service: BackgroundServiceImpl;
  let store: GameplayStore;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    store = await testHelpers.initTagManager();
    service = new BackgroundServiceImpl();
    jest.clearAllMocks();
    
    // 确保chrome.runtime.id存在
    (global as any).chrome.runtime.id = 'test-extension-id';
    (global as any).chrome.bookmarks = {
      getTree: jest.fn(),
    };
  });

  afterEach(async () => {
    await testHelpers.clearAllData();
  });

  describe('权限和运行时检查', () => {
    it('应该在chrome.runtime.id不存在时抛出错误', async () => {
      (global as any).chrome.runtime.id = undefined;

      await expect(service.importBookmarks()).rejects.toThrow('扩展上下文无效');
    });

    it('应该在chrome.bookmarks不存在时抛出错误', async () => {
      (global as any).chrome.bookmarks = undefined;

      await expect(service.importBookmarks()).rejects.toThrow('书签权限未授予');
    });
  });

  describe('基本导入功能', () => {
    it('应该成功导入单个书签', async () => {
      // Chrome API返回的树结构：根节点数组，第一个元素是id为'0'的根节点
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '3',
                  title: 'GitHub',
                  url: 'https://github.com',
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(1);
      expect(result.tagsCreated).toBe(0);
      expect(result.tagsAdded).toBe(0);
      expect(result.errors).toHaveLength(0);

      // 验证页面已创建（使用getPageByUrl检查，因为页面可能还没有tag）
      const page = store.getPageByUrl('https://github.com');
      expect(page).toBeDefined();
      expect(page?.url).toBe('https://github.com');
      expect(page?.title).toBe('GitHub');
    });

    it('应该从文件夹路径创建tag', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: '项目',
                      children: [
                        {
                          id: '12',
                          title: 'GitHub',
                          url: 'https://github.com',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(1);
      expect(result.tagsCreated).toBe(2); // '工作' 和 '项目'
      expect(result.tagsAdded).toBe(2);
      expect(result.errors).toHaveLength(0);

      // 验证tag已创建
      const tags = store.getAllTags();
      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('工作');
      expect(tagNames).toContain('项目');

      // 验证页面已添加tag
      const page = store.getPageByUrl('https://github.com');
      expect(page).toBeDefined();
      const pageTags = page!.tags.map(tagId => {
        const tag = store.getTagById(tagId);
        return tag?.name;
      });
      expect(pageTags).toContain('工作');
      expect(pageTags).toContain('项目');
    });

    it('应该处理多层文件夹结构', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: '项目',
                      children: [
                        {
                          id: '12',
                          title: '前端',
                          children: [
                            {
                              id: '13',
                              title: 'React',
                              url: 'https://react.dev',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(1);
      expect(result.tagsCreated).toBe(3); // '工作', '项目', '前端'
      expect(result.tagsAdded).toBe(3);

      // 验证所有文件夹名都作为tag添加
      const page = store.getPageByUrl('https://react.dev');
      expect(page).toBeDefined();
      const pageTags = page!.tags.map(tagId => {
        const tag = store.getTagById(tagId);
        return tag?.name;
      });
      expect(pageTags).toContain('工作');
      expect(pageTags).toContain('项目');
      expect(pageTags).toContain('前端');
    });
  });

  describe('URL过滤', () => {
    it('应该过滤无效的URL协议', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '有效链接',
                  url: 'https://example.com',
                },
                {
                  id: '11',
                  title: 'JavaScript链接',
                  url: 'javascript:alert("test")',
                },
                {
                  id: '12',
                  title: 'Chrome链接',
                  url: 'chrome://settings',
                },
                {
                  id: '13',
                  title: 'About链接',
                  url: 'about:blank',
                },
                {
                  id: '14',
                  title: '文件链接',
                  url: 'file:///path/to/file',
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // 只应该处理有效的HTTP/HTTPS链接
      expect(result.pagesProcessed).toBe(1);
      
      const page = store.getPageByUrl('https://example.com');
      expect(page).toBeDefined();
      expect(page?.url).toBe('https://example.com');
    });

    it('应该处理空URL', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '无URL',
                  url: undefined,
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(0);
    });
  });

  describe('已存在的tag和页面处理', () => {
    it('应该重用已存在的tag', async () => {
      // 预先创建一个tag
      const existingTag = store.createTag('工作');

      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: 'GitHub',
                      url: 'https://github.com',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // 不应该创建新tag，应该重用已存在的
      expect(result.tagsCreated).toBe(0);
      expect(result.tagsAdded).toBe(1);

      // 验证tag数量没有增加
      const tags = store.getAllTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe(existingTag.id);
    });

    it('应该更新已存在的页面', async () => {
      // 预先创建一个页面
      const existingPage = store.createOrUpdatePage(
        'https://github.com',
        'GitHub Original',
        'github.com'
      );

      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: 'GitHub',
                      url: 'https://github.com',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(1);
      
      // 验证页面已更新（添加了tag）
      const updatedPage = store.getPageById(existingPage.id);
      expect(updatedPage).toBeDefined();
      expect(updatedPage?.id).toBe(existingPage.id);
      expect(updatedPage?.tags.length).toBeGreaterThan(0);
    });

    it('应该跳过页面已存在的tag', async () => {
      // 预先创建页面和tag，并建立关联
      const page = store.createOrUpdatePage(
        'https://github.com',
        'GitHub',
        'github.com'
      );
      const tag = store.createTag('工作');
      store.addTagToPage(page.id, tag.id);

      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: 'GitHub',
                      url: 'https://github.com',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // 页面已处理，但tag已存在，所以tagsAdded应该为0
      expect(result.pagesProcessed).toBe(1);
      expect(result.tagsCreated).toBe(0);
      expect(result.tagsAdded).toBe(0);

      // 验证页面tag数量没有变化
      const updatedPage = store.getPageById(page.id);
      expect(updatedPage?.tags).toHaveLength(1);
    });
  });

  describe('错误处理', () => {
    it('应该捕获并记录单个URL的处理错误，不中断整体流程', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '有效链接',
                  url: 'https://example.com',
                },
                {
                  id: '11',
                  title: '会出错的链接',
                  url: 'https://error.com',
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      // Mock createOrUpdatePage 在特定URL时抛出错误
      const originalCreateOrUpdatePage = store.createOrUpdatePage.bind(store);
      jest.spyOn(store, 'createOrUpdatePage').mockImplementation((url, title, domain) => {
        if (url === 'https://error.com') {
          throw new Error('Database error');
        }
        return originalCreateOrUpdatePage(url, title, domain);
      });

      const result = await service.importBookmarks();

      // 应该处理有效的URL，并记录错误
      expect(result.pagesProcessed).toBe(1); // 只处理了example.com
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].url).toBe('https://error.com');
      expect(result.errors[0].error).toContain('Database error');
    });

    it('应该在getTree失败时抛出错误', async () => {
      (global as any).chrome.bookmarks.getTree.mockRejectedValue(
        new Error('Bookmarks API error')
      );

      await expect(service.importBookmarks()).rejects.toThrow('导入书签失败');
    });
  });

  describe('边界情况', () => {
    it('应该处理空书签树', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(0);
      expect(result.tagsCreated).toBe(0);
      expect(result.tagsAdded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('应该跳过根节点（Bookmarks Bar, Other Bookmarks）', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: 'GitHub',
                  url: 'https://github.com',
                },
              ],
            },
            {
              id: '2',
              title: 'Other Bookmarks',
              children: [
                {
                  id: '20',
                  title: 'Google',
                  url: 'https://google.com',
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // 应该处理子节点，但不将根节点作为tag
      expect(result.pagesProcessed).toBe(2);
      expect(result.tagsCreated).toBe(0); // 根节点不应该作为tag
    });

    it('应该处理空文件夹名', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '', // 空文件夹名
                  children: [
                    {
                      id: '11',
                      title: 'GitHub',
                      url: 'https://github.com',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // 空文件夹名不应该创建tag
      expect(result.pagesProcessed).toBe(1);
      expect(result.tagsCreated).toBe(0);
      expect(result.tagsAdded).toBe(0);
    });

    it('应该处理多个书签共享相同文件夹', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: 'GitHub',
                      url: 'https://github.com',
                    },
                    {
                      id: '12',
                      title: 'Google',
                      url: 'https://google.com',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // 应该只创建一个tag（'工作'），但添加到两个页面
      expect(result.pagesProcessed).toBe(2);
      expect(result.tagsCreated).toBe(1);
      expect(result.tagsAdded).toBe(2); // 两个页面都添加了'工作' tag

      // 验证两个页面都有'工作' tag
      const githubPage = store.getPageByUrl('https://github.com');
      const googlePage = store.getPageByUrl('https://google.com');
      expect(githubPage).toBeDefined();
      expect(googlePage).toBeDefined();
      
      const workTag = store.findTagByName('工作');
      expect(workTag).toBeDefined();
      
      expect(githubPage!.tags).toContain(workTag!.id);
      expect(googlePage!.tags).toContain(workTag!.id);
    });
  });

  describe('统计信息准确性', () => {
    it('应该准确统计创建的tag数量（避免重复计数）', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: '工作',
                  children: [
                    {
                      id: '11',
                      title: '项目',
                      children: [
                        {
                          id: '12',
                          title: 'GitHub',
                          url: 'https://github.com',
                        },
                        {
                          id: '13',
                          title: 'Google',
                          url: 'https://google.com',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      // '工作'和'项目'各创建一次，即使添加到多个页面
      expect(result.tagsCreated).toBe(2);
      expect(result.tagsAdded).toBe(4); // 2个页面 × 2个tag = 4次添加
    });

    it('应该准确统计处理的页面数量', async () => {
      const bookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks Bar',
              children: [
                {
                  id: '10',
                  title: 'GitHub',
                  url: 'https://github.com',
                },
                {
                  id: '11',
                  title: 'Google',
                  url: 'https://google.com',
                },
                {
                  id: '12',
                  title: 'Stack Overflow',
                  url: 'https://stackoverflow.com',
                },
              ],
            },
          ],
        },
      ];

      (global as any).chrome.bookmarks.getTree.mockResolvedValue(bookmarkTree);

      const result = await service.importBookmarks();

      expect(result.pagesProcessed).toBe(3);
      expect(result.errors).toHaveLength(0);
    });
  });
});

