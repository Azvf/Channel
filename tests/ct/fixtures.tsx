import type { ReactElement } from 'react';
import { expect, test as base } from '@playwright/experimental-ct-react';
import { AppProvider } from '../../src/popup/context/AppContext';
import { setupStorybookMocks } from '../../src/popup/mocks/storybookMocks';
import '../../src/popup/globals.css';
import '../../src/popup/index.css';

setupStorybookMocks();

export const test = base.extend({
  mount: async ({ mount }, use) => {
    await use(async (component: ReactElement, options) => {
      return mount(<AppProvider>{component}</AppProvider>, options);
    });
  },
});

export { expect };

