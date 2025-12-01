import { renderHook, act } from '@testing-library/react';
import { useProgressiveEscape } from '../useProgressiveEscape';
import { useState } from 'react';

describe('useProgressiveEscape', () => {
  it('应按优先级顺序触发动作', () => {
    const action1 = jest.fn();
    const action2 = jest.fn();
    
    const { result } = renderHook(() => {
      const [level1Active, setLevel1Active] = useState(true);
      
      const handler = useProgressiveEscape([
        { id: 'l1', predicate: () => level1Active, action: action1 },
        { id: 'l2', predicate: () => true, action: action2 },
      ], { global: false });
      
      return { handler, setLevel1Active };
    });

    // 第一次按 ESC：Level 1 激活，应触发 action1
    const escEvent = { key: 'Escape', preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
    
    act(() => {
      if (result.current.handler) {
        result.current.handler(escEvent);
      }
    });
    
    expect(action1).toHaveBeenCalled();
    expect(action2).not.toHaveBeenCalled();
    expect(escEvent.preventDefault).toHaveBeenCalled();
    
    // 重置 Mock
    jest.clearAllMocks();
    
    // 禁用 Level 1
    act(() => {
      result.current.setLevel1Active(false);
    });
    
    // 第二次按 ESC：Level 1 不激活，应触发 action2
    act(() => {
      if (result.current.handler) {
        result.current.handler(escEvent);
      }
    });
    
    expect(action1).not.toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
  });
});

