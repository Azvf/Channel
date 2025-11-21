/**
 * useOptimisticMutation Hook 测试
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimisticMutation } from '../useOptimisticMutation';

describe('useOptimisticMutation', () => {
  it('应该执行乐观更新并在成功时保持状态', async () => {
    const onMutate = jest.fn((_value: string) => ({ previous: 'old' }));
    const mutationFn = jest.fn((_value: string) => Promise.resolve('success'));
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticMutation({
        mutationFn,
        onMutate,
        onSuccess,
        onError,
        onSettled,
      })
    );

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      const promise = result.current.mutate('new');
      await promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onMutate).toHaveBeenCalledWith('new');
    expect(mutationFn).toHaveBeenCalledWith('new');
    expect(onSuccess).toHaveBeenCalledWith('success', 'new', { previous: 'old' });
    expect(onSettled).toHaveBeenCalledWith('success', null, 'new', { previous: 'old' });
    expect(onError).not.toHaveBeenCalled();
  });

  it('应该在失败时回滚乐观更新', async () => {
    const error = new Error('Test error');
    const onMutate = jest.fn((_value: string) => ({ previous: 'old' }));
    const mutationFn = jest.fn((_value: string) => Promise.reject(error));
    const onError = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticMutation({
        mutationFn,
        onMutate,
        onError,
        onSettled,
      })
    );

    await act(async () => {
      try {
        await result.current.mutate('new');
      } catch (e) {
        // 预期会抛出错误
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onMutate).toHaveBeenCalledWith('new');
    expect(mutationFn).toHaveBeenCalledWith('new');
    expect(onError).toHaveBeenCalledWith(error, 'new', { previous: 'old' });
    expect(onSettled).toHaveBeenCalledWith(undefined, error, 'new', { previous: 'old' });
    expect(result.current.error).toBe(error);
  });

  it('应该支持取消操作', async () => {
    const onMutate = jest.fn((_value: string) => ({ previous: 'old' }));
    const mutationFn = jest.fn(
      (_value: string) =>
        new Promise<string>(() => {
          // 永不 resolve，用于测试取消
        })
    );
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticMutation({
        mutationFn,
        onMutate,
        onError,
      })
    );

    act(() => {
      result.current.mutate('new').catch(() => {
        // 预期会抛出错误
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    act(() => {
      result.current.cancel();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 取消时应该调用 onError
    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cancelled' }),
      'new',
      { previous: 'old' }
    );
  });

  it('应该支持重置状态', () => {
    const { result } = renderHook(() =>
      useOptimisticMutation({
        mutationFn: () => Promise.resolve('success'),
        onMutate: () => ({}),
      })
    );

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});

