import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaggingPage } from '../TaggingPage';
import { currentPageService } from '../../../services/popup/currentPageService';

jest.mock('../../../services/popup/currentPageService', () => ({
  currentPageService: {
    getCurrentPage: jest.fn(),
    getAllTags: jest.fn(),
    getUserStats: jest.fn(),
    createTagAndAddToPage: jest.fn(),
    removeTagFromPage: jest.fn(),
    updatePageTitle: jest.fn(),
  },
}));

const mockService = currentPageService as unknown as Record<string, jest.Mock>;

const initialPage = {
  id: 'page-1',
  url: 'https://example.com',
  title: 'Test Page',
  tags: ['tag-1'],
  favIconUrl: 'https://example.com/favicon.ico',
  domain: 'example.com',
};

const updatedPage = {
  ...initialPage,
  tags: ['tag-1', 'tag-2'],
};

const allTags = [
  { id: 'tag-1', name: 'React', color: '#fff' },
];

describe('TaggingPage component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockService.getCurrentPage
      .mockResolvedValueOnce(initialPage)
      .mockResolvedValue(updatedPage);

    mockService.getAllTags.mockResolvedValue(allTags);
    mockService.getUserStats.mockResolvedValue({ todayCount: 5, streak: 2 });
    mockService.createTagAndAddToPage.mockResolvedValue({ id: 'tag-2', name: 'New Tag', color: '#000' });
  });

  it('loads initial page data and displays stats', async () => {
    render(<TaggingPage />);

    expect(await screen.findByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Today:')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();

    expect(mockService.getCurrentPage).toHaveBeenCalledTimes(1);
    expect(mockService.getAllTags).toHaveBeenCalledTimes(1);
    expect(mockService.getUserStats).toHaveBeenCalledTimes(1);
  });

  it('creates a new tag and syncs with services', async () => {
    const user = userEvent.setup();

    render(<TaggingPage />);

    await screen.findByText('Test Page');

    const input = screen.getByRole('textbox');
    await user.type(input, 'New Tag');
    await user.type(input, '{enter}');

    await waitFor(() => {
      expect(mockService.createTagAndAddToPage).toHaveBeenCalledWith('New Tag', 'page-1');
    });

    await waitFor(() => {
      expect(screen.getByText('New Tag')).toBeInTheDocument();
    });

    expect(mockService.getCurrentPage).toHaveBeenCalledTimes(2);
    expect(mockService.getUserStats).toHaveBeenCalledTimes(2);
  });
});

