import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../context/AppContext';
import { TaggingPage } from '../TaggingPage';
import { currentPageService } from '../../../services/popup/currentPageService';
import { cacheService } from '../../../services/cacheService';

jest.mock('../../../services/popup/currentPageService');

const mockedPageService = currentPageService as jest.Mocked<typeof currentPageService>;

const MOCK_TAGS = [
  { id: 't1', name: 'React', description: 'Library', color: '#61dafb', createdAt: 1, updatedAt: 1, bindings: [] },
];

const MOCK_STATS = { todayCount: 5, streak: 10 };
const MOCK_PAGE = {
  id: 'p1',
  url: 'https://example.com',
  title: 'Test Page',
  domain: 'example.com',
  tags: ['t1'],
  createdAt: 1,
  updatedAt: 1,
};

const UPDATED_MOCK_PAGE = {
  ...MOCK_PAGE,
  tags: ['t1', 't2'],
};

const renderPage = async () => {
  render(
    <AppProvider>
      <TaggingPage />
    </AppProvider>,
  );

  await waitFor(() => {
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });
};

describe('TaggingPage (with Context)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // 清除单例缓存，确保每个测试都是冷启动
    // 防止 useCachedResource 从内存缓存中读取旧数据，导致测试间状态污染
    await cacheService.clear();

    mockedPageService.getAllTags.mockResolvedValue(MOCK_TAGS);
    mockedPageService.getAllTaggedPages.mockResolvedValue([]);
    mockedPageService.getUserStats.mockResolvedValue(MOCK_STATS);
    mockedPageService.getCurrentPage.mockResolvedValue(MOCK_PAGE);
  });

  it('should render data from both Context and its own fetch', async () => {
    await renderPage();

    expect(screen.getByText('10 days')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Test Page')).toBeInTheDocument();

    expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(1);
    expect(mockedPageService.getCurrentPage).toHaveBeenCalledTimes(1);
  });

  it('should call updatePageTags and refreshAllData when adding a tag', async () => {
    const user = userEvent.setup();
    mockedPageService.updatePageTags.mockResolvedValue({
      newPage: UPDATED_MOCK_PAGE,
      newStats: MOCK_STATS,
    });

    await renderPage();

    expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(1);

    // 使用 'combobox' 角色，因为 TagInput 现在符合 WAI-ARIA 标准
    const input = screen.getByRole('combobox');
    await act(async () => {
      await user.type(input, 'New Tag{enter}');
    });

    await waitFor(() => {
      expect(mockedPageService.updatePageTags).toHaveBeenCalledWith('p1', {
        tagsToAdd: ['New Tag'],
        tagsToRemove: [],
      });
    });

    await waitFor(() => {
      expect(mockedPageService.getAllTags).toHaveBeenCalledTimes(2);
      expect(mockedPageService.getAllTaggedPages).toHaveBeenCalledTimes(2);
      expect(mockedPageService.getUserStats).toHaveBeenCalledTimes(2);
    });
  });
});

