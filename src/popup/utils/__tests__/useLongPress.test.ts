import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '../useLongPress';

jest.useFakeTimers();

describe('useLongPress', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('fires onLongPress after delay', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    const handlers = result.current;

    act(() => {
      handlers.onMouseDown({ button: 0, currentTarget: {} } as any);
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('fires onClick when mouse is released before delay', () => {
    const onLongPress = jest.fn();
    const onClick = jest.fn();
    const event = { button: 0, currentTarget: {} } as any;

    const { result } = renderHook(() => useLongPress({ onLongPress, onClick, delay: 800 }));

    const handlers = result.current;

    act(() => {
      handlers.onMouseDown(event);
      jest.advanceTimersByTime(200);
      handlers.onMouseUp(event);
    });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

