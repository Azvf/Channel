import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthState, UserProfile, ANONYMOUS_STATE } from '../types/auth';
import { logger } from './logger';
import { TagManager } from './tagManager';
import { storageService, STORAGE_KEYS } from './storageService';

const log = logger('AuthService');

type AuthListener = (state: AuthState) => void;

class AuthService {
  private static instance: AuthService;
  private state: AuthState = ANONYMOUS_STATE;
  private listeners: Set<AuthListener> = new Set();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 初始化：恢复会话并监听 Supabase 状态变化
   */
  private async initialize() {
    // 1. 获取初始会话
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.syncStateWithSession(session);
    }

    // 2. 监听后续的 Session 变化 (例如 token 刷新、自动登出)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.syncStateWithSession(session);
      } else {
        this.updateState(ANONYMOUS_STATE);
      }
    });
  }

  /**
   * 核心登录逻辑：Supabase + Chrome Identity
   */
  public async login(provider: 'google' | 'apple'): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      log.info(`Starting OAuth flow for ${provider}`);

      // A. 获取重定向 URL (需要在 Supabase Dashboard -> Auth -> URL Configuration 中添加此 URL)
      // 格式通常为: https://<extension-id>.chromiumapp.org/
      const redirectUrl = chrome.identity.getRedirectURL();
      
      // B. 从 Supabase 获取授权 URL (skipBrowserRedirect: true 是关键)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true 
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No authentication URL returned');

      // C. 启动 Chrome 原生 Web 认证流
      // 这会弹出一个独立的浏览器窗口，用户登录后窗口自动关闭
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: data.url,
        interactive: true
      });

      if (!responseUrl) throw new Error('Authentication window closed');

      // D. 解析回调 URL 中的 Tokens
      // 回调 URL 格式: https://<id>.chromiumapp.org/#access_token=...&refresh_token=...
      const params = new URLSearchParams(new URL(responseUrl).hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) throw new Error('No tokens found in redirect URL');

      // E. 将 Token 注入 Supabase Client
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (sessionError) throw sessionError;
      if (sessionData.session) {
        this.syncStateWithSession(sessionData.session);
        log.info('Login successful');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      log.error('Login error', { error: errorMessage });
      
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      });
      
      throw err;
    }
  }

  /**
   * 登出逻辑
   * 清空本地数据以保护隐私，防止数据泄露给下一个用户
   */
  public async logout(): Promise<void> {
    this.updateState({ isLoading: true });
    try {
      // 1. 清空 TagManager 的本地数据
      const tagManager = TagManager.getInstance();
      tagManager.clearAllData();
      log.info('TagManager 数据已清空');

      // 2. 清空存储中的标签和页面数据
      await storageService.removeMultiple([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES,
        STORAGE_KEYS.SYNC_PENDING_CHANGES,
        STORAGE_KEYS.SYNC_LAST_TIMESTAMP, // [新增] 必须清除游标
      ]);
      log.info('存储数据已清空');

      // 3. 登出 Supabase 会话
      // 使用超时包装，防止网络请求挂起（特别是在测试环境中）
      try {
        const signOutPromise = supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 10000)
        );
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (error) {
        // 如果超时或失败，仍然继续清理本地数据
        log.warn('Supabase sign out failed or timeout, but continuing with local cleanup', { error });
      }
      
      // 状态更新会由 onAuthStateChange 触发，但为了 UI 响应速度，也可以手动触发
      this.updateState(ANONYMOUS_STATE);
      log.info('Logout successful');
    } catch (error) {
      log.error('Logout failed', { error });
      this.updateState({ ...ANONYMOUS_STATE, error: 'Logout failed' });
    }
  }

  /**
   * 获取当前状态
   */
  public getState(): AuthState {
    return this.state;
  }

  /**
   * 订阅状态变化 (React Hook 使用)
   */
  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    // 立即回调当前状态
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- Helpers ---

  /**
   * 将 Supabase Session 映射为我们的 UserProfile 领域模型
   */
  private syncStateWithSession(session: Session) {
    const sbUser = session.user;
    
    // 从 user_metadata 中提取 OAuth 提供商信息
    const userProfile: UserProfile = {
      id: sbUser.id,
      email: sbUser.email || '',
      displayName: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
      avatarUrl: sbUser.user_metadata?.avatar_url,
      provider: sbUser.app_metadata?.provider as 'google' | 'apple' || 'google',
      // 在真实场景中，Plan 通常存储在 public.profiles 表中，需要额外 fetch
      // 这里暂时从 metadata 或默认值读取
      plan: 'free' 
    };

    this.updateState({
      user: userProfile,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  }

  private updateState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const authService = AuthService.getInstance();

