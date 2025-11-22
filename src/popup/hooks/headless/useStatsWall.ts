import { useState, useEffect, useRef, useMemo } from 'react';
import { statsWallManager } from '../../../services/StatsWallManager';
import { CalendarLayoutInfo } from '../../../shared/types/statsWall';
import { RENDER_TICK } from '../../tokens/animation'; // [Refactor] 使用统一的渲染周期常量

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
  
  // 1. 数据获取逻辑
  useEffect(() => {
    if (isOpen) {
      // Manager 处理了缓存和逻辑，React 组件只负责"索要"数据
      statsWallManager.getStatsWallData()
        .then(data => setLayout(data))
        .catch(err => {
          // 静默失败
          console.error("后台加载活动数据失败:", err);
        });
    }
  }, [isOpen]);
  
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

