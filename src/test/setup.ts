import '@testing-library/jest-dom';

// Mock chrome extension APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn((_keys, callback) => callback({})),
      set: jest.fn((_items, callback) => callback?.()),
      remove: jest.fn((_keys, callback) => callback?.()),
      clear: jest.fn((callback) => callback?.()),
    },
    sync: {
      get: jest.fn((_keys, callback) => callback({})),
      set: jest.fn((_items, callback) => callback?.()),
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
    },
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

