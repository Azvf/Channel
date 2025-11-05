import React, { useState, useLayoutEffect, useRef } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { TabSwitcher } from "./components/TabSwitcher";
import { SettingsModal } from "./components/SettingsModal";
import { StatsWallModal } from "./components/StatsWallModal";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import { usePageSettings } from "./utils/usePageSettings";
import type { AppInitialState } from "../services/appInitService";
import { Settings, Tag as TagIcon, Bookmark } from "lucide-react";

interface AppProps {
  initialState: AppInitialState;
}

// [优化] StatItem 使用新图标
const StatItem = ({ icon, value }: { icon: React.ReactNode; value: number }) => (
  <div 
    className="flex items-center gap-1"
    style={{
      fontFamily: '"DM Sans", sans-serif',
      fontVariantNumeric: 'tabular-nums',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      pointerEvents: 'auto',
    }}
  >
    {React.cloneElement(icon as any, { 
      className: "w-3 h-3", 
      strokeWidth: 2,
      style: { color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))' }
    })}
    <span style={{
      fontSize: '0.75rem',
      fontWeight: 500,
      color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
    }}>
      {value}
    </span>
  </div>
);

// [优化] 调整默认高度以适应新的居中布局
const DEFAULT_HEADER_HEIGHT = 108; // 44px (HUD) + 52px (Switcher) + 12px (Gap)

export default function App({ initialState }: AppProps) {
  // 使用初始状态，避免页面闪烁
  const [activeTab, setActiveTab] = useState<"tagging" | "tagged">(initialState.activeTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsWallOpen, setIsStatsWallOpen] = useState(false);
  // pageSettings hook - 如果需要的话可以在这里使用
  usePageSettings(initialState.pageSettings);

  // 3. [新] 为测量创建 state 和 ref
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const floatingHeaderRef = useRef<HTMLDivElement>(null);

  // 4. [新] 使用 useLayoutEffect 在绘制前同步测量高度
  // 这消除了所有"魔术数字"
  useLayoutEffect(() => {
    if (floatingHeaderRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const newHeight = entry.contentRect.height;
          // [优化] 间距从 16px 减小到 12px (0.75rem)，因为顶部内边距已移除
          setHeaderHeight(newHeight + 12); 
        }
      });

      // 开始观察
      resizeObserver.observe(floatingHeaderRef.current);

      // 组件卸载时停止观察
      return () => resizeObserver.disconnect();
    }
  }, []); // 仅在挂载时运行一次

  // 保存标签页状态
  const handleTabChange = async (tab: "tagging" | "tagged") => {
    setActiveTab(tab);
    try {
      await storageService.set(STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch (error) {
      console.error('保存标签页状态失败', error);
    }
  };

  // (Mock 数据)
  const MOCK_TODAY_PAGES = 12;
  const MOCK_TODAY_TAGS = 5;

  // 5. [重构] 布局结构
  return (
    <div 
      className="relative flex h-full flex-col" 
      style={{ 
        width: '360px',
        height: '560px',
        background: 'transparent',
        overflow: 'hidden' // 确保 App 根元素裁切
      }}
    >
      {/* 模态框 (Portaled) - 保持不变 */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        initialTheme={initialState.theme}
      />
      <StatsWallModal 
        isOpen={isStatsWallOpen} 
        onClose={() => setIsStatsWallOpen(false)} 
      />
      
      {/* A. 可滚动的内容区 (在底层) */}
      <div 
        className="relative flex-1 px-4 pb-4" 
        style={{ 
          minHeight: 0, 
          overflowY: 'auto',
          // 移除所有硬编码的 padding-top
        }}
      >
        {/* [关键] 动态占位符：
          它的高度由 JS 动态设置 (headerHeight)，
          不再是魔术数字。
        */}
        <div 
          style={{ height: `${headerHeight}px`, flexShrink: 0 }} 
        />
        
        {/* 内容 */}
        {activeTab === "tagging" ? (
          <TaggingPage />
        ) : (
          <TaggedPage />
        )}
        
        {/* 移除 StatsCluster (根据我们之前的优化) */}
      </div>

      {/* [优化] 浮动头部现在是一个垂直居中的容器 */}
      <div 
        ref={floatingHeaderRef} 
        className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center" // [优化] 关键：flex-col items-center
        style={{ pointerEvents: 'none' }} 
      >
        {/* [优化] 1. 顶部HUD (设置 + 统计) - 作为一个居中块 */}
        <div 
          className="relative flex justify-between items-center w-full max-w-xs z-50" // [优化] 居中并限制最大宽度
          style={{ 
            pointerEvents: 'auto',
            padding: '12px 16px 0', // [优化] 顶部 12px, 左右 16px, 底部 0
            height: '44px', // [优化] 固定高度
          }}
        >
          {/* 左侧：设置按钮 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg p-1.5 transition-all"
            style={{
              background: 'transparent', 
              border: 'none',
              color: 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 15%, transparent)';
              e.currentTarget.style.color = 'var(--c-action)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={2} />
          </button>

          {/* 右侧：统计按钮 */}
          <button
            onClick={() => setIsStatsWallOpen(true)}
            title="View Activity"
            className="flex items-center gap-3 rounded-lg transition-all"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              margin: '-0.25rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 10%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* [优化] 使用 Bookmark 图标 */}
            <StatItem icon={<Bookmark />} value={MOCK_TODAY_PAGES} />
            <StatItem icon={<TagIcon />} value={MOCK_TODAY_TAGS} />
          </button>
        </div>
        
        {/* [优化] 2. TabSwitcher 容器 - 保持居中 */}
        <div 
          className="w-full max-w-md z-10"
          style={{ 
            pointerEvents: 'auto', 
            padding: '8px 16px 0', // [优化] 调整内边距 (8px top, 16px sides)
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}
