import React from 'react';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../context/AppContext';
import { TaggedPage } from '../TaggedPage';
import { currentPageService } from '../../../services/popup/currentPageService';
import { QueryClientWrapper } from '../../../test/queryClientWrapper';

jest.mock('../TagInput', () => {
  const React = require('react');
  return {
    TagInput: ({ placeholder, onTagsChange }: { placeholder?: string; onTagsChange: (tags: string[]) => void }) => {
      const [value, setValue] = React.useState('');

      return (
        <input
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const trimmed = value.trim();
              onTagsChange(trimmed ? [trimmed] : []);
            }
          }}
          data-testid="tag-input"
        />
      );
    },
  };
});

jest.mock('../AnimatedFlipList', () => {
  const React = require('react');
  return {
    AnimatedFlipList: ({
      items,
      renderItem,
      as: Container = 'div',
      className,
    }: {
      items: Array<{ id: string | number }>;
      renderItem: (item: any) => React.ReactNode;
      as?: React.ElementType;
      className?: string;
    }) =>
      React.createElement(
        Container,
        { className },
        items.map((item) => (
          <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
        )),
      ),
  };
});

jest.mock('../../../services/popup/currentPageService');

const mockedPageService = currentPageService as jest.Mocked<typeof currentPageService>;

const MOCK_TAGS = [
  { id: 't-react', name: 'React', description: 'React tag', color: '#61dafb', createdAt: 1, updatedAt: 1, bindings: [] },
  { id: 't-vue', name: 'Vue', description: 'Vue tag', color: '#41b883', createdAt: 1, updatedAt: 1, bindings: [] },
];

const MOCK_PAGES = [
  {
    id: 'p-react',
    url: 'https://react.dev',
    title: 'React Guide',
    domain: 'react.dev',
    tags: ['t-react'],
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'p-vue',
    url: 'https://vuejs.org',
    title: 'Vue Tips',
    domain: 'vuejs.org',
    tags: ['t-vue'],
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'p-fullstack',
    url: 'https://fullstack.example',
    title: 'Fullstack Handbook',
    domain: 'fullstack.example',
    tags: ['t-react', 't-vue'],
    createdAt: 1,
    updatedAt: 1,
  },
];

const MOCK_STATS = { todayCount: 3, streak: 7 };

const defaultProps = {
  onOpenSettings: jest.fn(),
  onOpenStats: jest.fn(),
  onOpenTagLibrary: jest.fn(),
};

async function renderTaggedPage() {
  render(
    <QueryClientWrapper>
      <AppProvider>
        <TaggedPage {...defaultProps} />
      </AppProvider>
    </QueryClientWrapper>,
  );

  await waitFor(() => {
    expect(screen.getByText('React Guide')).toBeInTheDocument();
  });
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  // 确保 IntersectionObserver 在测试中可用
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class IntersectionObserver {
      constructor() {
        // no-op
      }
      observe() {
        // no-op
      }
      unobserve() {
        // no-op
      }
      disconnect() {
        // no-op
      }
      takeRecords() {
        return [];
      }
    } as any;
  }
});

beforeEach(() => {
  jest.clearAllMocks();

  mockedPageService.getAllTags.mockResolvedValue(MOCK_TAGS);
  mockedPageService.getAllTaggedPages.mockResolvedValue(MOCK_PAGES);
  mockedPageService.getUserStats.mockResolvedValue(MOCK_STATS);
  mockedPageService.updatePageDetails.mockResolvedValue(undefined);
});

describe('TaggedPage 集成测试', () => {
  it('可以根据 TagInput 的输入筛选页面列表', async () => {
    const user = userEvent.setup();

    await renderTaggedPage();

    const searchInput = screen.getByPlaceholderText('Enter tags to filter pages...');

    await act(async () => {
      await user.type(searchInput, 'React{enter}');
    });

    await waitFor(() => {
      expect(screen.getByText('React Guide')).toBeInTheDocument();
      expect(screen.getByText('Fullstack Handbook')).toBeInTheDocument();
      expect(screen.queryByText('Vue Tips')).not.toBeInTheDocument();
    });
  });

  it('可以打开编辑对话框并保存修改，触发服务调用与数据刷新', async () => {
    const user = userEvent.setup();

    await renderTaggedPage();

    const pageCard = await screen.findByTestId('page-card-p-react');
    const moreButton = within(pageCard).getByLabelText('更多操作');

    await act(async () => {
      await user.click(moreButton);
    });

    const editButton = await screen.findByText('Edit');

    await act(async () => {
      await user.click(editButton);
    });

    const titleInput = await screen.findByPlaceholderText('Enter page title');

    await act(async () => {
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated React Guide');
    });

    const saveButton = screen.getByRole('button', { name: /Save/i });

    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      expect(mockedPageService.updatePageDetails).toHaveBeenCalledWith('p-react', {
        title: 'Updated React Guide',
        tagsToAdd: [],
        tagsToRemove: [],
      });
    });

    await waitFor(() => {
      // 初始挂载：warmupBackground (1次 getAllTags) + loadAllData (1次 getAllTags, 1次 getAllTaggedPages, 1次 getUserStats) = 2次 getAllTags
      // 保存修改后：refreshAllData -> loadAllData (1次 getAllTags, 1次 getAllTaggedPages, 1次 getUserStats)
      // 总共：3次 getAllTags, 2次 getAllTaggedPages, 2次 getUserStats
      expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(3);
      expect(mockedPageService.getAllTaggedPages).toHaveBeenCalledTimes(2);
      expect(mockedPageService.getUserStats).toHaveBeenCalledTimes(2);
    });
  });
});


