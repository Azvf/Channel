import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Modal 注册表条目
 */
export interface ModalEntry {
  /** 唯一标识符 */
  id: string;
  /** 关闭回调函数 */
  onClose: () => void;
  /** 可选优先级（数字越大优先级越高，默认按注册顺序） */
  priority?: number;
}

/**
 * Modal Registry 状态
 */
interface ModalRegistryState {
  /** 当前打开的 Modal 栈（LIFO 顺序，栈顶在数组末尾） */
  stack: ModalEntry[];
  /** 注册 Modal */
  register: (entry: ModalEntry) => void;
  /** 注销 Modal */
  unregister: (id: string) => void;
  /** 获取栈顶 Modal（最顶层） */
  getTopmost: () => ModalEntry | null;
  /** 检查是否有 Modal 打开 */
  hasAnyOpen: () => boolean;
  /** 关闭栈顶 Modal */
  closeTopmost: () => void;
}

const ModalRegistryContext = createContext<ModalRegistryState | undefined>(undefined);

/**
 * Modal Registry Provider Props
 */
interface ModalRegistryProviderProps {
  children: ReactNode;
}

/**
 * Modal Registry Provider
 * 
 * 管理所有 Modal 的注册表，使用栈结构维护打开顺序（LIFO）
 * 用于实现窗口层级的 ESC 键处理
 */
export function ModalRegistryProvider({ children }: ModalRegistryProviderProps) {
  const [stack, setStack] = useState<ModalEntry[]>([]);
  const stackRef = useRef<ModalEntry[]>([]);
  
  // 保持 ref 与 state 同步
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  /**
   * 注册 Modal
   */
  const register = useCallback((entry: ModalEntry) => {
    setStack((prevStack) => {
      // 检查是否已存在（防止重复注册）
      if (prevStack.some((e) => e.id === entry.id)) {
        console.warn(`[ModalRegistry] Modal ${entry.id} is already registered`);
        return prevStack;
      }
      
      // 如果有优先级，按优先级排序；否则追加到栈顶
      const newStack = [...prevStack];
      if (entry.priority !== undefined) {
        // 按优先级插入到合适位置
        const entryPriority = entry.priority; // 提取到局部变量，帮助 TypeScript 类型推断
        const insertIndex = newStack.findIndex((e) => 
          (e.priority ?? 0) < entryPriority
        );
        if (insertIndex === -1) {
          newStack.push(entry);
        } else {
          newStack.splice(insertIndex, 0, entry);
        }
      } else {
        newStack.push(entry);
      }
      
      return newStack;
    });
  }, []);

  /**
   * 注销 Modal
   */
  const unregister = useCallback((id: string) => {
    setStack((prevStack) => prevStack.filter((e) => e.id !== id));
  }, []);

  /**
   * 获取栈顶 Modal（最顶层）
   */
  const getTopmost = useCallback((): ModalEntry | null => {
    const currentStack = stackRef.current;
    return currentStack.length > 0 ? currentStack[currentStack.length - 1] : null;
  }, []);

  /**
   * 检查是否有 Modal 打开
   */
  const hasAnyOpen = useCallback((): boolean => {
    return stackRef.current.length > 0;
  }, []);

  /**
   * 关闭栈顶 Modal
   */
  const closeTopmost = useCallback(() => {
    const topmost = getTopmost();
    if (topmost) {
      topmost.onClose();
    }
  }, [getTopmost]);

  const value: ModalRegistryState = {
    stack,
    register,
    unregister,
    getTopmost,
    hasAnyOpen,
    closeTopmost,
  };

  return (
    <ModalRegistryContext.Provider value={value}>
      {children}
    </ModalRegistryContext.Provider>
  );
}

/**
 * Hook: 使用 Modal Registry
 * 
 * 供 Modal 组件使用，用于注册/注销自己
 */
export function useModalRegistry() {
  const context = useContext(ModalRegistryContext);
  if (!context) {
    throw new Error('useModalRegistry must be used within ModalRegistryProvider');
  }
  return context;
}

/**
 * Hook: 使用 Modal Stack
 * 
 * 供 App 层级使用，用于获取当前打开的 Modal 栈和执行关闭操作
 */
export function useModalStack() {
  const context = useContext(ModalRegistryContext);
  if (!context) {
    throw new Error('useModalStack must be used within ModalRegistryProvider');
  }
  
  return {
    stack: context.stack,
    hasAnyOpen: context.hasAnyOpen,
    closeTopmost: context.closeTopmost,
    getTopmost: context.getTopmost,
  };
}

