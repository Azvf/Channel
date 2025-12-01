import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { statsWallManager } from '../../../services/StatsWallManager';
import { CalendarLayoutInfo } from '../../../shared/types/statsWall';
import { RENDER_TICK } from '../../../design-tokens/animation'; // [Refactor] 使用统一的渲染周期常量
import type { StatsWallUpdateEvent } from '../../../shared/rpc-protocol/events';
import { backgroundApi } from '../../../services/popup/currentPageService';
import { storageService, STORAGE_KEYS } from '../../../services/storageService';

export interface DayData {
  id: string;
  date: Date;
  level: 0 | 1 | 2 | 3;
  items: number;
  dateString: string;
}

export interface MonthLabel {
  label: string;
  colStart: number;
}

/**
 * 将 CalendarLayoutInfo 转换为组件内部使用的格式
 */
function convertLayoutToDayData(layout: CalendarLayoutInfo): { days: DayData[]; monthLabels: MonthLabel[] } {
  return {
    days: layout.cells.map(cell => ({
      id: cell.id,
      date: cell.date,
      level: cell.level,
      items: cell.count,
      dateString: cell.label
    })),
    monthLabels: layout.months
  };
}

export interface UseStatsWallReturn {
  // 状态
  layout: CalendarLayoutInfo | null;
  days: DayData[];
  monthLabels: MonthLabel[];
  totalWeeks: number;
  isLoading: boolean;
  
