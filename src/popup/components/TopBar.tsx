import { Flame, Check, Tag, Settings } from 'lucide-react';
import React from 'react';

interface TopBarProps {
  onOpenStatsWall: () => void;
  onOpenSettings: () => void;
}

const mockStats = {
  streak: 12,
  tagged: 78,
  completed: 120,
};

/**
 * V4: "Stealth HUD" 隐形抬头显示器
 * 默认透明并紧贴顶部。
 * Hover 时浮现 Liquid Glass 效果。
 */
export function TopBar({ onOpenStatsWall, onOpenSettings }: TopBarProps) {
  return (
    // (V4) 关键: 
    // 1. 根元素不再是 .liquidGlass-wrapper
    // 2. 使用新的 .top-bar-container-v4
    <div className="top-bar-container-v4">
      {/* (V4) 内部的 content-wrapper 用于对齐，
        它不再是 .liquidGlass-content 
      */}
      <div className="top-bar-content-v4">
        
        {/* 左侧: 统计数据组 */}
        <div className="top-bar-stats-group-v4">
          {/* 1. 连胜 (Streak) - 独立按钮，永久高亮 */}
          <button 
            className="top-bar-button-v4" 
            title="连胜天数 (打开像素工坊)"
            onClick={onOpenStatsWall}
            data-stat-type="streak"
          >
            <Flame className="top-bar-icon-v4" />
            <span className="top-bar-value-v4">{mockStats.streak}</span>
          </button>
          
          {/* 2. 已标记 (Tagged) - 独立按钮 */}
          <button 
            className="top-bar-button-v4" 
            title="总标记页面 (打开像素工坊)"
            onClick={onOpenStatsWall}
            data-stat-type="tagged"
          >
            <Tag className="top-bar-icon-v4" />
            <span className="top-bar-value-v4">{mockStats.tagged}</span>
          </button>

          {/* 3. 已完成 (Completed) - 独立按钮 */}
          <button 
            className="top-bar-button-v4" 
            title="已完成任务 (打开像素工坊)"
            onClick={onOpenStatsWall}
            data-stat-type="completed"
          >
            <Check className="top-bar-icon-v4" />
            <span className="top-bar-value-v4">{mockStats.completed}</span>
          </button>
        </div>

        {/* 右侧: 设置按钮 - 独立按钮 */}
        <button
          onClick={onOpenSettings}
          className="top-bar-button-v4 settings"
          title="打开设置"
        >
          <Settings className="top-bar-icon-v4 settings-icon" />
        </button>
      </div>
    </div>
  );
}

