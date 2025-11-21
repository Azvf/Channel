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
    return <Smartphone className="icon-base" strokeWidth={1.5} />;
  }
  return <Monitor className="icon-base" strokeWidth={1.5} />;
};

export function AccountSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, isAuthenticated, isLoading: isAuthLoading, error, login, logout } = useAuth();
  const [authErrorAlert, setAuthErrorAlert] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<any>(null);

  // [关键修复]
  // 1. enabled: 仅依赖 isAuthenticated。只要已登录，Popup 打开时必须立即检查设备。
  // 2. fetcher: 即使 register 失败（在 service 内部捕获），getDevices 也会执行，确保能拿到列表判断是否超限。
  const { 
    data: devicesData, 
    isLoading: isDevicesLoading, 
    isRefreshing,
    refresh: refreshDevices,
    mutate: mutateDevices
  } = useCachedResource<Device[]>({
    key: `devices_${user?.id || ''}`,
    enabled: isAuthenticated, // <--- 修复点：移除 && isExpanded
    initialData: [],
    fetcher: async () => {
      // 串行执行：先心跳（容错），再读取
      await deviceService.registerCurrentDevice();
      return await deviceService.getDevices();
    },
    // 缩短 TTL 以确保设备状态相对实时，特别是对于刚登录的情况
    ttl: 60 * 1000 
  });

  const activeDevices = devicesData ?? [];
  const isPro = useMemo(() => user?.plan === 'pro', [user]);
  const deviceCount = activeDevices.length;
  const isLimitReached = isAuthenticated && deviceCount > MAX_FREE_DEVICES && !isPro;

  const getDeviceLabel = (device: Device) => {
    return `${device.name}${device.is_current ? ' (This Device)' : ''}`;
  };
  
  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    // 乐观更新
    const previousDevices = [...activeDevices];
    mutateDevices(activeDevices.filter(d => d.id !== deviceId));
    
    // 如果移除了设备后不再超限，关闭警报
    if (activeDevices.length - 1 <= MAX_FREE_DEVICES) {
        setAlertState(null);
    }

    try {
      await deviceService.removeDevice(deviceId);
      await refreshDevices();
    } catch (err) {
      mutateDevices(previousDevices);
      setAuthErrorAlert(err instanceof Error ? err.message : '移除设备失败');
    }
  }, [activeDevices, mutateDevices, refreshDevices]);

  // [Refactor] Limit Alert Content Tokenization
  const limitReachedAlert = useMemo(() => {
    if (!isAuthenticated || !isLimitReached) return null;

    // 找出非当前设备（只能踢别人）
    const removableDevices = activeDevices.filter(d => !d.is_current);
    
    return {
        title: "设备数量已达上限",
        intent: 'warning' as const,
        children: (
            <div>
                <p style={{ 
                        // [Refactor] 使用标准字体 Token
                        font: 'var(--font-body)',
                  color: 'var(--color-text-primary)', // Tokenized
                  margin: '0 0 1rem 0' 
                }}>
                    您的免费账户已绑定 {deviceCount} 台设备（上限 {MAX_FREE_DEVICES} 台）。请移除旧设备以继续同步。
                </p>
                
                <div style={{ 
                    /* [Refactor] 使用空间单位 Token 的倍数，约 4.5 行的高度，适配不同字体缩放 */
                    maxHeight: 'calc(var(--row-min-height) * 4.5)', 
                    overflowY: 'auto',
                    // [Refactor] Tokenized Border & Spacing
                    border: '1px solid var(--border-glass-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-1)'
                }}>
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
                                    className="rounded-md transition-all hover-destructive"
                                    title="移除此设备"
                                    style={{ 
                                      background: 'transparent', 
                                      border: 'none', 
                                      cursor: 'pointer',
                                      padding: 'var(--space-1_5)' 
                                    }}
                                >
                                    <Trash2 className="icon-sm" />
                                </button>
                            }
                            onClick={() => {}}
                        />
                    ))}
                    {removableDevices.length === 0 && (
                        <p style={{ 
                          textAlign: 'center', 
                          // [Refactor] 使用标准字体 Token
                        font: 'var(--font-small)', 
                          color: 'var(--color-text-tertiary)', // Tokenized
                          padding: 'var(--space-2)' 
                        }}>
                          没有可移除的其他设备
                        </p>
                    )}
                </div>
            </div>
        ),
        actions: [
            { id: 'upgrade', label: '升级至 Pro', variant: 'primary' as const, onClick: () => alert("跳转支付...") },
            { id: 'later', label: '稍后处理', variant: 'default' as const, onClick: () => setAlertState(null) }
        ],
    };
  }, [isAuthenticated, isLimitReached, deviceCount, activeDevices, handleRemoveDevice]);

  // 监听超限状态并弹出警报
  useEffect(() => {
    // 增加 !alertState 判断，防止重复弹窗
    // 增加 !isDevicesLoading 判断，确保数据加载完再弹
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
  const headerIcon = isAuthenticated ? <User className="icon-base" strokeWidth={1.5} /> : <Cloud className="icon-base" strokeWidth={1.5} />;
  const headerLabel = isAuthenticated ? user?.displayName : "Sync Data";
  const headerValue = isAuthenticated 
    ? (isPro ? "Pro Plan" : "Free") 
    : (isExpanded ? "" : "Off");
  
  const tooltipContent = isPro
    ? "Pro Plan: Unlimited devices activated."
    : `Free Plan: Up to ${MAX_FREE_DEVICES} devices.`;

  return (
    <>
      <div style={{ marginBottom: 'var(--space-6)' }}>
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
                  <ChevronDown className="icon-base" strokeWidth={1.5} />
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
                {/* [Refactor] Divider Token */}
                <div style={{ 
                  height: '1px', 
                  background: 'var(--border-glass-subtle)', 
                  margin: '0 var(--space-1) var(--space-3) var(--space-1)' 
                }} />
                
                <div style={{ padding: '0 var(--space-2) var(--space-2)' }} className="space-y-3">
                  {!isAuthenticated ? (
                    /* --- Guest State --- */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <p style={{ 
                        // [Refactor] 使用标准字体 Token
                        font: 'var(--font-caption)',
                        letterSpacing: 'var(--letter-spacing-caption)', 
                        color: 'var(--color-text-secondary)', // Tokenized
                        lineHeight: 1.4, 
                        margin: 0 
                      }}>
                        Enable synchronization to backup your tags and access them across devices.
                      </p>
                      
                      {error && (
                        <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 text-red-500 text-xs">
                          <AlertCircle className="icon-xs" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <SocialLoginButton 
                          icon={isAuthLoading ? <div className="icon-base border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <GoogleIcon className="icon-md" />}
                          label="Google"
                          disabled={isAuthLoading}
                          onClick={() => handleLogin('google')}
                        />
                        <SocialLoginButton 
                          icon={<AppleIcon className="icon-md" />}
                          label="Apple"
                          disabled={isAuthLoading}
                          onClick={() => handleLogin('apple')}
                        />
                      </div>
                      <div className="text-center pt-1">
                         <span style={{ 
                           // [Refactor] 使用标准字体 Token
                        font: 'var(--font-small)', 
                           color: 'var(--color-text-tertiary)' // Tokenized
                         }}>
                           End-to-end encrypted
                         </span>
                      </div>
                    </div>
                  ) : (
                    /* --- Authenticated State --- */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="flex justify-between items-center pt-1 px-1">
                            <span style={{ font: 'var(--font-small)', color: 'var(--color-text-secondary)' }}>
                                {isPro ? "Unlimited devices" : `${deviceCount} / ${MAX_FREE_DEVICES} devices`}
                            </span>
                            <button 
                              onClick={() => refreshDevices()} 
                              className="p-1 rounded hover:bg-[var(--hover-bg-glass)] transition-colors"
                              title="Refresh Devices"
                            >
                              <RefreshCw className={`icon-xs ${isRefreshing || isDevicesLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        
                        <div style={{ padding: 'var(--space-1)' }}>
                          {activeDevices.map(device => (
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
                                          className="rounded-md transition-all hover-destructive disabled:opacity-50"
                                          title={device.is_current ? "Cannot remove current device" : "Remove device"}
                                          style={{ padding: 'var(--space-1_5)' }}
                                      >
                                          <Trash2 className="icon-sm" />
                                      </button>
                                  }
                                  onClick={() => {}}
                              />
                          ))}
                        </div>

                        <div style={{ paddingTop: 'var(--space-1)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); logout(); }}
                                disabled={isAuthLoading}
                                className="flex items-center gap-1.5 py-1 px-2 rounded-md hover-destructive transition-colors disabled:opacity-50"
                                style={{ font: 'var(--font-caption)', letterSpacing: 'var(--letter-spacing-caption)', fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent' }}
                            >
                                <LogOut className="icon-sm" />
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
