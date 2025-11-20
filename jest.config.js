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
    // [调整] 务实标准：核心业务逻辑允许少量边缘情况未覆盖
    'src/services/tagManager.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // [调整] 务实标准：纯逻辑层
    'src/logic/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // [新增] 锁定 App 初始化逻辑的质量
    'src/services/appInitService.ts': {
      branches: 80,
      functions: 90,
      lines: 80,
      statements: 80,
    },
    // [新增] 锁定核心 Hook 的质量
    'src/hooks/useCachedResource.ts': {
      branches: 65, // 当前 68.96%，留一点余地
      functions: 90,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};

