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
const defaultActivityData = [
  /* 周日 */ 0, 0, 1, 2, 1, 0, 0,
  /* 周一 */ 1, 3, 2, 1, 1, 2, 1,
  /* 周二 */ 2, 2, 3, 3, 2, 1, 2,
  /* 周三 */ 1, 3, 1, 0, 2, 3, 3,
  /* 周四 */ 0, 2, 0, 1, 1, 2, 1,
  /* 周五 */ 1, 1, 1, 2, 3, 3, 2,
  /* 周六 */ 0, 0, 0, 1, 2, 1, 0,
  // 重复直到填满约 90 天
  ...Array.from({ length: 70 }, () => Math.floor(Math.random() * 4)),
];

// 每日活动行组件
interface ActivityDayRowProps {
  date: Date;
  level: number;
  items: number;
}

const ActivityDayRow = ({ date, level, items }: ActivityDayRowProps) => {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const tooltipContent = `${items} items on ${dateString}`;

  // 根据 level 计算条的宽度
  // 0=0%, 1=33%, 2=66%, 3=100%
  const barWidth = level > 0 ? (level / 3) * 100 : 0;

  return (
    <div className="activity-row">
      <div className="activity-row-date">
        <span className="day-name">{dayName}</span>
        <span className="date-string">{dateString}</span>
      </div>
      <div className="activity-row-bar-wrapper">
        <ActivityTooltip content={tooltipContent}>
          <div 
            className="activity-bar" 
            data-level={level} 
            style={{ width: barWidth === 0 ? '4px' : `${barWidth}%` }}
          />
        </ActivityTooltip>
      </div>
    </div>
  );
};

// 简化的日期分组逻辑
const getGroupedActivity = (activityData: number[]) => {
  const today = new Date();
  const groups: { [key: string]: { date: Date; level: number; items: number }[] } = {
    "Recent Activity": [],
  };

  activityData.forEach((level, index) => {
    const daysAgo = activityData.length - 1 - index;
    const date = new Date();
    date.setDate(today.getDate() - daysAgo);

    groups["Recent Activity"].push({
      date,
      level,
      items: level > 0 ? level * 2 + 1 : 0, // 模拟数据
    });
  });
  
  // 反转使其成为反向时间顺序（最新的在前）
  groups["Recent Activity"].reverse();
  return Object.entries(groups);
};

export function StatsWallModal({
  isOpen,
  onClose,
  activityData = defaultActivityData,
}: StatsWallModalProps) {
  if (!isOpen) return null;

  const groupedData = getGroupedActivity(activityData);

  return (
    <div className="stats-wall-backdrop" onClick={onClose}>
      <GlassCard
        className="stats-wall-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="stats-wall-header">
          <h2 className="stats-wall-title">Activity</h2>
          <button onClick={onClose} className="close-button">
            <X size={18} />
          </button>
        </div>

        {/* 滚动容器 */}
        <div className="stats-wall-scroll-content">
          {groupedData.map(([groupTitle, activities]) => (
            <section key={groupTitle} className="activity-group">
              <h3 className="activity-group-title">{groupTitle}</h3>
              <div className="activity-group-list">
                {activities.map((activity) => (
                  <ActivityDayRow
                    key={activity.date.toISOString()}
                    date={activity.date}
                    level={activity.level}
                    items={activity.items}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

