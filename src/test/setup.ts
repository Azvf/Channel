import '@testing-library/jest-dom';

// Mock chrome extension APIs
global.chrome = {
  storage: {
    local: {
      // --- 修改为返回 Promise ---
      get: jest.fn((_keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
      // --- 结束 ---
    },
    sync: {
      // --- 修改为返回 Promise ---
      get: jest.fn((_keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      // --- 结束 ---
    },
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
    lastError: undefined, // 确保 lastError 为 undefined
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

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

