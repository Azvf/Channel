import React, { useState, useLayoutEffect, useRef } from "react";
import { TaggingPage } from "./components/TaggingPage";
import { TaggedPage } from "./components/TaggedPage";
import { TabSwitcher } from "./components/TabSwitcher";
import { SettingsModal } from "./components/SettingsModal";
import { StatsWallModal } from "./components/StatsWallModal";
import { TagManagementPage } from "./components/TagManagementPage";
import { storageService, STORAGE_KEYS } from "../services/storageService";
import { usePageSettings } from "./utils/usePageSettings";
import type { AppInitialState } from "../services/appInitService";

interface AppProps {
  initialState: AppInitialState;
}

const DEFAULT_HEADER_HEIGHT = 60; // 52px (Switcher) + 8px (Gap)

export default function App({ initialState }: AppProps) {
  const [activeTab, setActiveTab] = useState<"tagging" | "tagged">(initialState.activeTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsWallOpen, setIsStatsWallOpen] = useState(false);
  const [isTagLibraryOpen, setIsTagLibraryOpen] = useState(false);

  usePageSettings(initialState.pageSettings);

  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const floatingHeaderRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!floatingHeaderRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height);
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
        className="relative flex-1 p-4"
        style={{
          minHeight: 0,
          overflowY: "auto",
        }}
      >
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
          className="relative w-full max-w-md flex justify-center items-center px-4 pt-3 h-11"
          style={{ pointerEvents: "auto" }}
        >
          <div
            className="channel-title-anchor"
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--c-content)",
              cursor: "default",
              userSelect: "none",
            }}
          >
            Channel
          </div>
        </div>

        <div
          className="w-full max-w-md flex justify-center px-4 pt-2"
          style={{ pointerEvents: "auto" }}
        >
          <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}
