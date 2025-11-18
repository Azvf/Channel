import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Cloud, ChevronDown, LogOut, AlertCircle } from 'lucide-react';
import { SettingsSectionTitle } from '../SettingsSectionTitle';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsRow } from '../SettingsRow';
import { SocialLoginButton } from './SocialLoginButton';
import { GoogleIcon, AppleIcon } from './icons/SocialIcons';
import { useAuth } from './useAuth';
import { AlertModal } from '../AlertModal';

export function AccountSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, isAuthenticated, isLoading, error, login, logout } = useAuth();
  const [authErrorAlert, setAuthErrorAlert] = useState<string | null>(null);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleLogin = async (provider: 'google' | 'apple') => {
    try {
      await login(provider);
      // 登录成功不需要额外操作，状态会自动更新
    } catch (err) {
      // 捕获 Service 抛出的错误并显示弹窗
      setAuthErrorAlert(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // 计算 UI 显示状态
  const headerIcon = isAuthenticated ? <User className="w-4 h-4" strokeWidth={1.5} /> : <Cloud className="w-4 h-4" strokeWidth={1.5} />;
  const headerLabel = isAuthenticated ? user?.displayName : "Sync Data";
  const headerValue = isAuthenticated 
    ? (user?.plan === 'pro' ? "Pro Plan" : "Free") 
    : (isExpanded ? "" : "Off");

  return (
    <>
      <div className="mb-6">
        <SettingsSectionTitle style={{ marginTop: 0 }}>ACCOUNT</SettingsSectionTitle>
        
        <SettingsGroup>
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
                
                <div className="px-2 pb-2">
                  {!isAuthenticated ? (
                    /* --- Guest State --- */
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
                          icon={isLoading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
                          label="Google"
                          disabled={isLoading}
                          onClick={() => handleLogin('google')}
                        />
                        <SocialLoginButton 
                          icon={<AppleIcon className="w-5 h-5" />}
                          label="Apple"
                          disabled={isLoading}
                          onClick={() => handleLogin('apple')}
                        />
                      </div>
                      <div className="text-center pt-1">
                         <span style={{ fontSize: '0.7rem', color: 'color-mix(in srgb, var(--c-content) 40%, transparent)' }}>End-to-end encrypted</span>
                      </div>
                    </div>
                  ) : (
                    /* --- Logged In State --- */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'color-mix(in srgb, var(--c-content) 60%, transparent)' }}>Email</span>
                        <span style={{ color: 'var(--c-content)', fontWeight: 500 }}>{user?.email}</span>
                      </div>
                      
                      <div className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'color-mix(in srgb, var(--c-content) 60%, transparent)' }}>Status</span>
                        <span style={{ color: 'var(--c-action)', fontWeight: 500 }}>Active</span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); logout(); }}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 py-1 px-2 rounded-md hover-destructive transition-colors disabled:opacity-50"
                          style={{ fontSize: '0.8rem', fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent' }}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {isLoading ? 'Signing Out...' : 'Sign Out'}
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

      {/* Error Alert Modal */}
      <AlertModal 
        isOpen={!!authErrorAlert}
        onClose={() => setAuthErrorAlert(null)}
        title="Authentication Error"
        intent="destructive"
        actions={[{ id: 'ok', label: 'OK', variant: 'primary', onClick: () => setAuthErrorAlert(null) }]}
      >
        {authErrorAlert}
      </AlertModal>
    </>
  );
}

