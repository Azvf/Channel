module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
    webextensions: true,
  },
  extends: ['eslint:recommended', 'plugin:storybook/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  globals: {
    chrome: 'readonly',
    React: 'readonly',
    NodeJS: 'readonly',
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-cond-assign': ['error', 'except-parens'],
    'no-control-regex': 'off',
    // 注意：自定义规则暂时禁用，需要正确配置 ESLint 插件格式
    // TODO: 修复自定义 ESLint 插件配置
    // 'gameplaytag/no-raw-z-index': 'error',
    // 'gameplaytag/require-optimistic-update': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
    },
    {
      files: ['**/*.stories.tsx', '**/*.stories.ts'],
      rules: {
        // 允许从 @storybook/react 导入类型
        'storybook/no-renderer-packages': 'off',
      },
    },
  ],
};

