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

  // 滚动位置管理：为每个 tab 保存滚动位置
  const scrollPositionsRef = useRef<Record<'tagging' | 'tagged', number>>({
    tagging: 0,
    tagged: 0,
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // 监听滚动事件，保存当前 tab 的滚动位置
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      scrollPositionsRef.current[activeTab] = scrollContainer.scrollTop;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  // 恢复滚动位置：在 tab 切换后恢复目标 tab 的滚动位置
  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const savedPosition = scrollPositionsRef.current[activeTab];
    
    // 使用 requestAnimationFrame 确保在浏览器重绘前恢复位置
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = savedPosition;
    });
  }, [activeTab]);

  // 确保在浮动 header 区域也能滚动：将 wheel 事件转发到滚动容器
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const floatingHeader = floatingHeaderRef.current;
    
    if (!scrollContainer || !floatingHeader) return;

    const handleWheel = (e: WheelEvent) => {
      // 检查事件是否发生在浮动 header 或其子元素上
      const target = e.target as HTMLElement;
      if (floatingHeader.contains(target) || floatingHeader === target) {
        // 如果滚动容器可以滚动，将 wheel 事件转发到滚动容器
        const canScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
        if (canScroll) {
          // 阻止默认行为，手动滚动
          e.preventDefault();
          scrollContainer.scrollBy({
            top: e.deltaY,
            behavior: 'auto',
          });
        }
      }
    };

    // 在捕获阶段监听，确保可以拦截事件
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, [activeTab]);

  const handleTabChange = async (tab: "tagging" | "tagged") => {
    // 保存当前 tab 的滚动位置
    if (scrollContainerRef.current) {
      scrollPositionsRef.current[activeTab] = scrollContainerRef.current.scrollTop;
    }
    
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
        ref={scrollContainerRef}
        className="relative flex-1"
        style={{
          minHeight: 0,
          overflowY: "auto",
          // [Refactor] 使用标准内边距
          padding: "var(--container-padding)",
          // 确保 scrollbar 区域始终可交互，不受浮动 header 影响
          pointerEvents: "auto",
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
          // 确保不覆盖 scrollbar 区域：虽然设置了 pointerEvents: "none"，
          // 但为了更好的兼容性，限制内容区域不延伸到 scrollbar
          // 内部元素已有 max-w-md 类，确保内容居中且不覆盖 scrollbar
        }}
      >
        <div
          className="relative max-w-md flex justify-center items-center"
          style={{ 
            pointerEvents: "auto",
            // 限制宽度，不覆盖 scrollbar 区域：使用 calc 减去 container padding 和 scrollbar 空间
            // 使用 --sb-width token 加上安全边距（--space-2）确保不覆盖 scrollbar
            width: "calc(100% - var(--container-padding) - var(--sb-width) - var(--space-2))",
            maxWidth: "var(--modal-max-width)",
            marginLeft: "var(--container-padding)",
            marginTop: "var(--space-3)",
            height: "var(--row-min-height)",
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
