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
      className: "w-3 h-3 stat-item-icon", 
      strokeWidth: 2,
      style: { 
        color: 'color-mix(in srgb, var(--c-content) 50%, var(--c-bg))',
        transition: 'color 0.2s var(--ease-smooth)'
      }
    })}
    <span 
      className="stat-item-value"
      style={{
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
        transition: 'color 0.2s var(--ease-smooth)'
      }}
    >
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

      {/* [!] 注入新的 Title CSS */}
      <style>
        {`
          .channel-title-anchor {
            font-family: "DM Sans", sans-serif;
            /* [!] 新尺寸与样式 */
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--c-content);
            
            /* [!] 无 hover 效果 */
            cursor: default;
            user-select: none;
          }
          
          /* [!] 新的 hover 效果 (应用于按钮) */
          .hud-button {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0.25rem;
            margin: -0.25rem; /* 补偿 padding 以增大热区 */
            border-radius: 0.5rem;
            transition: background-color 0.2s var(--ease-smooth);
          }
          
          .hud-button:hover {
            background-color: color-mix(in srgb, var(--c-action) 10%, transparent);
          }
          
          /* [!] 关键：
            我们让 StatItem 内部的图标和文字在 hover 时
            继承父按钮的 --c-action 颜色
          */
          .hud-button:hover .stat-item-icon,
          .hud-button:hover .stat-item-value,
          .hud-button-settings:hover {
            color: var(--c-action) !important;
          }
          
          .hud-button-settings {
            padding: 1.5px; /* 微调设置图标的点击区域 */
            color: color-mix(in srgb, var(--c-content) 65%, var(--c-bg));
            transition: color 0.2s var(--ease-smooth), 
                        transform 0.2s var(--ease-smooth),
                        background-color 0.2s var(--ease-smooth);
          }
          
          .hud-button-settings:hover {
            transform: scale(1.1);
          }
        `}
      </style>

      {/* [!] 浮动头部 (Floating Header) */}
      <div 
        ref={floatingHeaderRef} 
        className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center"
        style={{ pointerEvents: 'none' }} 
      >
        {/* 1. 顶部HUD */}
        <div 
          className="relative w-full max-w-md z-50"
          style={{ 
            pointerEvents: 'auto',
            
            /* [!] 关键：使用 Grid 布局 */
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', /* [!] 解决"高低错落" */
            
            padding: '12px 16px 0', /* 左右 1rem (16px) 内边距 */
            height: '44px',
          }}
        >
          
          {/* --- 左侧：统计 (Grid 区域 1) --- */}
          <div style={{ justifySelf: 'start' }}>
            <button
              onClick={() => setIsStatsWallOpen(true)}
              title="View Activity"
              className="hud-button flex items-center gap-3" 
            >
              <StatItem icon={<Bookmark />} value={MOCK_TODAY_PAGES} />
              <StatItem icon={<TagIcon />} value={MOCK_TODAY_TAGS} />
            </button>
          </div>

          {/* --- 中央：品牌锚点 (Grid 区域 2) --- */}
          <div style={{ justifySelf: 'center' }}>
            <div className="channel-title-anchor">
              Channel
            </div>
          </div>

          {/* --- 右侧：设置 (Grid 区域 3) --- */}
          <div style={{ justifySelf: 'end' }}>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hud-button hud-button-settings"
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 2. TabSwitcher 容器 */}
        <div 
          className="w-full max-w-md z-10"
          style={{ 
            pointerEvents: 'auto', 
            padding: '8px 16px 0', // 左右 1rem (16px) 内边距
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
