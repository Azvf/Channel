import { expect, test as base } from '@playwright/experimental-ct-react';
import { setProjectAnnotations } from '@storybook/react';
import preview from '../../.storybook/preview';
import { setupStorybookMocks } from '../../src/popup/mocks/storybookMocks';
import '../../src/popup/index.css';

setupStorybookMocks();
setProjectAnnotations(preview);

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', (msg) => {
      console.log('[browser]', msg.type(), msg.text());
    });
    await use(page);
  },
});
export { expect };

