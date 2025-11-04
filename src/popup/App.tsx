import { useState } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { TabSwitcher } from "./components/TabSwitcher";
import { SettingsModal } from "./components/SettingsModal";
import { StatsCluster } from "./components/StatsCluster";
import { StatsWallModal } from "./components/StatsWallModal";
import { TopBar } from "./components/TopBar";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import { usePageSettings } from "./utils/usePageSettings";
import type { AppInitialState } from "../services/appInitService";

interface AppProps {
  initialState: AppInitialState;
}

export default function App({ initialState }: AppProps) {
  // 使用初始状态，避免页面闪烁
  const [activeTab, setActiveTab] = useState<"tagging" | "tagged">(initialState.activeTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsWallOpen, setIsStatsWallOpen] = useState(false);

  // 统一管理页面设置（在App层面，确保切换页面时状态一致）
  // 传入初始设置避免首次渲染闪烁，然后hook会自动从存储同步最新值
  const pageSettings = usePageSettings(initialState.pageSettings);

  // 保存标签页状态
  const handleTabChange = async (tab: "tagging" | "tagged") => {
    setActiveTab(tab);
    try {
      await storageService.set(STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch (error) {
      console.error('保存标签页状态失败:', error);
    }
  };

  return (
    <div 
      className="relative flex h-full flex-col" 
      style={{ 
        width: '360px',
        height: '560px',
        background: 'transparent'
      }}
    >
      {/* Theme Switcher - Hidden in bottom right */}
      <ThemeSwitcher initialTheme={initialState.theme} />
      
      {/* Settings Modal - Rendered via Portal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Stats Wall Modal - 像素画廊 */}
      <StatsWallModal 
        isOpen={isStatsWallOpen} 
        onClose={() => setIsStatsWallOpen(false)} 
      />
      
      {/* (V4) TopBar - 紧贴顶部 */}
      <TopBar 
        onOpenStatsWall={() => setIsStatsWallOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* (V4) Tab 切换器 - 布局调整 */}
      <div 
        className="absolute top-0 left-0 right-0 tab-switcher-container" 
        style={{ 
          pointerEvents: 'none',
          zIndex: 10,
          /* (V4) 调整 paddingTop:
             TopBar 高度 3rem (48px) + 0.5rem (8px) 间距 = 3.5rem (56px)
          */
          paddingTop: '3.5rem', /* 56px */
          paddingLeft: '1rem',
          paddingRight: '1rem',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div 
          className="w-full max-w-md" 
          style={{ pointerEvents: 'auto' }}
        >
          <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>

      {/* (V4) 内容区 - 布局调整 */}
      <div 
        className="relative flex-1 px-4 pb-4" 
        style={{ 
          minHeight: 0, 
          overflowY: 'auto',
          /* (V4) 调整 paddingTop:
             TopBar (56px) + TabSwitcher (~52px) + 1rem (16px) 间距 = ~124px
          */
          paddingTop: '7.75rem', /* 124px */
          
          paddingBottom: '1.5rem' /* 恢复底部内边距 */
        }}
      >
        {activeTab === "tagging" ? (
          <TaggingPage pageSettings={pageSettings} />
        ) : (
          <TaggedPage />
        )}
        
        {/* Stats Cluster - 统计按钮组 */}
        <StatsCluster 
          onStatClick={() => {
            setIsStatsWallOpen(true);
          }}
        />
      </div>
    </div>
  );
}
