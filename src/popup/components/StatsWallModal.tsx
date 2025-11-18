import React, { useState, useEffect, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from './GlassCard';
import { ModalHeader } from './ModalHeader';
import { Tooltip } from './Tooltip';
import { statsWallManager } from '../../services/StatsWallManager';
import { CalendarLayoutInfo } from '../../types/statsWall';

interface StatsWallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 适配器：将 CalendarCell 转换为组件内部使用的格式
interface DayData {
  id: string;
  date: Date;
  level: 0 | 1 | 2 | 3;
  items: number;
  dateString: string;
}

/**
 * 将 CalendarLayoutInfo 转换为组件内部使用的格式
 */
function convertLayoutToDayData(layout: CalendarLayoutInfo): { days: DayData[]; monthLabels: { label: string; colStart: number }[] } {
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

/**
 * 宏观视图 (热图方块) - 使用 React.memo 优化
 */
const ActivityDaySquare: React.FC<{ day: DayData }> = memo(({ day }) => {
  const tooltipContent = day.items === 0 
    ? `No activity on ${day.dateString}`
    : `${day.items} items on ${day.dateString}`;

  return (
    // 使用 delay={100} 实现即时反馈，符合查看数据的心理预期
    <Tooltip content={tooltipContent} delay={100}>
      <div 
        className="activity-day-square" 
        data-level={day.level}
        title={tooltipContent}
      />
    </Tooltip>
  );
});

/**
 * 主模态框组件
 */
export function StatsWallModal({ isOpen, onClose }: StatsWallModalProps) {
  
  // 立即使用空结构进行初始化，避免闪烁
  const [layoutData, setLayoutData] = useState<CalendarLayoutInfo | null>(() => 
    statsWallManager.generateEmptyCalendar()
  );

  // 为滚动容器创建一个 ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // 静默获取数据 (Manager 处理了缓存)
  useEffect(() => {
    if (isOpen) {
      // Manager 处理了缓存和逻辑，React 组件只负责"索要"数据
      statsWallManager.getStatsWallData()
        .then(data => setLayoutData(data))
        .catch(err => {
          // 静默失败
          console.error("后台加载活动数据失败:", err);
        });
    }
  }, [isOpen]);

  // 3. [新] 添加 useEffect 来处理滚轮事件
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const element = scrollRef.current;

      const handleWheel = (e: WheelEvent) => {
        // 检查是否有垂直滚动（deltaY）
        if (e.deltaY !== 0) {
          // 阻止页面默认的垂直滚动
          e.preventDefault();
          // 将垂直滚动量应用到水平滚动上
          element.scrollLeft += e.deltaY;
        }
      };

      element.addEventListener('wheel', handleWheel);
      
      return () => {
        element.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isOpen]); // 仅在 isOpen 状态改变时重新附加/移除

  // 自动滚动逻辑
  useEffect(() => {
    // 仅在模态框打开、滚动容器可用且数据已加载时执行
    if (isOpen && scrollRef.current && layoutData && layoutData.cells.length > 0) {
      const element = scrollRef.current;

      // 1. 查找第一个有活动的 day 的索引
      const firstActivityIndex = layoutData.cells.findIndex(cell => cell.count > 0);

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
      const animationFrameId = requestAnimationFrame(() => {
        setTimeout(() => {
          if (element) {
            // 使用平滑滚动
            element.scrollTo({
              left: targetScrollLeft,
              behavior: 'smooth'
            });
          }
        }, 100); // 100ms 延迟确保布局稳定
      });

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [isOpen, layoutData]); // 依赖 isOpen 和 layoutData

  if (!isOpen || !layoutData) return null;
  
  // 转换为组件内部使用的格式
  const { days, monthLabels } = convertLayoutToDayData(layoutData);
  const totalWeeks = layoutData.totalWeeks;

  return createPortal(
    <div className="stats-wall-backdrop" onClick={onClose}>
      <GlassCard
        className="stats-wall-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - 使用标准化的 ModalHeader */}
        <ModalHeader title="Activity" onClose={onClose} />
        
        {/* [V9 修复] 7. 渲染日历 (不再有 AnimatePresence 或条件) */}
        
        {/* [!!! 重构开始 !!!] */}

        {/* 1. [新] 主日历布局 (Grid) */}
        {/* 这个新的 Grid 容器将分离"固定列"和"滚动列" */}
        <div 
          className="stats-wall-calendar-layout"
        >
          {/* 1a. [新] 固定的星期标签 (M, W, F) */}
          <div className="day-labels-fixed">
            <span>M</span>
            <span>W</span>
            <span>F</span>
          </div>
          
          {/* 1b. [新] 可滚动的内容区域 */}
          <div 
            ref={scrollRef}
            className="stats-wall-scroll-content"
          >
            {/* 月份标签 (现在在滚动区内部) */}
            <div 
              className="month-labels"
              style={{ 
                gridTemplateColumns: `repeat(${totalWeeks}, var(--square-size))`,
              }}
            >
              {monthLabels.map(({ label, colStart }) => (
                <span key={label} style={{ gridColumnStart: colStart }}>
                  {label}
                </span>
              ))}
            </div>

            {/* 核心网格 (现在在滚动区内部) */}
            <div 
              className="activity-grid"
              style={{ 
                gridTemplateColumns: `repeat(${totalWeeks}, var(--square-size))`
              }}
            >
              {days.map((day) => (
                <ActivityDaySquare key={day.id} day={day} />
              ))}
            </div>
          </div>
        </div>

        {/* 2. [新] 固定的图例 (Legend) */}
        {/* 我们将图例也移到滚动区域之外，保持其始终可见 */}
        <div className="calendar-legend-fixed">
          <span>Less</span>
          <div className="legend-square" data-level="0" />
          <div className="legend-square" data-level="1" />
          <div className="legend-square" data-level="2" />
          <div className="legend-square" data-level="3" />
          <span>More</span>
        </div>
        {/* [!!! 重构结束 !!!] */}
      </GlassCard>
    </div>,
    document.body
  );
}