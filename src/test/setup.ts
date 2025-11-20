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
});

