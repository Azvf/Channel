import type { Preview } from 'storybook';
import type { Decorator } from 'storybook/react';

import { AppProvider } from '../src/popup/context/AppContext';
import { setupStorybookMocks } from '../src/popup/mocks/storybookMocks';
import '../src/popup/globals.css';
import '../src/popup/index.css';

setupStorybookMocks();

const withAppProvider: Decorator = (Story) => (
  <AppProvider>
    <div className="min-h-screen bg-[var(--c-bg)] p-6">
      <Story />
    </div>
  </AppProvider>
);

const preview: Preview = {
  decorators: [withAppProvider],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;