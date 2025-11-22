import { renderHook, act, waitFor } from '@testing-library/react';
import { usePageSettings } from '../usePageSettings';
import { storageService, STORAGE_KEYS } from '../../../services/storageService';
import { DEFAULT_PAGE_SETTINGS } from '../../../shared/types/pageSettings';

jest.mock('../../../services/storageService', () => {
  const actual = jest.requireActual('../../../services/storageService');
  return {
    ...actual,
    storageService: {
      get: jest.fn(),
      set: jest.fn(),
    },
  };
});

const mockedStorage = storageService as unknown as {
  get: jest.Mock;
  set: jest.Mock;
};

describe('usePageSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.get.mockImplementation(async () => DEFAULT_PAGE_SETTINGS);
    mockedStorage.set.mockImplementation(async () => undefined);
  });

  it('loads settings from storage on mount', async () => {
    mockedStorage.get.mockImplementationOnce(async () => ({ syncVideoTimestamp: false }));

    const { result } = renderHook(() => usePageSettings());

    await waitFor(() => {
      expect(mockedStorage.get).toHaveBeenCalledWith(STORAGE_KEYS.PAGE_SETTINGS);
      expect(result.current.settings.syncVideoTimestamp).toBe(false);
    });
  });

  it('updates syncVideoTimestamp and persists to storage', async () => {
    const { result } = renderHook(() => usePageSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.updateSyncVideoTimestamp).toBe('function');

    await act(async () => {
      result.current.updateSyncVideoTimestamp(true);
    });

    await waitFor(() => expect(mockedStorage.set).toHaveBeenCalledTimes(1));
    expect(result.current.settings.syncVideoTimestamp).toBe(true);
    expect(mockedStorage.set).toHaveBeenCalledWith(STORAGE_KEYS.PAGE_SETTINGS, {
      ...DEFAULT_PAGE_SETTINGS,
      syncVideoTimestamp: true,
    });
  });

  it('refresh reloads settings from storage', async () => {
    mockedStorage.get
      .mockImplementationOnce(async () => ({ syncVideoTimestamp: false }))
      .mockImplementationOnce(async () => ({ syncVideoTimestamp: true }));

    const { result } = renderHook(() => usePageSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refresh).toBe('function');

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockedStorage.get).toHaveBeenCalledTimes(2));
    expect(result.current.settings.syncVideoTimestamp).toBe(true);
  });

  it('使用默认设置回退当 storage 返回 null', async () => {
    mockedStorage.get.mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePageSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings).toEqual(DEFAULT_PAGE_SETTINGS);
  });

  it('使用默认设置回退当 storage 返回非法数据', async () => {
    mockedStorage.get.mockResolvedValueOnce({ syncVideoTimestamp: 'invalid' });

    const { result } = renderHook(() => usePageSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings).toEqual(DEFAULT_PAGE_SETTINGS);
  });

  it('在更新失败时设置 error 并回滚到存储值', async () => {
    const persistError = new Error('persist failed');
    mockedStorage.set.mockRejectedValueOnce(persistError);

    const { result } = renderHook(() => usePageSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.updateSyncVideoTimestamp(false)).rejects.toThrow('persist failed');

    expect(mockedStorage.get).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('persist failed');
    expect(result.current.settings).toEqual(DEFAULT_PAGE_SETTINGS);
  });
});

