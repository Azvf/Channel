import type { Preview } from '@storybook/react';
import type { Decorator } from '@storybook/react';

import { AppProvider } from '../src/popup/context/AppContext';
import { setupStorybookMocks } from '../src/popup/mocks/storybookMocks';
import '../src/popup/index.css';

setupStorybookMocks();

const withAppProvider: Decorator = (Story: any, context: any) => {
  const content = (
    <div className="min-h-screen bg-[var(--c-bg)] p-6">
      <Story />
    </div>
  );

  if (context.title?.startsWith('Popup/TagInput')) {
    return content;
  }

  return (
    <AppProvider>
      {content}
    </AppProvider>
  );
};

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

