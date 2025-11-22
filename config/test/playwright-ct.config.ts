import { defineConfig } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '../../tests/components',
  fullyParallel: true,
  reporter: process.env.CI ? 'dot' : [['list'], ['html', { outputFolder: 'playwright-report-ct' }]],
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  use: {
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  ctPort: 3100,
  ctViteConfig: {
    plugins: [react()],
    resolve: {
      alias: {
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
        allow: [projectRoot, resolve(projectRoot, 'src')],
      },
    },
  },
});

