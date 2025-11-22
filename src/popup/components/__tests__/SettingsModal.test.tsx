import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from '../SettingsModal';
import { currentPageService } from '../../../services/popup/currentPageService';
import { QueryClientWrapper } from '../../../test/queryClientWrapper';

// Mock supabase before any imports
jest.mock('../../../infra/database/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: null },
        unsubscribe: jest.fn(),
      })),
    },
  },
}));

jest.mock('../../../services/popup/currentPageService');
const mockedService = currentPageService as jest.Mocked<typeof currentPageService>;

describe('SettingsModal (Integration)', () => {
  const user = userEvent.setup();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('导出数据流程', async () => {
    // Mock URL.createObjectURL (JSDOM 不支持)
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
    
    mockedService.exportData.mockResolvedValue(JSON.stringify({ test: 'data' }));

    render(
      <QueryClientWrapper>
        <SettingsModal isOpen={true} onClose={onClose} initialTheme="light" />
      </QueryClientWrapper>
    );

    const exportBtn = screen.getByText('Export Data...');
    await user.click(exportBtn);

    expect(mockedService.exportData).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('导入数据流程', async () => {
    // Mock File.text() 方法，因为 JSDOM 不支持
    const mockFileText = jest.fn().mockResolvedValue('{"tags":{}}');
    global.File = class extends File {
      text() {
        return mockFileText();
      }
    } as any;

    render(
      <QueryClientWrapper>
        <SettingsModal isOpen={true} onClose={onClose} initialTheme="light" />
      </QueryClientWrapper>
    );

    const file = new File(['{"tags":{}}'], 'backup.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // 模拟文件选择
    await user.upload(input, file);

    // 等待文件读取完成
    await waitFor(() => {
      expect(mockFileText).toHaveBeenCalled();
    });

    // 应该弹出确认对话框
    expect(await screen.findByText(/选择导入模式/)).toBeInTheDocument();
    
    // 选择合并模式
    const mergeBtn = screen.getByRole('button', { name: /合并/ });
    mockedService.importData.mockResolvedValue({ tagsCount: 1, pagesCount: 1 });
    
    await user.click(mergeBtn);

    expect(mockedService.importData).toHaveBeenCalledWith(expect.any(String), true);
    expect(await screen.findByText(/成功导入/)).toBeInTheDocument();
  });
});

