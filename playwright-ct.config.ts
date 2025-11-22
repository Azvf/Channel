// playwright-ct.config.ts (项目根目录)
// Playwright Component Testing 配置文件
// 遵循最佳实践：配置文件与 playwright/ 目录同级，确保路径解析上下文正确

import { defineConfig } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// 现在直接指向当前目录即可（项目根目录）
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // 路径从 ../../tests/components 改为 ./tests/components
  testDir: './tests/components',
  
  fullyParallel: true,
  reporter: process.env.CI ? 'dot' : [['list'], ['html', { outputFolder: 'playwright-report-ct' }]],
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  
  use: {
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ctPort: 3100,
  },
  
  ctViteConfig: {
    plugins: [react()],
    resolve: {
      alias: {
        // 这里的 resolve 逻辑变得更简单直接
        '@': resolve(projectRoot, 'src'),
      },
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
    server: {
      fs: {
        // 允许 Vite 访问根目录
        allow: [projectRoot],
      },
    },
  },
});