  // Refs (供 UI 层使用)
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function useStatsWall(isOpen: boolean): UseStatsWallReturn {
  // 立即使用空结构进行初始化，避免闪烁
  const [layout, setLayout] = useState<CalendarLayoutInfo | null>(() => 
    statsWallManager.generateEmptyCalendar()
  );
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentVersionRef = useRef<number | null>(null); // 当前版本号

  // 从 RPC 获取数据的辅助函数（使用 useCallback 避免重复创建）
  const fetchStatsWallData = useCallback(async (clientVersion?: number): Promise<void> => {
    try {
      const result = await backgroundApi.getStatsWallData(clientVersion);

      // 更新版本号和布局数据
      currentVersionRef.current = result.version;
      setLayout(result.data);
    } catch (err) {
      console.error('[useStatsWall] 获取 Stats Wall 数据失败:', err);
    }
  }, []);

  // 1. 数据获取逻辑（Popup 打开时）
  useEffect(() => {
    if (isOpen) {
      // 先从 Storage 读取版本号
      storageService.get<{ version: number; computedAt: number }>(STORAGE_KEYS.STATS_WALL_VERSION)
        .then(metadata => {
          const storedVersion = metadata?.version;
          // 通过 RPC 获取数据（传入版本号，如果匹配则返回缓存）
          fetchStatsWallData(storedVersion);
        })
        .catch(() => {
          // 如果读取版本号失败，直接获取数据（不传版本号）
          fetchStatsWallData();
        });
    }
  }, [isOpen, fetchStatsWallData]);

  // 1.5. 监听后台计算完成事件
  useEffect(() => {
    if (!isOpen) {
      return; // 只在模态框打开时监听
    }

    const handleMessage = (message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) => {
      // 检查是否是 Stats Wall 事件
      if (message?.event === 'statsWall' && message?.payload?.type === 'statsWall:updated') {
        const event = message.payload as StatsWallUpdateEvent;
        
        // 检查版本号是否匹配
        if (event.version === currentVersionRef.current) {
          return;
        }
        
        // 版本号不匹配，通过 RPC 获取最新数据
        fetchStatsWallData(currentVersionRef.current ?? undefined);
      }
    };

    // 注册消息监听器
    chrome.runtime.onMessage.addListener(handleMessage);

    // 清理函数
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [isOpen, fetchStatsWallData]);

  // 1.6. 监听 Storage 变化（作为后备机制）
  useEffect(() => {
    if (!isOpen) {
      return; // 只在模态框打开时监听
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      // 只处理 local storage 的变化
      if (areaName !== 'local') {
        return;
      }

      // 检查是否是 Stats Wall 版本号变化
      if (changes[STORAGE_KEYS.STATS_WALL_VERSION]) {
        const newValue = changes[STORAGE_KEYS.STATS_WALL_VERSION].newValue as { version: number; computedAt: number } | undefined;

        if (newValue && newValue.version !== currentVersionRef.current) {
          // 版本号变化，通过 RPC 获取最新数据
          fetchStatsWallData(currentVersionRef.current ?? undefined);
        }
      }
    };

    // 注册 Storage 变化监听器
    chrome.storage.onChanged.addListener(handleStorageChange);

    // 清理函数
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [isOpen, fetchStatsWallData]);
  
  // 2. 滚轮事件处理 - 将垂直滚动转换为水平滚动
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!isOpen || !el) return;
    
    const handleWheel = (e: WheelEvent) => {
      // 如果主要在垂直方向滚动，则接管并转换为水平滚动
      // 这样可以避免在用户想要水平滚动时被拦截
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    
    // 使用 passive: false 因为我们需要调用 preventDefault
    el.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]); // 依赖 isOpen 即可，ref 变化通常意味着组件重载
  
  // 3. 自动滚动逻辑
  useEffect(() => {
    // 仅在模态框打开、滚动容器可用且数据已加载时执行
    if (isOpen && scrollContainerRef.current && layout && layout.cells.length > 0) {
      const element = scrollContainerRef.current;
      
      // 1. 查找第一个有活动的 day 的索引
      const firstActivityIndex = layout.cells.findIndex(cell => cell.count > 0);
      
      // [修复] 从 CSS 读取动态值，而不是硬编码
      const computedStyle = window.getComputedStyle(element);
      const squareSize = parseFloat(computedStyle.getPropertyValue('--square-size')) || 24;
      const gapSize = parseFloat(computedStyle.getPropertyValue('--gap-size')) || 4;
      const colWidth = squareSize + gapSize; // 现在是 28px，但会随 CSS 自动更新
      
      let targetScrollLeft = 0;
      
      if (firstActivityIndex !== -1) {
        // 2. 如果找到了活动
        // 找到它在第几周 (column)
        const firstActivityWeek = Math.floor(firstActivityIndex / 7);
        
        // 3. 计算滚动的目标位置
        // 目标是滚动到第一列，并减去几周的宽度作为左边距
        targetScrollLeft = firstActivityWeek * colWidth;
        // 减去2周的宽度作为边距，但确保不小于0
        targetScrollLeft = Math.max(0, targetScrollLeft - (colWidth * 2));
      } else {
        // 4. 如果*没有*任何活动 (firstActivityIndex === -1)
        // 按照要求，滚动到最右侧 (当前月份)
        targetScrollLeft = element.scrollWidth - element.clientWidth;
      }
      
      // 5. 滚动到目标位置
      // 使用 rAF 和 setTimeout 确保 DOM 布局已完成
      // [Refactor] 使用统一的渲染周期常量，避免硬编码
      const animationFrameId = requestAnimationFrame(() => {
        setTimeout(() => {
          if (element) {
            // 使用平滑滚动
            element.scrollTo({
              left: targetScrollLeft,
              behavior: 'smooth'
            });
          }
        }, RENDER_TICK); // [Refactor] 使用统一的渲染周期常量，确保布局稳定
      });
      
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [isOpen, layout]);
  
  // 4. 数据转换
  const { days, monthLabels } = useMemo(() => {
    if (!layout) return { days: [], monthLabels: [] };
    return convertLayoutToDayData(layout);
  }, [layout]);
  
  return {
    layout,
    days,
    monthLabels,
    totalWeeks: layout?.totalWeeks || 0,
    isLoading: !layout,
    scrollContainerRef,
  };
}

