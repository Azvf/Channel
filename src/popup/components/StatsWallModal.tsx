import React from 'react';
import { X, Share2, Award } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface StatsWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityData?: number[];
  currentUnlock?: {
    name: string;
    progress: number;
    total: number;
  };
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
  currentUnlock = { name: 'Pixel Cat', progress: 75, total: 100 },
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

  return (
    <div className="stats-wall-backdrop" onClick={onClose}>
      <GlassCard
        className="stats-wall-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 4. 上下文 (The Context) - 模态框头部 */}
        <div className="stats-wall-header">
          <h2 className="stats-wall-title">你的像素画廊</h2>
          <button onClick={onClose} className="close-button">
            <X size={18} />
          </button>
        </div>

        {/* 1. 核心激励 (The Hook) - 下一个徽章进度条 */}
        <GlassCard className="stats-wall-reward">
          <Award size={16} className="reward-icon" />
          <div className="reward-info">
            <span className="reward-label">下一个徽章: {currentUnlock.name}</span>
            <div className="reward-progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${currentUnlock.progress}%` }}
              />
            </div>
          </div>
          <span className="reward-percent">{currentUnlock.progress}%</span>
        </GlassCard>

        {/* 2. 像素画廊 (The Wall) - GitHub 贡献墙的无感设计版 */}
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
                    return (
                      <div
                        key={globalIndex}
                        className="pixel-day-tile"
                        data-level={level}
                        title={`Activity Level ${level} on Day ${globalIndex + 1}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 放大器 (The Amplifier) - 分享按钮 */}
        <button
          className="share-button glass-button primary"
          onClick={() => {
            // TODO: 实现分享功能
            console.log('分享成就');
          }}
        >
          <Share2 size={16} />
          <span>分享我的成就</span>
        </button>
      </GlassCard>
    </div>
  );
}

