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

export function StatsWallModal({
  isOpen,
  onClose,
  activityData = defaultActivityData,
}: StatsWallModalProps) {
  if (!isOpen) return null;

  // 计算月份标签（简化版，实际应该根据日期计算）
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const weeks = Math.ceil(activityData.length / 7);
  
  // 将数据按周分组（每周7天）
  const weeksData: number[][] = [];
  for (let i = 0; i < activityData.length; i += 7) {
    weeksData.push(activityData.slice(i, i + 7));
  }

  // Y轴标签：只显示 Mon, Wed, Fri（对应索引 1, 3, 5）
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  // 计算日期（简化版，从今天往前推）
  const getDateText = (globalIndex: number): string => {
    const daysAgo = activityData.length - globalIndex - 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const level = activityData[globalIndex];
    const items = level > 0 ? level * 3 : 0; // 模拟数据
    return `${items} items on ${month} ${day}`;
  };

  return (
    <div className="stats-wall-backdrop" onClick={onClose}>
      <GlassCard
        className="stats-wall-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 模态框头部 */}
        <div className="stats-wall-header">
          <h2 className="stats-wall-title">Activity</h2>
          <button onClick={onClose} className="close-button">
            <X size={18} />
          </button>
        </div>

        {/* 像素画廊 - GitHub 贡献墙的无感设计版 */}
        <div className="stats-wall-grid-container">
          {/* Y轴 (星期): 极简主义，只显示 Mon, Wed, Fri */}
          <div className="stats-wall-days-y">
            {dayLabels.map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>

          <div className="stats-wall-grid-wrapper">
            {/* X轴 (月份): 位于网格正上方 */}
            <div className="stats-wall-months-x">
              {months.map((month, idx) => (
                <span key={idx}>{month}</span>
              ))}
            </div>

            {/* 网格: 核心像素画廊 */}
            <div className="stats-wall-grid">
              {weeksData.map((week, weekIndex) => (
                <div key={weekIndex} className="stats-wall-week">
                  {week.map((level, dayIndex) => {
                    const globalIndex = weekIndex * 7 + dayIndex;
                    
                    // [修改] 使用 ActivityTooltip 包裹
                    return (
                      <ActivityTooltip
                        key={globalIndex}
                        content={getDateText(globalIndex)}
                      >
                        <div
                          className="pixel-day-tile"
                          data-level={level}
                          // [移除] 不再需要 title 属性和事件处理器
                        />
                      </ActivityTooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

