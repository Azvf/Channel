import { expect, test as base } from '@playwright/experimental-ct-react';
import { setProjectAnnotations } from '@storybook/react';
import preview from '../../.storybook/preview';
import { setupStorybookMocks } from '../../src/popup/mocks/storybookMocks';
import '../../src/popup/index.css';

setupStorybookMocks();
setProjectAnnotations(preview);

export const test = base.extend({
  page: async ({ page }, use) => {
    // 在测试环境中设置全局变量，用于抑制预期的警告
    await page.addInitScript(() => {
      (window as any).__IS_TEST_ENV__ = true;
    });

    page.on('console', (msg) => {
      const text = msg.text();
      // 过滤掉测试环境中预期的 StorageService 警告
      if (text.includes('[StorageService] chrome.storage') && 
          text.includes('not available, falling back to localStorage')) {
        return; // 不输出这个警告
      }
      console.log('[browser]', msg.type(), text);
    });
    await use(page);
  },
});
export { expect };

