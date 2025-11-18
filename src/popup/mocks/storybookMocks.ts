import type { GameplayTag, TaggedPage } from '../../types/gameplayTag';
import { currentPageService } from '../../services/popup/currentPageService';

const defaultTags: GameplayTag[] = [
  {
    id: 'tag-react',
    name: 'React',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    bindings: [],
    color: '#61dafb',
    description: 'React 组件与生态',
  },
  {
    id: 'tag-type',
    name: 'TypeScript',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    bindings: [],
    color: '#3178c6',
    description: '类型系统与最佳实践',
  },
  {
    id: 'tag-ui',
    name: 'UI/UX',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    bindings: [],
    color: '#f472b6',
    description: '界面与交互设计',
  },
];

const defaultPages: TaggedPage[] = [
  {
    id: 'page-1',
    url: 'https://example.com/react-patterns',
    title: 'React 架构模式精粹',
    domain: 'example.com',
    tags: ['tag-react', 'tag-type'],
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 30,
    description: '整理常见 React 架构模式与优缺点',
    favicon: 'https://example.com/favicon.ico',
  },
  {
    id: 'page-2',
    url: 'https://design.dev/future-of-ui',
    title: '前沿 UI 交互趋势',
    domain: 'design.dev',
    tags: ['tag-ui'],
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 4,
    description: '探索 2025 年值得关注的交互模式',
    favicon: 'https://design.dev/favicon.ico',
  },
  {
    id: 'page-3',
    url: 'https://engineering.blog/typescript-perf',
    title: 'TypeScript 性能优化指南',
    domain: 'engineering.blog',
    tags: ['tag-type'],
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
    description: '提升大型项目类型检查速度的技巧',
    favicon: 'https://engineering.blog/favicon.ico',
  },
];

const defaultStats = {
  todayCount: 3,
  streak: 9,
};

let initialized = false;

export function setupStorybookMocks() {
  if (initialized) {
    return;
  }

  initialized = true;

  // 提供最小的 chrome API mock，防止服务层抛错
  if (typeof globalThis.chrome === 'undefined') {
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: () => {},
        lastError: undefined,
      } as unknown as typeof chrome.runtime,
      storage: {
        local: {
          get: (_keys: any, callback: (items: any) => void) => callback({}),
          set: (_items: any, callback?: () => void) => callback?.(),
        },
      } as unknown as typeof chrome.storage,
    };
  }

  Object.assign(currentPageService, {
    getAllTags: async () => defaultTags,
    getAllTaggedPages: async () => defaultPages,
    getUserStats: async () => defaultStats,
    updatePageDetails: async () => {},
    deleteTaggedPage: async () => {},
    addTagToPage: async () => {},
    removeTagFromPage: async () => {},
    exportData: async () => JSON.stringify({ tags: defaultTags, pages: defaultPages }),
    importData: async () => ({ tagsCount: defaultTags.length, pagesCount: defaultPages.length }),
  });
}

export function setMockPages(pages: TaggedPage[]) {
  Object.assign(currentPageService, {
    getAllTaggedPages: async () => pages,
  });
}

export function setMockTags(tags: GameplayTag[]) {
  Object.assign(currentPageService, {
    getAllTags: async () => tags,
  });
}

