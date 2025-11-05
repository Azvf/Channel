import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react'; // [V9] 移除了 Loader2 和 motion
import { GlassCard } from './GlassCard';
import { ActivityTooltip } from './ActivityTooltip';
import { TagManager } from '../../services/tagManager';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { TaggedPage } from '../../types/gameplayTag';

interface StatsWallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// [V9] 定义数据结构
interface DayData {
  id: string;
  date: Date;
  level: 0 | 1 | 2 | 3;
  items: number;
  dateString: string;
}
interface MonthLabel {
  label: string;
  colStart: number;
}

/**
 * [V9 修复] 1. 创建一个 *同步* 函数来生成空的日历结构
 * 这确保了模态框可以立即渲染，*绝不*显示加载器。
 * 它的布局逻辑必须与 loadAndProcessActivityData *完全一致*以防止 Re-Layout。
 */
function generateEmptyCalendarDays(): { days: DayData[]; monthLabels: MonthLabel[] } {
  const days: DayData[] = [];
  const monthLabels: MonthLabel[] = [];
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364); // 365 天
  startDate.setDate(startDate.getDate() - startDate.getDay()); // 回溯到周日
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // 前进到周六

  let currentMonth = '';
  let currentWeekCol = 1;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    // 关键：level 和 items 默认为 0
    days.push({
      id: key,
      date: new Date(d),
      level: 0, 
      items: 0,
      dateString: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
    
    // 月份对齐逻辑 (V5 修复)
    const monthKey = d.toLocaleDateString('en-US', { month: 'short' });
    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      const colStart = d.getDay() === 0 ? currentWeekCol : currentWeekCol + 1;
      if (!monthLabels.find(m => m.colStart === colStart)) {
         monthLabels.push({ label: monthKey, colStart: colStart });
      }
    }
    if (d.getDay() === 6) { 
      currentWeekCol++;
    }
  }
  return { days, monthLabels };
}

/**
 * [V9] 2. 异步数据获取 (保持 V5 逻辑)
 */
async function loadAndProcessActivityData(): Promise<{ days: DayData[]; monthLabels: MonthLabel[] }> {
  const tagManager = TagManager.getInstance();
  
  const storageData = await storageService.getMultiple([
    STORAGE_KEYS.TAGS,
    STORAGE_KEYS.PAGES
  ]);
  tagManager.initialize({
    tags: (storageData[STORAGE_KEYS.TAGS] || null) as any,
    pages: (storageData[STORAGE_KEYS.PAGES] || null) as any,
  });

  const pages = tagManager.getTaggedPages();

  const activityMap = new Map<string, number>();
  pages.forEach(page => {
    const date = new Date(page.createdAt);
    const key = date.toISOString().split('T')[0];
    activityMap.set(key, (activityMap.get(key) || 0) + 1);
  });
  
  const maxActivity = Math.max(0, ...activityMap.values());
  const level1 = Math.max(1, Math.ceil(maxActivity * 0.25));
  const level2 = Math.max(2, Math.ceil(maxActivity * 0.5));
  const level3 = Math.max(3, Math.ceil(maxActivity * 0.75));
  
  const days: DayData[] = [];
  const monthLabels: MonthLabel[] = [];
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  let currentMonth = '';
  let currentWeekCol = 1;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const items = activityMap.get(key) || 0;
    
    let level: DayData['level'] = 0;
    if (items >= level3) level = 3;
    else if (items >= level2) level = 2;
    else if (items >= level1) level = 1;

    days.push({
      id: key,
      date: new Date(d),
      level,
      items,
      dateString: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });

    const monthKey = d.toLocaleDateString('en-US', { month: 'short' });
    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      const colStart = d.getDay() === 0 ? currentWeekCol : currentWeekCol + 1;
      if (!monthLabels.find(m => m.colStart === colStart)) {
         monthLabels.push({ label: monthKey, colStart: colStart });
      }
    }
    if (d.getDay() === 6) { 
      currentWeekCol++;
    }
  }
  return { days, monthLabels };
}

// [V9] 3. 状态缓存 (Module-level cache)
let cachedData: { days: DayData[]; monthLabels: MonthLabel[] } | null = null;
let lastCacheTime: number = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 分钟

/**
 * [V9] 4. 宏观视图 (热图方块) - 使用 React.memo 优化
 */
const ActivityDaySquare: React.FC<{ day: DayData }> = memo(({ day }) => {
  const tooltipContent = day.items === 0 
    ? `No activity on ${day.dateString}`
    : `${day.items} items on ${day.dateString}`;

  return (
    <ActivityTooltip content={tooltipContent}>
      <div 
        className="activity-day-square" 
        data-level={day.level}
        title={tooltipContent}
      />
    </ActivityTooltip>
  );
});

/**
 * 主模态框组件
 */
export function StatsWallModal({ isOpen, onClose }: StatsWallModalProps) {
  
  // [V9 修复] 5. 立即使用缓存或空结构进行初始化
  const [data, setData] = useState(() => cachedData || generateEmptyCalendarDays());
  // [V9 修复] 移除了 isLoading 和 error 状态

  // [V9 修复] 6. 静默获取 (Silent Fetch)
  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      const isCacheStale = !cachedData || (now - lastCacheTime > CACHE_DURATION_MS);
      
      if (cachedData && !isCacheStale) {
        if (data !== cachedData) {
          setData(cachedData);
        }
        return; 
      }

      // 静默刷新
      loadAndProcessActivityData()
        .then(result => {
          setData(result);
          cachedData = result;
          lastCacheTime = now;
        })
        .catch(err => {
          // 静默失败
          console.error("后台加载活动数据失败:", err);
        });
    }
  }, [isOpen, data]); // 添加 data 依赖确保状态一致

  if (!isOpen) return null;
  
  const { days, monthLabels } = data; // data 永远存在
  const totalWeeks = Math.ceil(days.length / 7);

  return createPortal(
    <div className="stats-wall-backdrop" onClick={onClose}>
      <GlassCard
        className="stats-wall-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stats-wall-header">
          <h2 className="stats-wall-title">Activity</h2>
          <button onClick={onClose} className="close-button">
            <X size={18} />
          </button>
        </div>
        
        {/* [V9 修复] 7. 直接渲染日历 (不再有 AnimatePresence 或条件) */}
        <div className="stats-wall-scroll-content">
          <div 
            className="activity-calendar-container"
            style={{ gridTemplateColumns: `var(--day-label-width) repeat(${totalWeeks}, 1fr)` }}
          >
            {/* 月份标签 */}
            <div 
              className="month-labels"
              style={{ 
                gridTemplateColumns: `repeat(${totalWeeks}, var(--square-size))`,
                gridColumn: '2 / -1'
              }}
            >
              {monthLabels.map(({ label, colStart }) => (
                <span key={label} style={{ gridColumnStart: colStart }}>
                  {label}
                </span>
              ))}
            </div>

            {/* 星期标签 */}
            <div className="day-labels">
              <span>M</span>
              <span>W</span>
              <span>F</span>
            </div>

            {/* 核心网格 */}
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

            {/* 图例 */}
            <div className="calendar-legend">
              <span>Less</span>
              <div className="legend-square" data-level="0" />
              <div className="legend-square" data-level="1" />
              <div className="legend-square" data-level="2" />
              <div className="legend-square" data-level="3" />
              <span>More</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>,
    document.body
  );
}
