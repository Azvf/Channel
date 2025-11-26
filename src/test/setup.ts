import '@testing-library/jest-dom';
import { beforeEach } from '@jest/globals';
import dotenv from 'dotenv';
import { resolve } from 'path';

// 临时禁用 console.log 以屏蔽 dotenv 的提示消息
const originalConsoleLog = console.log;
console.log = jest.fn();

// 加载 .env.development 文件中的环境变量
// 这样测试可以使用真实的 dev Supabase 数据库
dotenv.config({ path: resolve(process.cwd(), '.env.development') });

// 恢复 console.log
console.log = originalConsoleLog;

// Polyfill fetch API for Jest/Node.js environment
// Jest/jsdom 环境缺少 fetch API，Supabase 客户端需要它来发送 HTTP 请求
if (typeof globalThis.fetch === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeFetch = require('node-fetch');
    globalThis.fetch = nodeFetch.default || nodeFetch;
    if (nodeFetch.Headers && typeof globalThis.Headers === 'undefined') {
      globalThis.Headers = nodeFetch.Headers;
    }
    if (nodeFetch.Request && typeof globalThis.Request === 'undefined') {
      globalThis.Request = nodeFetch.Request;
    }
    if (nodeFetch.Response && typeof globalThis.Response === 'undefined') {
      globalThis.Response = nodeFetch.Response;
    }
  } catch (e: any) {
    console.error('[test/setup] ❌ fetch API polyfill 加载失败:', e?.message || e);
    console.error('[test/setup] 解决方案: npm install --save-dev node-fetch@2');
  }
}

// 将环境变量设置到 process.env（Jest 环境使用 process.env）
// 注意：Jest 环境中没有 import.meta.env，supabase.ts 会从 process.env 读取

// 创建内存存储来模拟 chrome.storage，使其能够持久化数据
const createMockStorage = () => {
  const storage: Record<string, any> = {};
  
  return {
    get: jest.fn((keys: string | string[] | null): Promise<Record<string, any>> => {
      if (keys === null) {
        // 获取所有键
        return Promise.resolve({ ...storage });
      }
      
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, any> = {};
      
      for (const key of keysArray) {
        if (key in storage) {
          result[key] = storage[key];
        }
      }
      
      return Promise.resolve(result);
    }),
    
    set: jest.fn((items: Record<string, any>): Promise<void> => {
      Object.assign(storage, items);
      return Promise.resolve();
    }),
    
    remove: jest.fn((keys: string | string[]): Promise<void> => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      for (const key of keysArray) {
        delete storage[key];
      }
      return Promise.resolve();
    }),
    
    clear: jest.fn((): Promise<void> => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
  };
};

const mockLocalStorage = createMockStorage();
const mockSyncStorage = createMockStorage();

// Mock chrome extension APIs
global.chrome = {
  storage: {
    local: mockLocalStorage,
    sync: mockSyncStorage,
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([{
      id: 1,
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/favicon.ico',
    }])),
    get: jest.fn(() => Promise.resolve({
      id: 1,
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/favicon.ico',
    })),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false),
    },
    onActivated: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false),
    },
  },
  runtime: {
    onInstalled: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn(),
      hasListener: jest.fn(() => true), // 添加这个
    },
    sendMessage: jest.fn((message: any, callback?: (response: any) => void) => {
      const handler = (global as any).__CHROME_SEND_MESSAGE_HANDLER__;
      if (handler) {
        handler(message, callback);
      } else if (typeof callback === 'function') {
        setTimeout(() => {
          callback((global as any).__MOCK_CHROME_RESPONSE__);
        }, 0);
      }
      return true;
    }),
    lastError: undefined, // 确保 lastError 为 undefined
  },
  notifications: {
    create: jest.fn((_options: any, callback?: (notificationId: string) => void) => {
      const notificationId = 'mock-notification-id';
      if (callback) {
        callback(notificationId);
      }
      return notificationId;
    }),
  },
  scripting: {
    executeScript: jest.fn(() => Promise.resolve([{ result: null }])),
  },
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// requestAnimationFrame / cancelAnimationFrame polyfill
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: (time: number) => void): number =>
    setTimeout(() => callback(performance.now()), 0) as unknown as number;
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (handle: number): void => clearTimeout(handle);
}

// scrollIntoView stub to prevent errors in jsdom
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = jest.fn();
}

// Mock console methods to reduce noise in tests
// 但是在使用真实数据库的测试中，我们需要看到错误信息
// 所以只 mock warn，保留 error 和 log 的输出
const USE_REAL_SUPABASE = process.env.USE_REAL_SUPABASE === 'true';

global.console = {
  ...console,
  warn: USE_REAL_SUPABASE ? console.warn : jest.fn(),
  // error 和 log 保持原样，以便在真实数据库测试中看到详细错误信息
  error: USE_REAL_SUPABASE ? console.error : jest.fn(),
  log: USE_REAL_SUPABASE ? console.log : console.log, // 总是输出 log
};

