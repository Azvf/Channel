import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { TabSwitcher } from "./components/TabSwitcher";
import { SettingsModal } from "./components/SettingsModal";
import { StatsWallModal } from "./components/StatsWallModal";
import { TagManagementPage } from "./components/TagManagementPage";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import { usePageSettings } from "./utils/usePageSettings";
import type { AppInitialState } from "../services/appInitService";
import { DURATION, EASE, DELAY, getDurationMs, getEaseString } from "../design-tokens/animation"; // [Refactor] 引入物理引擎

interface AppProps {
  initialState: AppInitialState;
}

export default function App({ initialState }: AppProps) {
  const [activeTab, setActiveTab] = useState<"tagging" | "tagged">(initialState.activeTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsWallOpen, setIsStatsWallOpen] = useState(false);
  const [isTagLibraryOpen, setIsTagLibraryOpen] = useState(false);

  usePageSettings(initialState.pageSettings);

  // [Refactor] 运行时同步动画 Token 到 CSS 变量
  // 确保 CSS 和 JS 运行在统一的时间流速上
  useEffect(() => {
    const root = document.documentElement;
    
    // 将 JS 常量写入 CSS 变量
    root.style.setProperty('--transition-fast', getDurationMs(DURATION.FAST));
    root.style.setProperty('--transition-base', getDurationMs(DURATION.BASE));
    root.style.setProperty('--transition-slow', getDurationMs(DURATION.SLOW));
    root.style.setProperty('--transition-hero', `${700}ms`); // Hero 动画专用
    
    root.style.setProperty('--ease-smooth', getEaseString(EASE.SMOOTH));
    root.style.setProperty('--ease-glass', getEaseString(EASE.OUT_CUBIC)); // 使用 OUT_CUBIC 作为 glass 缓动
    
    // [Refactor] 同步延迟常量到 CSS（如果需要）
    root.style.setProperty('--delay-instant', getDurationMs(DELAY.INSTANT));
    root.style.setProperty('--delay-short', getDurationMs(DELAY.SHORT));
  }, []);

  // [Refactor] 不再依赖 JS 状态计算高度，改为 CSS 变量控制布局
  // 如果需要动态测量（例如 Header 内容变化），可以使用 ResizeObserver 更新 CSS 变量
  const [headerHeight, setHeaderHeight] = useState(60); 
  const floatingHeaderRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!floatingHeaderRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height);
        // 可选：将高度写回 CSS 变量，供子组件使用
        document.documentElement.style.setProperty('--header-real-height', `${entry.contentRect.height}px`);
      }
    });

    resizeObserver.observe(floatingHeaderRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleTabChange = async (tab: "tagging" | "tagged") => {
    setActiveTab(tab);
    try {
      await storageService.set(STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch (error) {
      console.error("保存标签页状态失败", error);
    }
  };

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTheme={initialState.theme}
      />
      <StatsWallModal
        isOpen={isStatsWallOpen}
        onClose={() => setIsStatsWallOpen(false)}
      />
      <TagManagementPage
        isOpen={isTagLibraryOpen}
        onClose={() => setIsTagLibraryOpen(false)}
      />

      <div
        className="relative flex-1"
        style={{
          minHeight: 0,
          overflowY: "auto",
          // [Refactor] 使用标准内边距
          padding: "var(--container-padding)", 
        }}
      >
        {/* Spacer for Floating Header */}
        <div style={{ height: `${headerHeight}px`, flexShrink: 0 }} />

        {activeTab === "tagging" ? (
          <TaggingPage />
        ) : (
          <TaggedPage
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenStats={() => setIsStatsWallOpen(true)}
            onOpenTagLibrary={() => setIsTagLibraryOpen(true)}
          />
        )}
      </div>

      <div
        ref={floatingHeaderRef}
        className="absolute top-0 left-0 right-0 flex flex-col items-center"
        style={{
          pointerEvents: "none",
          zIndex: "var(--z-app-header)",
        }}
      >
        <div
          className="relative w-full max-w-md flex justify-center items-center"
          style={{ 
            pointerEvents: "auto",

            height: "var(--row-min-height)", // 44px

            marginTop: "var(--space-3)" // 12px top margin

          }}
        >
          <div
            className="channel-title-anchor"
            style={{
              // [Refactor] 使用 Typography Tokens
              font: "var(--font-header-title)",
              letterSpacing: "var(--letter-spacing-header-title)",
              color: "var(--color-text-primary)",
              cursor: "default",
              userSelect: "none",
            }}
          >
            Channel
          </div>
        </div>

        <div
          className="w-full max-w-md flex justify-center"
          style={{ 
            pointerEvents: "auto",

            padding: "var(--space-2) var(--container-padding) 0" 

          }}
        >
          <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}
