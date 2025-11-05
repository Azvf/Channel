import React, { useState, useLayoutEffect, useRef } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { TabSwitcher } from "./components/TabSwitcher";
import { SettingsModal } from "./components/SettingsModal";
import { StatsWallModal } from "./components/StatsWallModal";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import { usePageSettings } from "./utils/usePageSettings";
import type { AppInitialState } from "../services/appInitService";
import { Settings, FileText, Tag as TagIcon } from "lucide-react";

interface AppProps {
  initialState: AppInitialState;
}

// [!!] 将 StatItem 移入 App.tsx (或 shared/ui)
// 这是一个轻量级的内联组件，用于显示图标+数字
const StatItem = ({ icon, value }: { icon: React.ReactNode; value: number }) => (
  <div 
    className="flex items-center gap-1.5"
    style={{
      fontFamily: '"DM Sans", sans-serif',
      fontVariantNumeric: 'tabular-nums', // 确保数字等宽，防止跳动
      userSelect: 'none', // 防止文本被选中
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      cursor: 'default', // 确保鼠标样式不是可点击的
      pointerEvents: 'none', // 完全禁用交互
    }}
  >
    {React.cloneElement(icon as any, { 
      className: "w-3.5 h-3.5",
      strokeWidth: 2,
      style: { color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))' }
    })}
    <span style={{
      fontSize: '0.8rem', // 13px
      fontWeight: 600,
      color: 'var(--c-content)',
    }}>
      {value}
    </span>
  </div>
);

// 2. [新] 定义一个合理的默认高度（基于我们之前的值），以防止0高度闪烁
const DEFAULT_HEADER_HEIGHT = 124; // 7.75rem

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
      // 创建一个 ResizeObserver 来监听浮动头部的任何尺寸变化
      const resizeObserver = new ResizeObserver(entries => {
        // 当浮动头部高度变化时，立即更新占位符的高度
        for (let entry of entries) {
          const newHeight = entry.contentRect.height;
          // 增加 1rem (16px) 的额外间距
          setHeaderHeight(newHeight + 16);
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

      {/* B. 浮动在顶层的 UI (使用 absolute) */}
      {/* 我们将 TopBar 和 TabSwitcher 包装在
        一个带 ref 的父级 div 中，以便测量它们的总高度。
      */}
      <div 
        ref={floatingHeaderRef} // [关键] 绑定 ref 来测量
        className="absolute top-0 left-0 right-0 z-20"
        style={{ pointerEvents: 'none' }} 
      >
        {/* TopBar (z-index: 50) - 使用现有内联的统计和设置按钮 */}
        <div className="relative pt-2 px-4 pb-3 space-y-2 flex-shrink-0 z-50" style={{ pointerEvents: 'auto' }}>
          {/* [3] [!!] 顶部 HUD (Stats + Settings)
              - 它们现在是"环境UI"，而不是一个"Bar"
          */}
          <div className="flex items-center justify-between">
            
            {/* 左侧：图标化统计 */}
            <div className="flex items-center gap-4">
              <StatItem icon={<FileText />} value={MOCK_TODAY_PAGES} />
              <StatItem icon={<TagIcon />} value={MOCK_TODAY_TAGS} />
            </div>
            
            {/* 右侧：[!!] 无感的设置按钮 */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg p-1.5 transition-all"
              style={{
                background: 'transparent', // [!!] 完全无背景
                border: 'none', // [!!] 完全无边框
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
              <Settings className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
        
        {/* TabSwitcher 容器 (z-index: 10) */}
        <div 
          className="w-full max-w-md" 
          style={{ 
            pointerEvents: 'auto', 
            // (3rem TopBar + 0.5rem 间距)
            paddingTop: '0.5rem', 
            paddingLeft: '1rem',
            paddingRight: '1rem',
            display: 'flex',
            justifyContent: 'center',
            // 注意：不再需要 absolute，因为它已在 ref 容器的文档流中
          }}
        >
          <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}