// Mock import.meta.env for Jest
// Note: This is a workaround for Jest not supporting import.meta
// The actual mocking is done via __mocks__ directory for supabase.ts
// Files that import supabase.ts should mock it using jest.mock() before importing

// ✅ 修复：Mock ResizeObserver（JSDOM 不支持 ResizeObserver）
global.ResizeObserver = class ResizeObserver {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
} as any;

// ✅ 修复：Mock IntersectionObserver（JSDOM 不支持 IntersectionObserver）
global.IntersectionObserver = class IntersectionObserver {
  private callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

  constructor(
    callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
    _options?: { root?: Element | null; rootMargin?: string; threshold?: number | number[] }
  ) {
    this.callback = callback;
  }

  observe(target: Element) {
    // 在测试环境中，立即触发回调，模拟元素已进入视口
    // 使用 setTimeout 确保在下一个事件循环中执行，避免同步问题
    setTimeout(() => {
      const entry: IntersectionObserverEntry = {
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: target.getBoundingClientRect(),
        rootBounds: null,
        intersectionRect: target.getBoundingClientRect(),
        time: Date.now(),
      } as IntersectionObserverEntry;
      this.callback([entry], this as any);
    }, 0);
  }

  unobserve() {
    // no-op
  }

  disconnect() {
    // no-op
  }

  takeRecords() {
    return [];
  }
} as any;

// ✅ 修复：Mock DOMRect（JSDOM 不支持 DOMRect）
// 为 Element.prototype.getBoundingClientRect 提供 mock
if (!global.DOMRect) {
  global.DOMRect = class DOMRect {
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    top = 0;
    right = 0;
    bottom = 0;
    left = 0;
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.left = x;
      this.right = x + width;
      this.bottom = y + height;
    }
    static fromRect(other?: { x?: number; y?: number; width?: number; height?: number }) {
      return new DOMRect(other?.x, other?.y, other?.width, other?.height);
    }
    toJSON() {
      return JSON.stringify(this);
    }
  } as any;
}

// ✅ 修复：Mock window.scrollTo（JSDOM 不支持 scrollTo）
if (!window.scrollTo) {
  window.scrollTo = jest.fn();
}

// ✅ 修复：为 Element.prototype.getBoundingClientRect 提供 mock
// 确保返回有效的 DOMRect 对象
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  const rect = originalGetBoundingClientRect.call(this);
  // 如果原始方法返回无效值，返回默认的 DOMRect
  if (!rect || rect.width === undefined) {
    return new DOMRect(0, 0, 0, 0);
  }
  return rect;
};

// ✅ 修复：Mock framer-motion 以避免测试中的动画问题
// 在测试环境中，动画会立即完成，避免 pointer-events 等问题
// 注意：这个 mock 需要在模块加载之前执行，所以放在 setup.ts 中
// 如果测试文件中需要更具体的 mock，可以在测试文件中覆盖
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props: any, ref: any) => {
        const { children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest } = props;
        return React.createElement('div', { ref, ...rest }, children);
      }),
      button: React.forwardRef((props: any, ref: any) => {
        const { children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest } = props;
        return React.createElement('button', { ref, ...rest }, children);
      }),
      ul: React.forwardRef((props: any, ref: any) => {
        const { children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest } = props;
        return React.createElement('ul', { ref, ...rest }, children);
      }),
      li: React.forwardRef((props: any, ref: any) => {
        const { children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest } = props;
        return React.createElement('li', { ref, ...rest }, children);
      }),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn(),
    }),
    useMotionValue: (initial: any) => ({ get: () => initial, set: jest.fn() }),
    useTransform: (value: any, transform: any) => ({ get: () => transform(value?.get?.() || value) }),
  };
});

// ✅ 修复：全局 Mock TimeService，避免测试中调用真实的 Supabase RPC
// 测试环境不需要真正的时间校准，直接使用本地时间
jest.mock('../services/timeService', () => {
  return {
    timeService: {
      calibrate: jest.fn(() => Promise.resolve()),
      now: jest.fn(() => Date.now()),
      get isCalibrated() { return true; },
      getOffset: jest.fn(() => 0),
      reset: jest.fn(),
    },
  };
});

// ✅ 修复：全局 beforeEach 自动清理 Storage Mock，防止测试间状态污染
// 确保每个测试用例都拥有干净的 Storage 环境
beforeEach(async () => {
  // 清理模拟的 local 和 sync storage
  await mockLocalStorage.clear();
  await mockSyncStorage.clear();
  
  // 清理 jsdom 的 localStorage
  localStorage.clear();
  
  // 清除所有 mocks 的调用记录
  jest.clearAllMocks();
  
  // 重置 timeService mock
  const { timeService } = require('../services/timeService');
  (timeService.calibrate as jest.Mock).mockResolvedValue(undefined);
  (timeService.now as jest.Mock).mockReturnValue(Date.now());
  (timeService.getOffset as jest.Mock).mockReturnValue(0);
  (timeService.reset as jest.Mock).mockImplementation(() => {});
});

