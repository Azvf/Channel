import { useState } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { TabSwitcher } from "./components/TabSwitcher";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import type { AppInitialState } from "../services/appInitService";

interface AppProps {
  initialState: AppInitialState;
}

export default function App({ initialState }: AppProps) {
  // 使用初始状态，避免页面闪烁
  const [activeTab, setActiveTab] = useState<"tagging" | "tagged">(initialState.activeTab);

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
      
      {/* Main content container */}
      <div className="relative z-10">
        <div className="container mx-auto px-6 max-w-5xl">
          {/* Tab navigation with glass effect - moved to top with minimal spacing */}
          <div className="pt-12 pb-8 max-w-md mx-auto w-full">
            <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "tagging" ? (
              <TaggingPage initialPageSettings={initialState.pageSettings} />
            ) : (
              <TaggedPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
