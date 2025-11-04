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
    <div className="min-h-screen relative">
      {/* Theme Switcher - Hidden in bottom right */}
      <ThemeSwitcher initialTheme={initialState.theme} />
      
      {/* Settings Modal - Rendered via Portal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Main content container */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          
          {/* Header with Title and Settings */}
          <div className="pt-6 pb-2 flex justify-between items-center">
            <h1 
              className="m-0"
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--c-content)',
                letterSpacing: '-0.02em',
              }}
            >
              Channel
            </h1>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg p-2 transition-all"
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
          </div>

          {/* Tab navigation with glass effect - moved to top with minimal spacing */}
          <div className="pt-2 pb-4 w-full">
            <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "tagging" ? (
              <TaggingPage pageSettings={pageSettings} />
            ) : (
              <TaggedPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
