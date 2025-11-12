import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Download, Upload, Sun, AppWindow, Video } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ModalHeader } from './ModalHeader';
import { Checkbox } from './ui/checkbox';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { SettingsSectionTitle } from './SettingsSectionTitle';
import { usePageSettings } from '../utils/usePageSettings';
import { DEFAULT_PAGE_SETTINGS } from '../../types/pageSettings';
import { currentPageService } from '../../services/popup/currentPageService';
import { AlertModal, type AlertModalProps } from './AlertModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme: string;
}

export function SettingsModal({ isOpen, onClose, initialTheme }: SettingsModalProps) {
  // 使用 pageSettings hook 管理"同步视频时间戳"设置
  const pageSettings = usePageSettings(DEFAULT_PAGE_SETTINGS);
  const { settings, updateSyncVideoTimestamp } = pageSettings;
  const syncVideoTimestamp = settings.syncVideoTimestamp;

  const [selectedAppIcon, setSelectedAppIcon] = useState<string>('default');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertState, setAlertState] = useState<Omit<AlertModalProps, 'isOpen' | 'onClose'> | null>(null);

  const handleSyncVideoTimestampChange = (checked: boolean) => {
    updateSyncVideoTimestamp(checked);
  };

  const confirmImport = async (text: string, mergeMode: boolean) => {
    setAlertState(null);
    setIsImporting(true);

    try {
      const result = await currentPageService.importData(text, mergeMode);

      setAlertState({
        title: '导入成功',
        intent: 'info',
        children: `成功导入 ${result.tagsCount || 0} 个标签和 ${result.pagesCount || 0} 个页面。应用将刷新。`,
        actions: [
          {
            id: 'reload',
            label: '刷新应用',
            variant: 'primary',
            onClick: () => window.location.reload(),
          },
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAlertState({
        title: '导入失败',
        intent: 'destructive',
        children: errorMessage,
        actions: [
          { id: 'ok', label: '好的', variant: 'primary', onClick: () => setAlertState(null) },
        ],
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 导出数据
  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const jsonData = await currentPageService.exportData();
      
      // 创建下载链接
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `channel-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出数据失败:', error);
      setAlertState({
        title: '导出失败',
        intent: 'destructive',
        children: '导出数据时发生错误，请重试。',
        actions: [
          { id: 'ok', label: '好的', variant: 'primary', onClick: () => setAlertState(null) },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 导入数据
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    if (!text) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setAlertState({
      title: '选择导入模式',
      intent: 'info',
      children: (
        <span>
          你希望如何导入数据？
          <br />
          - <b>合并 (推荐):</b> 保留现有数据，仅添加新数据。
          <br />
          - <b>覆盖:</b> 删除所有现有数据，替换为导入的数据。
        </span>
      ),
      actions: [
        {
          id: 'overwrite',
          label: '覆盖',
          variant: 'destructive',
          onClick: () => confirmImport(text, false),
        },
        {
          id: 'merge',
          label: '合并 (推荐)',
          variant: 'primary',
          onClick: () => confirmImport(text, true),
          autoFocus: true,
        },
      ],
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // App Icon 选项（占位符，未来可以扩展）
  const appIconOptions = [
    { id: 'default', name: 'Default' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'sapphire', name: 'Sapphire' },
    { id: 'ruby', name: 'Ruby' },
  ];

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  const modalContent = (
    <motion.div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 'var(--z-modal-layer)',
        background: 'color-mix(in srgb, var(--c-bg) 20%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm"
        variants={modalVariants}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing on modal click
        style={{ maxHeight: '90vh', display: 'flex' }}
      >
        <GlassCard 
          className="p-5 flex flex-col" 
          style={{ 
            width: '100%', 
            maxHeight: '90vh',
            backgroundColor: 'color-mix(in srgb, var(--c-bg) 80%, var(--c-glass) 15%)',
            backdropFilter: 'blur(16px) saturate(var(--saturation))',
            WebkitBackdropFilter: 'blur(16px) saturate(var(--saturation))',
            border: '1px solid color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 30%), transparent)'
          }}
        >
          {/* Header - 使用标准化的 ModalHeader */}
          <ModalHeader title="Settings" onClose={onClose} />

          {/* ScrollableContent */}
          <div
            className="flex-1 overflow-y-auto"
            style={{
              minHeight: 0,
              paddingRight: '0.5rem',
              marginTop: '1rem',
            }}
          >
              <>
            {/* GENERAL Section */}
            <SettingsSectionTitle style={{ marginTop: 0 }}>GENERAL</SettingsSectionTitle>
            <SettingsGroup>
              <SettingsRow
                icon={<Sun className="w-4 h-4" strokeWidth={1.5} />}
                label="Theme"
                control={<ThemeSwitcher initialTheme={initialTheme} />}
              />
              
              <SettingsRow
                icon={<AppWindow className="w-4 h-4" strokeWidth={1.5} />}
                label="App Icon"
                value={appIconOptions.find(opt => opt.id === selectedAppIcon)?.name || 'Default'}
                control={<ChevronRight className="w-4 h-4" strokeWidth={1.5} />}
                onClick={() => {
                  // TODO: 打开 App Icon 选择页
                  // 临时循环切换
                  const currentIndex = appIconOptions.findIndex(opt => opt.id === selectedAppIcon);
                  const nextIndex = (currentIndex + 1) % appIconOptions.length;
                  setSelectedAppIcon(appIconOptions[nextIndex].id);
                }}
              />
              
              <SettingsRow
                icon={<Video className="w-4 h-4" strokeWidth={1.5} />}
                label="Sync Video Timestamp"
                control={
                  <Checkbox
                    id="sync-video-timestamp"
                    checked={syncVideoTimestamp}
                    onCheckedChange={handleSyncVideoTimestampChange}
                  />
                }
              />
            </SettingsGroup>

            {/* LIBRARY Section */}
            {/* DATA Section */}
            <SettingsSectionTitle>DATA</SettingsSectionTitle>
            <SettingsGroup>
              <SettingsRow
                icon={<Upload className="w-4 h-4" strokeWidth={1.5} />}
                label="Import Data..."
                control={<ChevronRight className="w-4 h-4" strokeWidth={1.5} />}
                onClick={handleImportClick}
                disabled={isImporting}
              />
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportData}
              />
              
              <SettingsRow
                icon={<Download className="w-4 h-4" strokeWidth={1.5} />}
                label="Export Data..."
                control={<ChevronRight className="w-4 h-4" strokeWidth={1.5} />}
                onClick={handleExportData}
                disabled={isExporting}
              />
            </SettingsGroup>

            {/* Footer */}
            <div className="text-center mt-6" style={{ marginBottom: '0.5rem' }}>
              <span style={{ 
                color: 'color-mix(in srgb, var(--c-content) 40%, transparent)',
                fontSize: '0.75rem',
                fontWeight: 500
              }}>
                Version 1.0.0
              </span>
            </div>
              </>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && modalContent}
      </AnimatePresence>

      <AlertModal
        isOpen={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || '提示'}
        intent={alertState?.intent || 'info'}
        actions={alertState?.actions || []}
      >
        {alertState?.children}
      </AlertModal>
    </>,
    document.body
  );
}
