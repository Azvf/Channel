import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagManagementPage } from '../TagManagementPage';
import { currentPageService } from '../../../services/popup/currentPageService';
import { AppProvider } from '../../context/AppContext';

// 1. Mock 依赖
jest.mock('../../../services/popup/currentPageService');
const mockedPageService = currentPageService as jest.Mocked<typeof currentPageService>;

// 2. Mock 数据
const MOCK_TAGS = [
  { id: 't1', name: 'React', color: 'blue', createdAt: 1, updatedAt: 1, bindings: [] },
  { id: 't2', name: 'TypeScript', color: 'blue', createdAt: 1, updatedAt: 1, bindings: [] },
];

const MOCK_COUNTS = { t1: 5, t2: 0 };

describe('TagManagementPage (Integration)', () => {
  const user = userEvent.setup();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPageService.getAllTags.mockResolvedValue(MOCK_TAGS);
    mockedPageService.getAllTagUsageCounts.mockResolvedValue(MOCK_COUNTS);
    // Mock Portal 容器
    document.body.innerHTML = '<div id="root"></div>';
  });

  const renderComponent = () => {
    return render(
      <AppProvider>
        <TagManagementPage isOpen={true} onClose={onClose} />
      </AppProvider>
    );
  };

  it('应该加载并展示标签列表', async () => {
    renderComponent();
    
    expect(screen.getByText('Tag Library')).toBeInTheDocument();
    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
    
    // 验证使用计数
    expect(screen.getByText('5 uses')).toBeInTheDocument();
  });

  it('应该支持搜索过滤', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('React'));

    const searchInput = screen.getByPlaceholderText(/Search tags/i);
    await user.type(searchInput, 'Type');

    // React 应该消失，TypeScript 应该保留
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('应该支持创建新标签', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('React'));

    const searchInput = screen.getByPlaceholderText(/Search tags/i);
    // 输入一个不存在的标签名
    await user.type(searchInput, 'NewTag');

    // 应该出现创建按钮
    const createBtn = await screen.findByText(/\+ Create "NewTag"/);
    expect(createBtn).toBeInTheDocument();

    // Mock 创建 API
    mockedPageService.createTag.mockResolvedValue({ id: 't3', name: 'NewTag', createdAt: 1, updatedAt: 1, bindings: [] });
    
    // 点击创建
    await user.click(createBtn);

    expect(mockedPageService.createTag).toHaveBeenCalledWith('NewTag');
    // 创建后应该重新加载列表（可能被调用多次，因为 AppContext 也会刷新）
    expect(mockedPageService.getAllTags).toHaveBeenCalled();
  });

  it('应该支持右键菜单删除操作', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('TypeScript'));

    const tagRow = screen.getByText('TypeScript').closest('div[class*="group"]');
    expect(tagRow).not.toBeNull();

    // 1. 模拟右键点击 (ContextMenu)
    fireEvent.contextMenu(tagRow!);

    // 2. 菜单应该出现
    const deleteOption = await screen.findByText('删除');
    expect(deleteOption).toBeInTheDocument();

    // 3. 点击删除 -> 应该弹出确认框
    await user.click(deleteOption);
    const confirmBtn = await screen.findByRole('button', { name: '删除' }); // AlertModal 中的确认按钮
    
    // 4. 确认删除
    mockedPageService.deleteTag.mockResolvedValue(undefined);
    await user.click(confirmBtn);

    expect(mockedPageService.deleteTag).toHaveBeenCalledWith('t2');
    // 删除后应该重新加载列表（可能被调用多次，因为 AppContext 也会刷新）
    expect(mockedPageService.getAllTags).toHaveBeenCalled();
  });
});

