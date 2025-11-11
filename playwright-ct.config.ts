import { defineConfig } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests/ct',
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
    server: {
      fs: {
        allow: [projectRoot, resolve(projectRoot, 'src')],
      },
    },
  },
});

