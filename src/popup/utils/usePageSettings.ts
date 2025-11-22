/**
 * 统一的页面设置管理 Hook
 * 用于统一管理页面设置的加载、更新和同步
 * 确保打开插件和切换页面时使用同一套接口
 */

import { useState, useEffect, useCallback } from 'react';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { PageSettings, DEFAULT_PAGE_SETTINGS } from '../../shared/types/pageSettings';

/**
 * 从存储中加载页面设置
 * 验证逻辑与其他地方保持一致（appInitService, background.ts）
 */
async function loadPageSettingsFromStorage(): Promise<PageSettings> {
  const stored = await storageService.get<PageSettings>(STORAGE_KEYS.PAGE_SETTINGS);
  return {
    syncVideoTimestamp: typeof stored?.syncVideoTimestamp === 'boolean' 
      ? stored.syncVideoTimestamp 
      : DEFAULT_PAGE_SETTINGS.syncVideoTimestamp,
  };
}

/**
 * 保存页面设置到存储
 */
async function savePageSettingsToStorage(settings: PageSettings): Promise<void> {
  await storageService.set(STORAGE_KEYS.PAGE_SETTINGS, settings);
}

/**
 * 页面设置管理 Hook
 * 
 * @param initialSettings - 初始设置（用于首次渲染，避免闪烁）
 * @returns 页面设置状态和更新函数
 */
export function usePageSettings(initialSettings?: PageSettings) {
  // 使用初始设置作为初始状态（如果有），否则使用默认值
  // 这样首次渲染就能显示正确的值，避免闪烁
  const [settings, setSettings] = useState<PageSettings>(() => 
    initialSettings || DEFAULT_PAGE_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(!initialSettings); // 如果有初始值，不需要加载
  const [error, setError] = useState<Error | null>(null);

  // 加载设置（在挂载时执行，确保获取最新值）
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        // 如果有初始值，不设置loading状态（避免闪烁）
        if (!initialSettings) {
          setIsLoading(true);
        }
        setError(null);
        const loadedSettings = await loadPageSettingsFromStorage();
        
        // 只在组件仍然挂载时更新状态
        if (isMounted) {
          // 只有当加载的值与初始值不同时才更新（避免不必要的状态更新）
          if (!initialSettings || 
              loadedSettings.syncVideoTimestamp !== initialSettings.syncVideoTimestamp) {
            setSettings(loadedSettings);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          console.error('加载页面设置失败:', error);
        }
      }
    };

    // 加载最新设置以确保同步（有初始值时不会导致闪烁，因为初始渲染已经使用正确值）
    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []); // 只在挂载时执行一次，initialSettings 在 App 组件中是固定值，不会改变

  // 更新设置
  const updateSettings = useCallback(async (updates: Partial<PageSettings>) => {
    try {
      setError(null);
      
      // 计算新设置并更新状态
      const newSettings = await new Promise<PageSettings>((resolve) => {
        setSettings((currentSettings) => {
          const updated = {
            ...currentSettings,
            ...updates,
          };
          resolve(updated);
          return updated;
        });
      });

      // 保存到存储（等待完成以确保数据一致性）
      await savePageSettingsToStorage(newSettings);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('更新页面设置失败:', error);
      // 失败时重新加载（回滚）
      const reloaded = await loadPageSettingsFromStorage();
      setSettings(reloaded);
      throw error;
    }
  }, []);

  // 更新单个设置项的便捷方法
  const updateSyncVideoTimestamp = useCallback(async (value: boolean) => {
    await updateSettings({ syncVideoTimestamp: value });
  }, [updateSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateSyncVideoTimestamp,
    // 暴露同步刷新方法（用于外部需要强制刷新的场景）
    refresh: useCallback(async () => {
      const loaded = await loadPageSettingsFromStorage();
      setSettings(loaded);
    }, []),
  };
}

/**
 * 页面设置Hook的返回类型
 */
export type PageSettingsHook = ReturnType<typeof usePageSettings>;

