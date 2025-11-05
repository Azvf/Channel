import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Download, Upload, Sun, AppWindow, Video, Tag } from 'lucide-react';
import { dialogSlideIn } from '../utils/motion';
import { GlassCard } from './GlassCard';
import { ModalHeader } from './ModalHeader';
import { Checkbox } from './ui/checkbox';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { SettingsSectionTitle } from './SettingsSectionTitle';
import { TagManagementPage } from './TagManagementPage';
import { usePageSettings } from '../utils/usePageSettings';
import { DEFAULT_PAGE_SETTINGS } from '../../types/pageSettings';
import { TagManager } from '../../services/tagManager';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme: string;
}

type SettingsPage = 'main' | 'tagLibrary';

export function SettingsModal({ isOpen, onClose, initialTheme }: SettingsModalProps) {
  // 使用 pageSettings hook 管理"同步视频时间戳"设置
  const pageSettings = usePageSettings(DEFAULT_PAGE_SETTINGS);
  const { settings, updateSyncVideoTimestamp } = pageSettings;
  const syncVideoTimestamp = settings.syncVideoTimestamp;

  const [selectedAppIcon, setSelectedAppIcon] = useState<string>('default');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState<SettingsPage>('main');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleSyncVideoTimestampChange = (checked: boolean) => {
    updateSyncVideoTimestamp(checked);
  };

  // 导出数据
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      
      // 获取 TagManager 实例并初始化
      const tagManager = TagManager.getInstance();
      
      // 从存储中加载数据
      const storageData = await storageService.getMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES
      ]);
      
      tagManager.initialize({
        tags: storageData[STORAGE_KEYS.TAGS] || null,
        pages: storageData[STORAGE_KEYS.PAGES] || null
      });
      
      // 导出数据
      const jsonData = tagManager.exportData();
      
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
      alert('导出数据失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 导入数据
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      
      // 读取文件内容
      const text = await file.text();
      
      // 获取 TagManager 实例并初始化
      const tagManager = TagManager.getInstance();
      
      // 从存储中加载当前数据
      const storageData = await storageService.getMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES
      ]);
      
      tagManager.initialize({
        tags: storageData[STORAGE_KEYS.TAGS] || null,
        pages: storageData[STORAGE_KEYS.PAGES] || null
      });
      
      // 询问用户是覆盖还是合并
      const mergeMode = window.confirm(
        '导入模式选择：\n\n' +
        '点击"确定"：合并模式（保留现有数据，仅添加新数据）\n' +
        '点击"取消"：覆盖模式（完全替换现有数据）'
      );
      
      // 导入数据
      const result = await tagManager.importData(text, mergeMode);
      
      if (result.success) {
        // 同步到存储
        await tagManager.syncToStorage();
        
        alert(
          `导入成功！\n` +
          `标签：${result.imported?.tagsCount || 0} 个\n` +
          `页面：${result.imported?.pagesCount || 0} 个`
        );
        
        // 刷新页面以显示新数据
        window.location.reload();
      } else {
        alert(`导入失败：${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入数据失败，请检查文件格式是否正确');
    } finally {
      setIsImporting(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 使用原生 dialog API 管理打开/关闭状态
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      // 仅在 dialog 未打开时调用 showModal
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      // 仅在 dialog 已打开时调用 close
      // AnimatePresence 会在动画结束后移除 dialog
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // 处理 dialog 关闭事件（ESC 键或点击背景）
  const handleDialogClose = () => {
    onClose();
  };

  // App Icon 选项（占位符，未来可以扩展）
  const appIconOptions = [
    { id: 'default', name: 'Default' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'sapphire', name: 'Sapphire' },
    { id: 'ruby', name: 'Ruby' },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <dialog
          ref={dialogRef}
          onClose={handleDialogClose}
          onClick={(e) => {
            // 点击 dialog 本身（backdrop）时关闭
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          className="settings-dialog"
        >
          <motion.div
            variants={dialogSlideIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'calc(100% - 32px)',
              maxWidth: '384px',
              maxHeight: '90vh',
              display: 'flex',
            }}
          >
            <GlassCard
              className="flex flex-col"
              style={{
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
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
                  paddingLeft: '1.25rem',
                  paddingTop: '1rem',
                  paddingBottom: '1rem',
                }}
              >
            {currentPage === 'tagLibrary' ? (
              <TagManagementPage onBack={() => setCurrentPage('main')} />
            ) : (
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
            <SettingsSectionTitle>LIBRARY</SettingsSectionTitle>
            <SettingsGroup>
              <SettingsRow
                icon={<Tag className="w-4 h-4" strokeWidth={1.5} />}
                label="Manage Tags"
                control={<ChevronRight className="w-4 h-4" strokeWidth={1.5} />}
                onClick={() => setCurrentPage('tagLibrary')}
              />
            </SettingsGroup>

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
            )}
              </div>
            </GlassCard>
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>,
    document.body
  );
}
