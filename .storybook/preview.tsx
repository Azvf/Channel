import type { Preview } from '@storybook/react';
import type { Decorator } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppProvider } from '../src/popup/context/AppContext';
import { setupStorybookMocks } from '../src/popup/mocks/storybookMocks';
import '../src/popup/index.css';

setupStorybookMocks();

// 为 Storybook 创建独立的 QueryClient 实例
const storybookQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Storybook 中不重试，快速失败
      gcTime: 0, // Storybook 中立即回收，避免内存泄漏
    },
    mutations: {
      retry: false,
    },
  },
});

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
    <QueryClientProvider client={storybookQueryClient}>
      <AppProvider>
        {content}
      </AppProvider>
    </QueryClientProvider>
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

