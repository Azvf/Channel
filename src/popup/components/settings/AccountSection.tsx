// src/popup/components/settings/AccountSection.tsx

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Cloud, ChevronDown, LogOut, AlertCircle, Trash2, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { SettingsSectionTitle } from '../SettingsSectionTitle';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsRow } from '../SettingsRow';
import { SocialLoginButton } from './SocialLoginButton';
import { GoogleIcon, AppleIcon } from './icons/SocialIcons';
import { useAuth } from './useAuth';
import { AlertModal } from '../AlertModal';
import { Tooltip } from '../Tooltip';
import { deviceService, type Device } from '../../../services/deviceService';
import { useCachedResource } from '../../../hooks/useCachedResource';

const MAX_FREE_DEVICES = 2;

const DeviceIcon = ({ name }: { name: string }) => {
  if (name.toLowerCase().includes('iphone') || name.toLowerCase().includes('android')) {
    return <Smartphone className="w-4 h-4" strokeWidth={1.5} />;
  }
  return <Monitor className="w-4 h-4" strokeWidth={1.5} />;
};

export function AccountSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, isAuthenticated, isLoading: isAuthLoading, error, login, logout } = useAuth();
  const [authErrorAlert, setAuthErrorAlert] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<any>(null);

  // 使用 useCachedResource Hook 获取设备列表
  const { 
    data: devicesData, 
    isLoading: isDevicesLoading, 
    isRefreshing,
    refresh: refreshDevices,
    mutate: mutateDevices
  } = useCachedResource<Device[]>({
    key: `devices_${user?.id || ''}`,
    enabled: isAuthenticated && isExpanded,
    initialData: [],
    fetcher: async () => {
      // 保持 Fetcher 纯粹：先注册心跳，再获取设备
      await deviceService.registerCurrentDevice();
      return await deviceService.getDevices();
    }
  });

  const activeDevices = devicesData ?? [];
  const isPro = useMemo(() => user?.plan === 'pro', [user]);
  const deviceCount = activeDevices.length;
  const isLimitReached = isAuthenticated && deviceCount > MAX_FREE_DEVICES && !isPro;

  const getDeviceLabel = (device: Device) => {
    return `${device.name}${device.is_current ? ' (This Device)' : ''}`;
  };
  
  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    // 1. 乐观更新 UI
    const previousDevices = [...activeDevices];
    mutateDevices(activeDevices.filter(d => d.id !== deviceId));
    setAlertState(null);

    // 2. 调用真实 API
    try {
      await deviceService.removeDevice(deviceId);
      // 成功后刷新数据
      await refreshDevices();
    } catch (err) {
      // 失败回滚
      mutateDevices(previousDevices);
      setAuthErrorAlert(err instanceof Error ? err.message : '移除设备失败');
    }
  }, [activeDevices, mutateDevices, refreshDevices]);

  const limitReachedAlert = useMemo(() => {
    if (!isAuthenticated || !isLimitReached) return null;

    const removableDevices = activeDevices.filter(d => !d.is_current);
    
    return {
        title: "设备数量已达上限",
        intent: 'warning' as const,
        children: (
            <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--c-content)', margin: '0 0 1rem 0' }}>
                    您的免费账户已绑定 {deviceCount} 台设备（上限 {MAX_FREE_DEVICES} 台）。请移除旧设备以继续同步。
                </p>
                
                <div style={{ padding: '0.25rem' }}>
                    {removableDevices.map(device => (
                        <SettingsRow
                            key={device.id}
                            icon={<DeviceIcon name={device.name} />}
                            label={getDeviceLabel(device)}
                            value={new Date(device.last_sync_at).toLocaleDateString()}
                            control={
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleRemoveDevice(device.id); 
                                    }}
                                    className="p-1.5 rounded-md transition-all hover-destructive"
                                    title="移除此设备"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            }
                            onClick={() => {}}
                            className="p-1.5"
                        />
                    ))}
                </div>
            </div>
        ),
        actions: [
            { id: 'upgrade', label: '升级至 Pro', variant: 'primary' as const, onClick: () => alert("跳转支付...") },
        ],
    };
  }, [isAuthenticated, isLimitReached, deviceCount, activeDevices, handleRemoveDevice]);

  useEffect(() => {
    if (isLimitReached && isAuthenticated && !alertState && !authErrorAlert && !isDevicesLoading) {
        setAlertState(limitReachedAlert);
    }
  }, [isLimitReached, isAuthenticated, alertState, limitReachedAlert, authErrorAlert, isDevicesLoading]);
  
  // --- Existing Logic ---

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleLogin = async (provider: 'google' | 'apple') => {
    try {
      await login(provider);
      // 登录成功后会自动触发 useEffect -> fetchDevices
    } catch (err) {
      setAuthErrorAlert(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // UI status calculation
  const headerIcon = isAuthenticated ? <User className="w-4 h-4" strokeWidth={1.5} /> : <Cloud className="w-4 h-4" strokeWidth={1.5} />;
  const headerLabel = isAuthenticated ? user?.displayName : "Sync Data";
  const headerValue = isAuthenticated 
    ? (isPro ? "Pro Plan" : "Free") 
    : (isExpanded ? "" : "Off");
  
  const tooltipContent = isPro
    ? "Pro Plan: Unlimited devices activated."
    : `Free Plan: Up to ${MAX_FREE_DEVICES} devices.`;

  return (
    <>
      <div className="mb-6">
        <SettingsSectionTitle style={{ marginTop: 0 }}>ACCOUNT</SettingsSectionTitle>
        
        <SettingsGroup>
          <Tooltip content={tooltipContent} delay={200}>
            <SettingsRow
              icon={headerIcon}
              label={headerLabel || 'User'}
              value={headerValue}
              control={
                <div 
                  className="transition-transform duration-300"
                  onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ 
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                </div>
              }
              onClick={toggleExpand}
            />
          </Tooltip>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden', pointerEvents: 'auto' }}
              >
                <div style={{ height: '1px', background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)', margin: '0 0.25rem 0.75rem 0.25rem' }} />
                
                <div className="px-2 pb-2 space-y-3">
                  {!isAuthenticated ? (
                    /* --- Guest State (Existing) --- */
                    <div className="space-y-3">
                      <p style={{ fontSize: '0.8rem', color: 'color-mix(in srgb, var(--c-content) 70%, transparent)', lineHeight: 1.4, margin: 0 }}>
                        Enable synchronization to backup your tags and access them across devices.
                      </p>
                      
                      {error && (
                        <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 text-red-500 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <SocialLoginButton 
                          icon={isAuthLoading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
                          label="Google"
                          disabled={isAuthLoading}
                          onClick={() => handleLogin('google')}
                        />
                        <SocialLoginButton 
                          icon={<AppleIcon className="w-5 h-5" />}
                          label="Apple"
                          disabled={isAuthLoading}
                          onClick={() => handleLogin('apple')}
                        />
                      </div>
                      <div className="text-center pt-1">
                         <span style={{ fontSize: '0.7rem', color: 'color-mix(in srgb, var(--c-content) 40%, transparent)' }}>End-to-end encrypted</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pt-1 px-1">
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                {isPro ? "Unlimited devices" : `${deviceCount} / ${MAX_FREE_DEVICES} devices`}
                            </span>
                            <button 
                              onClick={() => refreshDevices()} 
                              className="p-1 rounded hover:bg-[var(--hover-bg-glass)] transition-colors"
                              title="Refresh Devices"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRefreshing || isDevicesLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '0.25rem' }}>
                          {activeDevices.map(device => (
                              /* * [架构优化] 移除了 <motion.div> 包装器
                               * 1. 移除了 `layout` 属性：防止与父级高度动画发生布局投影冲突。
                               * 2. 移除了 `initial/animate/exit`：消除了列表项的位移/透明度动画，
                               * 这在折叠面板中通常是多余的视觉噪音，且会消耗合成器层资源。
                               */
                              <SettingsRow
                                  key={device.id}
                                  icon={<DeviceIcon name={device.name} />}
                                  label={getDeviceLabel(device)}
                                  value={device.is_current ? "Active" : new Date(device.last_sync_at).toLocaleDateString()}
                                  control={
                                      <button
                                          onClick={(e) => { 
                                              e.stopPropagation(); 
                                              handleRemoveDevice(device.id); 
                                          }}
                                          disabled={device.is_current || isAuthLoading}
                                          className="p-1.5 rounded-md transition-all hover-destructive disabled:opacity-50"
                                          title={device.is_current ? "Cannot remove current device" : "Remove device"}
                                      >
                                          <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                  }
                                  onClick={() => {}}
                                  className="p-1.5"
                              />
                          ))}
                        </div>

                        <div className="pt-1 flex justify-end">
                            <button
                                onClick={(e) => { e.stopPropagation(); logout(); }}
                                disabled={isAuthLoading}
                                className="flex items-center gap-1.5 py-1 px-2 rounded-md hover-destructive transition-colors disabled:opacity-50"
                                style={{ fontSize: '0.8rem', fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent' }}
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                {isAuthLoading ? 'Signing Out...' : 'Sign Out'}
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

      {/* Error Alert Modal (for network/API errors) */}
      <AlertModal 
        isOpen={!!authErrorAlert && !alertState}
        onClose={() => setAuthErrorAlert(null)}
        title="Authentication Error"
        intent="destructive"
        actions={[{ id: 'ok', label: 'OK', variant: 'primary', onClick: () => setAuthErrorAlert(null) }]}
      >
        {authErrorAlert}
      </AlertModal>
      
      {alertState && (
        <AlertModal
          isOpen={true}
          onClose={() => setAlertState(null)}
          title={alertState.title}
          intent={alertState.intent}
          actions={alertState.actions}
        >
          {alertState.children}
        </AlertModal>
      )}
    </>
  );
}
