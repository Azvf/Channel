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
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

