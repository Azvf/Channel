import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, Download, Upload, Sun, AppWindow, Video, 
  User, Cloud, LogIn, ChevronDown, LogOut 
} from 'lucide-react';
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

// ---------------------------------------------------------------------------
// 图标组件: GoogleIcon 和 AppleIcon
// ---------------------------------------------------------------------------

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

// ---------------------------------------------------------------------------
// 社交登录按钮组件
// ---------------------------------------------------------------------------

interface SocialLoginButtonProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

const SocialLoginButton = ({ icon, label, disabled, onClick }: SocialLoginButtonProps) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'color-mix(in srgb, var(--c-glass) 20%, transparent)',
        border: '1px solid color-mix(in srgb, var(--c-light) 15%, transparent)',
        fontSize: '0.85rem',
        fontWeight: 500,
        color: 'var(--c-content)',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// 重构后的组件: AccountSection (保持一致性)
// ---------------------------------------------------------------------------

const AccountSection = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Mock Auth state
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // 使用 useCallback 稳定函数引用，立即更新状态，让动画自然过渡
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleLogin = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider);
    // 模拟登录过程
    setTimeout(() => {
      setIsLoggedIn(true);
      setLoadingProvider(null);
    }, 1500);
  };

  return (
    <div className="mb-6">
      <SettingsSectionTitle style={{ marginTop: 0 }}>ACCOUNT</SettingsSectionTitle>
      
      <SettingsGroup>
        {/* 1. 使用标准的 SettingsRow 作为头部触发器 */}
        <SettingsRow
          icon={
            isLoggedIn ? (
              <User className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <Cloud className="w-4 h-4" strokeWidth={1.5} />
            )
          }
          label={isLoggedIn ? "Alex Chen" : "Sync Data"}
          value={isLoggedIn ? "Pro Plan" : isExpanded ? "" : "Off"}
          control={
            <div 
              className="transition-transform duration-300"
              onClick={(e) => {
                // 让图标也能触发折叠/展开，但需要阻止冒泡到 SettingsRow 的右侧区域
                e.stopPropagation();
                toggleExpand();
              }}
              onMouseDown={(e) => {
                // 阻止 mousedown 事件冒泡
                e.stopPropagation();
              }}
              style={{ 
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            </div>
          }
          onClick={toggleExpand}
        />
        {/* 2. 展开内容区域 */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.2, 
                ease: [0.4, 0, 0.2, 1]
              }}
              style={{ 
                overflow: 'hidden',
                pointerEvents: 'auto'
              }}
            >
              {/* 分割线，保持微弱的视觉分隔 */}
              <div 
                style={{ 
                  height: '1px', 
                  background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
                  margin: '0 0.25rem 0.75rem 0.25rem'
                }} 
              />
              
              <div className="px-2 pb-2">
                {!isLoggedIn ? (
                  // State A: Guest / Logged Out
                  <div className="space-y-3">
                    <p 
                      style={{ 
                        fontSize: '0.8rem', 
                        color: 'color-mix(in srgb, var(--c-content) 70%, transparent)',
                        lineHeight: 1.4,
                        margin: 0
                      }}
                    >
                      Enable synchronization to backup your tags and access them across devices.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      {/* Google Login */}
                      <SocialLoginButton 
                        icon={loadingProvider === 'google' 
                          ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> 
                          : <GoogleIcon className="w-5 h-5" />
                        }
                        label="Google"
                        disabled={!!loadingProvider}
                        onClick={() => handleLogin('google')}
                      />

                      {/* Apple Login (预留示例) */}
                      <SocialLoginButton 
                        icon={<AppleIcon className="w-5 h-5" />}
                        label="Apple"
                        disabled={!!loadingProvider}
                        onClick={() => handleLogin('apple')}
                      />
                      
                      {/* 其他扩展点：Email 等 */}
                      {/* <SocialLoginButton icon={<Mail .../>} label="Email" ... /> */}
                    </div>
                    
                    <div className="text-center pt-1">
                       <span style={{ fontSize: '0.7rem', color: 'color-mix(in srgb, var(--c-content) 40%, transparent)' }}>
                         End-to-end encrypted
                       </span>
                    </div>
                  </div>
                ) : (
                  // State B: Logged In
                  <div className="space-y-3">
                    <div className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'color-mix(in srgb, var(--c-content) 60%, transparent)' }}>Email</span>
                      <span style={{ color: 'var(--c-content)', fontWeight: 500 }}>alex@example.com</span>
                    </div>
                    
                    <div className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'color-mix(in srgb, var(--c-content) 60%, transparent)' }}>Status</span>
                      <span style={{ color: 'var(--c-action)', fontWeight: 500 }}>Active</span>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsLoggedIn(false); }}
                        className="flex items-center gap-1.5 py-1 px-2 rounded-md hover-destructive transition-colors"
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                          background: 'transparent'
                        }}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsGroup>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 主组件: SettingsModal
// ---------------------------------------------------------------------------

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme: string;
}

export function SettingsModal({ isOpen, onClose, initialTheme }: SettingsModalProps) {
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

  // ... (Export/Import logic 保持不变) ...
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
    } catch (error) {
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

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const appIconOptions = [
    { id: 'default', name: 'Default' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'sapphire', name: 'Sapphire' },
    { id: 'ruby', name: 'Ruby' },
  ];

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0 } };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
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
              onClick={(e) => e.stopPropagation()}
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
                <ModalHeader title="Settings" onClose={onClose} />

                <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ minHeight: 0, paddingRight: '0.5rem', marginTop: '1rem' }}>
                  {/* 插入新的 AccountSection 组件 */}
                  <AccountSection />

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

                  <SettingsSectionTitle>DATA</SettingsSectionTitle>
                  <SettingsGroup>
                    <SettingsRow
                      icon={<Upload className="w-4 h-4" strokeWidth={1.5} />}
                      label="Import Data..."
                      control={<ChevronRight className="w-4 h-4" strokeWidth={1.5} />}
                      onClick={handleImportClick}
                      disabled={isImporting}
                    />
                    <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportData} />

                    <SettingsRow
                      icon={<Download className="w-4 h-4" strokeWidth={1.5} />}
                      label="Export Data..."
                      control={<ChevronRight className="w-4 h-4" strokeWidth={1.5} />}
                      onClick={handleExportData}
                      disabled={isExporting}
                    />
                  </SettingsGroup>

                  <div className="text-center mt-6" style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: 'color-mix(in srgb, var(--c-content) 40%, transparent)', fontSize: '0.75rem', fontWeight: 500 }}>
                      Version 1.0.0
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
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
