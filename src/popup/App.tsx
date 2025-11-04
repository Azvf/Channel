import { useState } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { TabSwitcher } from "./components/TabSwitcher";
import { SettingsModal } from "./components/SettingsModal";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import { usePageSettings } from "./utils/usePageSettings";
import type { AppInitialState } from "../services/appInitService";
import { Settings } from "lucide-react";

interface AppProps {
  initialState: AppInitialState;
}

export default function App({ initialState }: AppProps) {
  // 使用初始状态，避免页面闪烁
  const [activeTab, setActiveTab] = useState<"tagging" | "tagged">(initialState.activeTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      
      {/* 设置按钮 (Trigger) - 浮动在右上角 */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-4 right-4 z-50 rounded-lg p-2 transition-all"
        style={{
          background: 'color-mix(in srgb, var(--c-glass) 18%, transparent)',
          backdropFilter: 'blur(8px)',
          border: '1.5px solid color-mix(in srgb, var(--c-glass) 28%, transparent)',
          color: 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 20%, transparent)';
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-action) 45%, transparent)';
          e.currentTarget.style.color = 'var(--c-action)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 18%, transparent)';
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 28%, transparent)';
          e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 65%, var(--c-bg))';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Settings className="w-4 h-4" strokeWidth={2} />
      </button>

      {/* Tab 切换器：绝对定位，浮动在内容之上 */}
      <div 
        className="absolute top-0 left-0 right-0 tab-switcher-container" 
        style={{ 
          pointerEvents: 'none',
          zIndex: 10,
          paddingTop: '1.5rem',
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

      {/* Tab 内容区：占据全部空间并可滚动，顶部留出 TabSwitcher 的空间 */}
      <div 
        className="relative flex-1 px-4 pb-4" 
        style={{ 
          minHeight: 0, 
          overflowY: 'auto',
          paddingTop: '5.5rem'
        }}
      >
        {activeTab === "tagging" ? (
          <TaggingPage pageSettings={pageSettings} />
        ) : (
          <TaggedPage />
        )}
      </div>
    </div>
  );
}
