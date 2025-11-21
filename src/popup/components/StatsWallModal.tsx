import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from './GlassCard';
import { ModalHeader } from './ModalHeader';
import { Tooltip } from './Tooltip';
import { useStatsWall, DayData } from '../hooks/headless/useStatsWall';

interface StatsWallModalProps {
  isOpen: boolean;
  onClose: () => void;
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
 * 主模态框组件 - 视觉层（Skin）
 * 只负责渲染 Glass 效果、布局、动画
 * 所有逻辑都在 useStatsWall hook 中（Brain）
 */
export function StatsWallModal({ isOpen, onClose }: StatsWallModalProps) {
  // 一行代码接管所有复杂性
  const { layout, days, monthLabels, totalWeeks, scrollContainerRef } = useStatsWall(isOpen);

  if (!isOpen || !layout) return null;

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
            ref={scrollContainerRef}
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