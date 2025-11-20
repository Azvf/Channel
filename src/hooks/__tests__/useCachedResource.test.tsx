import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCachedResource } from '../useCachedResource';
import { cacheService } from '../../services/cacheService';

// Mock cacheService
jest.mock('../../services/cacheService', () => {
  const memoryCache = new Map();
  const storageCache = new Map();
  
  return {
    cacheService: {
      getMemoryCache: jest.fn((key: string) => {
        return memoryCache.get(key);
      }),
      set: jest.fn(async (key: string, data: any) => {
        memoryCache.set(key, { data, timestamp: Date.now() });
        storageCache.set(key, { data, timestamp: Date.now() });
      }),
      storageService: {
        get: jest.fn(async (key: string) => {
          return storageCache.get(key) || null;
        }),
        set: jest.fn(async (key: string, value: any) => {
          storageCache.set(key, value);
        }),
      },
    },
  };
});

describe('useCachedResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 清空内存缓存
    (cacheService.getMemoryCache as jest.Mock).mockReturnValue(undefined);
    (cacheService.set as jest.Mock).mockImplementation(async () => {});
  });

  it('应该在首次加载时返回 loading 状态', async () => {
    const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('New Data');
    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher
    }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.data).toBe('New Data');
    });
    
    // 使用 act 确保状态更新完成
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('应该优先返回内存缓存 (Stale-While-Revalidate)', async () => {
    // 模拟内存中有旧数据
    const staleData = { data: 'Stale Data', timestamp: Date.now() };
    (cacheService.getMemoryCache as jest.Mock).mockReturnValue(staleData);

    const fetcher = jest.fn<() => Promise<string>>().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('Fresh Data'), 100))
    );

    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher
    }));

    // 立即返回旧数据，且不在 loading 状态
    expect(result.current.data).toBe('Stale Data');
    expect(result.current.isLoading).toBe(false);
    // 但应该处于 refreshing 状态
    expect(result.current.isRefreshing).toBe(true);

    // 等待更新
    await waitFor(() => expect(result.current.data).toBe('Fresh Data'));
    expect(result.current.isRefreshing).toBe(false);
  });

  it('应该处理获取失败的情况', async () => {
    const error = new Error('Network error');
    const fetcher = jest.fn<() => Promise<string>>().mockRejectedValue(error);
    const onError = jest.fn();

    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher,
      onError
    }));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    
    // 使用 act 确保状态更新完成
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('应该支持 refresh 方法强制刷新', async () => {
    const fetcher = jest.fn<() => Promise<string>>()
      .mockResolvedValueOnce('Initial Data')
      .mockResolvedValueOnce('Refreshed Data');

    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher
    }));

    await waitFor(() => expect(result.current.data).toBe('Initial Data'));

    // 调用 refresh
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.data).toBe('Refreshed Data'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('应该支持 mutate 方法乐观更新', async () => {
    const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('Server Data');
    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher
    }));

    await waitFor(() => expect(result.current.data).toBe('Server Data'));

    // 使用 mutate 乐观更新
    act(() => {
      result.current.mutate('Optimistic Data');
    });

    expect(result.current.data).toBe('Optimistic Data');
    expect(cacheService.set).toHaveBeenCalledWith('test-key', 'Optimistic Data');
  });

  it('应该支持 enabled 选项禁用自动获取', async () => {
    const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('Data');
    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher,
      enabled: false
    }));

    // 应该不会调用 fetcher
    await waitFor(() => {
      expect(fetcher).not.toHaveBeenCalled();
    });

    expect(result.current.data).toBeNull();
  });

  it('应该支持 initialData', () => {
    const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('Server Data');
    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher,
      initialData: 'Initial Data'
    }));

    // 应该立即返回初始数据
    expect(result.current.data).toBe('Initial Data');
  });

  it('应该支持 onSuccess 回调', async () => {
    const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('Success Data');
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher,
      onSuccess
    }));

    await waitFor(() => expect(result.current.data).toBe('Success Data'));
    expect(onSuccess).toHaveBeenCalledWith('Success Data');
  });

  it('应该从存储缓存恢复数据（当内存缓存不存在时）', async () => {
    // 模拟内存缓存不存在，但存储缓存存在
    (cacheService.getMemoryCache as jest.Mock).mockReturnValue(undefined);
    (cacheService.storageService.get as jest.Mock<() => Promise<any>>).mockResolvedValue({
      data: 'Stored Data',
      timestamp: Date.now()
    });

    // 让 fetcher 延迟执行，确保存储缓存恢复先完成
    const fetcher = jest.fn<() => Promise<string>>().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('Fresh Data'), 50))
    );
    const { result } = renderHook(() => useCachedResource({
      key: 'test-key',
      fetcher
    }));

    // 应该从存储恢复数据
    await waitFor(() => {
      expect(result.current.data).toBe('Stored Data');
    });

    // 然后应该刷新为新数据
    await waitFor(() => {
      expect(result.current.data).toBe('Fresh Data');
    }, { timeout: 2000 });
  });
});

