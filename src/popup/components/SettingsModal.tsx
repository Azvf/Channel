import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, Download, Upload, Sun, AppWindow, Video, Bookmark,
} from 'lucide-react';
import { FunctionalModal } from './FunctionalModal';
import { Checkbox } from './ui/checkbox';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { SettingsSectionTitle } from './SettingsSectionTitle';
import { AccountSection } from './settings/AccountSection';
import { usePageSettings } from '../utils/usePageSettings';
import { DEFAULT_PAGE_SETTINGS } from '../../shared/types/pageSettings';
import { currentPageService } from '../../services/popup/currentPageService';
import { AlertModal, type AlertModalProps } from './AlertModal';
import { applyThemeToBody } from '../utils/theme';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme: string;
}

export function SettingsModal({ isOpen, onClose, initialTheme }: SettingsModalProps) {
  // 1. 全局 Hook 状态
  const { settings, updateSyncVideoTimestamp } = usePageSettings(DEFAULT_PAGE_SETTINGS);
  
  // 2. 本地 UI 状态
  const [theme, setTheme] = useState<string>(initialTheme);
  const [selectedAppIcon, setSelectedAppIcon] = useState<string>('default');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingBookmarks, setIsImportingBookmarks] = useState(false);
  const [alertState, setAlertState] = useState<Omit<AlertModalProps, 'isOpen' | 'onClose'> | null>(null);
  
  // 3. Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 主题选项配置
  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dim', label: 'Dim' },
    { value: 'rhine-light', label: 'Rhine Light' },
    { value: 'rhine-dark', label: 'Rhine Dark' },
  ];

  // 主题切换处理函数
  const handleThemeChange = async () => {
    const currentIndex = themeOptions.findIndex(opt => opt.value === theme);
    const nextIndex = (currentIndex + 1) % themeOptions.length;
    const newTheme = themeOptions[nextIndex].value;
    
    setTheme(newTheme);
    await storageService.set(STORAGE_KEYS.THEME, newTheme);
    applyThemeToBody(newTheme);
  };

  // 获取当前主题显示名称
  const getCurrentThemeLabel = () => {
    return themeOptions.find(opt => opt.value === theme)?.label || 'Light';
  };

  // 同步 initialTheme 的变化
  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  // 4. Event Handlers (业务逻辑)
  // 注意：这部分逻辑如果进一步膨胀，可以抽取为 useDataImportExport Hook
  const confirmImport = async (text: string, mergeMode: boolean) => {
    setAlertState(null);
    setIsImporting(true);
    try {
      const result = await currentPageService.importData(text, mergeMode);

      setAlertState({
        title: '导入成功',
        intent: 'info',
        children: `成功导入 ${result.tagsCount || 0} 个标签和 ${result.pagesCount || 0} 个页面。应用将刷新。`,
        actions: [{ id: 'reload', label: '刷新应用', variant: 'primary', onClick: () => window.location.reload() }],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAlertState({ title: '导入失败', intent: 'destructive', children: errorMessage, actions: [{ id: 'ok', label: '好的', variant: 'primary', onClick: () => setAlertState(null) }] });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const jsonData = await currentPageService.exportData();

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `channel-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_error) {
      setAlertState({ title: '导出失败', intent: 'destructive', children: '导出数据时发生错误，请重试。', actions: [{ id: 'ok', label: '好的', variant: 'primary', onClick: () => setAlertState(null) }] });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    if (!text) { if (fileInputRef.current) fileInputRef.current.value = ''; return; }

    setAlertState({
      title: '选择导入模式',
      intent: 'info',
      children: (<span>你希望如何导入数据？<br />- <b>合并 (推荐):</b> 保留现有数据，仅添加新数据。<br />- <b>覆盖:</b> 删除所有现有数据，替换为导入的数据。</span>),
      actions: [
        { id: 'overwrite', label: '覆盖', variant: 'destructive', onClick: () => confirmImport(text, false) },
        { id: 'merge', label: '合并 (推荐)', variant: 'primary', onClick: () => confirmImport(text, true), autoFocus: true },
      ],
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportBookmarks = async () => {
    setIsImportingBookmarks(true);
    setAlertState(null);
    
    try {
      const result = await currentPageService.importBookmarks();
      
      const successMessage = (
        <div>
          <p style={{ marginBottom: 'var(--space-2)' }}>
            书签导入完成
          </p>
          <div style={{ 
            fontSize: 'var(--font-footnote)', 
            color: 'var(--color-text-secondary)',
            lineHeight: '1.5'
          }}>
            <p>处理的页面: {result.pagesProcessed}</p>
            <p>创建的标签: {result.tagsCreated}</p>
            <p>添加的标签: {result.tagsAdded}</p>
            {result.errors.length > 0 && (
              <p style={{ color: 'var(--color-text-warning)', marginTop: 'var(--space-2)' }}>
                错误: {result.errors.length} 个
              </p>
            )}
          </div>
        </div>
      );

      setAlertState({
        title: '导入完成',
        intent: 'info',
        children: successMessage,
        actions: [
          { 
            id: 'ok', 
            label: '好的', 
            variant: 'primary', 
            onClick: () => {
              setAlertState(null);
              // 刷新页面以显示新导入的数据
              window.location.reload();
            } 
          },
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      let solution = '请检查扩展权限设置，确保已授予书签访问权限。';
      if (errorMessage.includes('权限')) {
        solution = '请在扩展设置中启用书签权限，然后重试。';
      } else if (errorMessage.includes('上下文')) {
        solution = '请刷新扩展或重新加载页面后重试。';
      }

      setAlertState({
        title: '导入失败',
        intent: 'destructive',
        children: (
          <div>
            <p style={{ marginBottom: 'var(--space-2)' }}>{errorMessage}</p>
            <p style={{ 
              fontSize: 'var(--font-footnote)', 
              color: 'var(--color-text-secondary)' 
            }}>
              {solution}
            </p>
          </div>
        ),
        actions: [
          { 
            id: 'ok', 
            label: '好的', 
            variant: 'primary', 
            onClick: () => setAlertState(null) 
          },
        ],
      });
    } finally {
      setIsImportingBookmarks(false);
    }
  };

  const appIconOptions = [
    { id: 'default', name: 'Default' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'sapphire', name: 'Sapphire' },
    { id: 'ruby', name: 'Ruby' },
  ];

  return (
    <>
      <FunctionalModal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        glassCardStyle={{
          padding: 'var(--space-5)',
        }}
        contentClassName="scrollbar-hide"
        contentStyle={{
          paddingRight: 'var(--space-2)',
          marginTop: 'var(--space-4)',
        }}
      >
        {/* 模块化组件: 账户部分 */}
        <AccountSection />

        <SettingsSectionTitle style={{ marginTop: 0 }}>GENERAL</SettingsSectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon={<Sun className="icon-base" strokeWidth={1.5} />}
            label="Theme"
            value={getCurrentThemeLabel()}
            control={<ChevronRight className="icon-base" strokeWidth={1.5} />}
            onClick={handleThemeChange}
          />
          <SettingsRow
            icon={<AppWindow className="icon-base" strokeWidth={1.5} />}
            label="App Icon"
            value={appIconOptions.find(opt => opt.id === selectedAppIcon)?.name || 'Default'}
            control={<ChevronRight className="icon-base" strokeWidth={1.5} />}
            onClick={() => {
              const currentIndex = appIconOptions.findIndex(opt => opt.id === selectedAppIcon);
              const nextIndex = (currentIndex + 1) % appIconOptions.length;
              setSelectedAppIcon(appIconOptions[nextIndex].id);
            }}
          />
          <SettingsRow
            icon={<Video className="icon-base" strokeWidth={1.5} />}
            label="Sync Video Timestamp"
            control={
              <Checkbox
                id="sync-video-timestamp"
                checked={settings.syncVideoTimestamp}
                onCheckedChange={updateSyncVideoTimestamp}
              />
            }
          />
        </SettingsGroup>

        <SettingsSectionTitle>DATA</SettingsSectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon={<Upload className="icon-base" strokeWidth={1.5} />}
            label="Import Data..."
            control={<ChevronRight className="icon-base" strokeWidth={1.5} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          />
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportData} />

          <SettingsRow
            icon={<Bookmark className="icon-base" strokeWidth={1.5} />}
            label="Import from Bookmarks..."
            control={<ChevronRight className="icon-base" strokeWidth={1.5} />}
            onClick={handleImportBookmarks}
            disabled={isImportingBookmarks}
          />

          <SettingsRow
            icon={<Download className="icon-base" strokeWidth={1.5} />}
            label="Export Data..."
            control={<ChevronRight className="icon-base" strokeWidth={1.5} />}
            onClick={handleExportData}
            disabled={isExporting}
          />
        </SettingsGroup>

        <div className="text-center" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>
          <span style={{ 
            color: 'var(--color-text-tertiary)', 
            font: 'var(--font-caption)',
            letterSpacing: 'var(--letter-spacing-caption)',
            fontWeight: 500 
          }}>
            Version 1.0.0
          </span>
        </div>
      </FunctionalModal>

      <AlertModal
        isOpen={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || '提示'}
        intent={alertState?.intent || 'info'}
        actions={alertState?.actions || []}
      >
        {alertState?.children}
      </AlertModal>
    </>
  );
}
