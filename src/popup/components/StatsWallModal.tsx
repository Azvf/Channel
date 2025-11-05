import React from 'react';
import { X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ActivityTooltip } from './ActivityTooltip';

interface StatsWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityData?: number[];
}

// 默认活动数据: 0 = No Activity, 1 = Low, 2 = Mid, 3 = High
// 确保至少有 91 个条目
const defaultActivityData = Array.from({ length: 91 }, () => Math.floor(Math.random() * 4));

// 固定显示 91 天 (13 周)
const TOTAL_DAYS = 91;

/**
 * 生成过去 91 天 (13 周) 的日历数据
 */
function generateCalendarDays(data: number[]) {
  const days: Array<{
    id: string;
    date: Date;
    level: number;
    items: number;
    dateString: string;
  }> = [];
  const today = new Date();
  const monthLabels: { label: string; colSpan: number }[] = [];
  let currentMonth = '';
  let currentColSpan = 0;

  // 从 90 天前开始循环到今天 (共 91 天)
  for (let i = 90; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const dataIndex = data.length - 1 - i;
    const level = data[dataIndex] ?? 0; // 如果数据不足，默认为 0
    const items = level > 0 ? (level * 2 + Math.floor(Math.random() * 2)) : 0; // 模拟项目数
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const monthKey = date.toLocaleDateString('en-US', { month: 'short' });

    days.push({
      id: date.toISOString(),
      date,
      level,
      items,
      dateString,
    });

    // --- 月份标签逻辑 (中观分组) ---
    // 检查是否是新的一周 (周日) 或第一个条目
    if (date.getDay() === 0 || i === 90) {
      if (monthKey !== currentMonth) {
        if (currentMonth) {
          monthLabels.push({ label: currentMonth, colSpan: currentColSpan });
        }
        currentMonth = monthKey;
        currentColSpan = 1;
      } else {
        currentColSpan++;
      }
    }
  }
  // 添加最后一个月份
  monthLabels.push({ label: currentMonth, colSpan: currentColSpan });

  return { days, monthLabels };
}

/**
 * 宏观视图 (热图方块)
 */
interface ActivityDaySquareProps {
  day: ReturnType<typeof generateCalendarDays>['days'][0];
}

const ActivityDaySquare: React.FC<ActivityDaySquareProps> = ({ day }) => {
  const tooltipContent = `${day.items} items on ${day.dateString}`;

  return (
    <ActivityTooltip content={tooltipContent}>
      <div
        className="activity-day-square"
        data-level={day.level}
        title={tooltipContent} // 增加原生 title 作为后备
      />
    </ActivityTooltip>
  );
};

/**
 * 主模态框组件
 */
export function StatsWallModal({
  isOpen,
  onClose,
  activityData = defaultActivityData,
}: StatsWallModalProps) {
  if (!isOpen) return null;

  // 生成日历数据
  const { days, monthLabels } = generateCalendarDays(activityData);

  return (
    // 1. 背景遮罩
    <div className="stats-wall-backdrop" onClick={onClose}>
      <GlassCard
        className="stats-wall-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 2. 头部 (不变) */}
        <div className="stats-wall-header">
          <h2 className="stats-wall-title">Activity</h2>
          <button onClick={onClose} className="close-button">
            <X size={18} />
          </button>
        </div>

        {/* 3. 可视化容器 (替换 .stats-wall-scroll-content) */}
        <div className="activity-calendar-container">
          {/* 3a. 月份标签 (中观分组) */}
          <div
            className="month-labels"
            style={{
              // 动态设置 Grid 列，使其与下方的周对齐
              gridTemplateColumns: `repeat(${monthLabels.length}, 1fr)`
            }}
          >
            {monthLabels.map(({ label, colSpan }, index) => (
              <span
                key={label + index}
                style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="calendar-body">
            {/* 3b. 星期标签 (中观分组) */}
            <div className="day-labels">
              <span>M</span> {/* 周一 */}
              <span>W</span> {/* 周三 */}
              <span>F</span> {/* 周五 */}
            </div>

            {/* 3c. 核心网格 (宏观数据) */}
            <div className="activity-grid">
              {days.map((day) => (
                <ActivityDaySquare key={day.id} day={day} />
              ))}
            </div>
          </div>

          {/* 3d. 图例 (上下文) */}
          <div className="calendar-legend">
            <span>Less</span>
            <div className="legend-square" data-level="0" />
            <div className="legend-square" data-level="1" />
            <div className="legend-square" data-level="2" />
            <div className="legend-square" data-level="3" />
            <span>More</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

