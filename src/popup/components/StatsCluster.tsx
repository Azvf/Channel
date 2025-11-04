import React from 'react';
import { Flame, Check, Tag, LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  'data-stat-type': 'streak' | 'tagged' | 'completed';
}

interface StatsClusterProps {
  stats?: StatItem[];
  onStatClick?: (statType: string) => void;
}

const defaultStats: StatItem[] = [
  { label: '连胜', value: '12', icon: Flame, 'data-stat-type': 'streak' },
  { label: '已标记', value: '78', icon: Tag, 'data-stat-type': 'tagged' },
  { label: '已完成', value: '120', icon: Check, 'data-stat-type': 'completed' },
];

export function StatsCluster({ stats = defaultStats, onStatClick }: StatsClusterProps) {
  return (
    <div className="stats-cluster-container">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.label}
            className="glass-stat-button"
            data-stat-type={stat['data-stat-type']}
            onClick={() => onStatClick?.(stat['data-stat-type'])}
          >
            <Icon className="stat-icon" />
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

