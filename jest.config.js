export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
    }],
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/*.test.[jt]s?(x)',
    '**/tests/**/*.spec.[jt]s?(x)', // 支持集成测试的 .spec.ts 文件
    '**/__tests__/**/*.spec.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/', // 排除 E2E 测试（由 Playwright 运行）
    '/tests/ct/', // 排除组件测试（由 Playwright CT 运行）
    '/tests/example.spec.ts', // 排除示例测试（由 Playwright 运行）
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    'src/services/logger.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // 提高核心业务逻辑的门槛
    'src/services/tagManager.ts': {
      branches: 85, // 从 70 提升
      functions: 90, // 从 80 提升
      lines: 90,     // 从 75 提升
      statements: 90, // 从 75 提升
    },
    // 新增对 pure logic 的覆盖要求
    'src/logic/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};

