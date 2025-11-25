import type { GameplayTag } from '../shared/types/gameplayTag';
import { GameplayStore } from '../services/gameplayStore';

// 条件性 Mock Supabase：只有在 USE_REAL_SUPABASE 不为 'true' 时才 mock
// 这样可以支持使用真实的 dev 数据库进行集成测试
const USE_REAL_SUPABASE = process.env.USE_REAL_SUPABASE === 'true';

if (!USE_REAL_SUPABASE) {
  // Mock supabase before importing it
  // This prevents import.meta.env errors in Jest
  jest.mock('../infra/database/supabase', () => require('../infra/database/supabase/__mocks__/index'));
}

import { supabase } from '../infra/database/supabase';
import { authService } from '../services/authService';

/**
 * 测试账号配置
 * 从环境变量读取，如果未设置则跳过需要登录的测试
 */
export const TEST_ACCOUNT = {
  email: process.env.TEST_ACCOUNT_EMAIL,
  password: process.env.TEST_ACCOUNT_PASSWORD,
  
  /**
   * 检查测试账号是否已配置
   */
  isConfigured(): boolean {
    return !!this.email && !!this.password;
  },
  
  /**
   * 获取测试账号信息（用于日志）
   */
  getInfo(): string {
    if (!this.isConfigured()) {
      return '❌ 未配置';
    }
    return `✅ ${this.email?.substring(0, 3)}***@***`;
  },
};

/**
 * 测试辅助函数
 */
export const testHelpers = {
  /**
   * 创建测试标签
   */
  createTestTag(name: string, color?: string): GameplayTag {
    return {
      id: `tag_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      color: color || '#FF6B6B',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bindings: [],
    };
  },

  /**
   * 等待异步操作完成
   */
  async waitFor(milliseconds: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  },

  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    const store = GameplayStore.getInstance();
    store.clearAllData();
    await store.commit();
    
    // ✅ 修复：清理 StatsWallManager 的单例缓存，防止测试间状态污染
    const { statsWallManager } = await import('../services/StatsWallManager');
    statsWallManager.resetForTests();
  },

  /**
   * 初始化 GameplayStore
   * 确保完全重置状态，包括清空所有数据和重置初始化标志
   */
  async initTagManager(): Promise<GameplayStore> {
    const store = GameplayStore.getInstance();
    // 先清空所有数据（重置初始化状态）
    store.clearAllData();
    // 然后使用空数据重新初始化
    store.initialize({ tags: {}, pages: {} });
    return store;
  },

  /**
   * 使用测试账号登录 Supabase
   * 注意：这直接调用 Supabase API，而不是通过 authService，
   * 因为 authService 使用 OAuth 流程，不适合自动化测试
   * 
   * @returns 登录成功返回 true，失败或未配置返回 false
   */
  async loginWithTestAccount(): Promise<boolean> {
    if (!TEST_ACCOUNT.isConfigured()) {
      console.warn('[testHelpers] 测试账号未配置，请设置 TEST_ACCOUNT_EMAIL 和 TEST_ACCOUNT_PASSWORD');
      return false;
    }

    try {
      // 使用模块顶层的 supabase（可能是 mock 或真实版本）
      // 如果使用真实数据库，privacy.spec.ts 会确保使用真实的 supabase
      const client = supabase;

      // 检查是否有会话，如果有先登出（添加超时保护）
      const getSessionPromise = client.auth.getSession();
      const getSessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Get session timeout')), 5000)
      );
      
      let sessionData;
      try {
        const result = await Promise.race([getSessionPromise, getSessionTimeout]) as any;
        sessionData = result.data;
      } catch (error) {
        if (error instanceof Error && error.message === 'Get session timeout') {
          console.warn('[testHelpers] getSession 超时（5秒），继续登录流程');
        } else {
          throw error;
        }
        sessionData = { session: null };
      }
      
      if (sessionData?.session) {
        try {
          const signOutPromise = client.auth.signOut();
          const signOutTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sign out timeout')), 5000)
          );
          await Promise.race([signOutPromise, signOutTimeout]);
        } catch {
          // 登出失败或超时，继续登录流程
        }
      }

      // 使用邮箱+密码登录（添加超时保护）
      const loginPromise = client.auth.signInWithPassword({
        email: TEST_ACCOUNT.email!,
        password: TEST_ACCOUNT.password!,
      });
      
      const loginTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 10000)
      );
      
      const result = await Promise.race([loginPromise, loginTimeout]) as any;
      const { data, error } = result;

      if (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('invalid_credentials')) {
          console.error('[testHelpers] 登录失败: 账号或密码错误');
        } else if (errorMsg.includes('Email not confirmed')) {
          console.error('[testHelpers] 登录失败: 邮箱未确认');
        } else {
          console.error('[testHelpers] 登录失败:', error.message || errorMsg);
        }
        return false;
      }

      if (data?.session) {
        // 等待 authService 同步状态
        await this.waitFor(100);
        return true;
      }

      console.warn('[testHelpers] 登录响应无会话数据');
      return false;
    } catch (error) {
      if (error instanceof Error && error.message === 'Login timeout') {
        console.error('[testHelpers] 登录超时（10秒）');
      } else {
        console.error('[testHelpers] 登录异常:', error instanceof Error ? error.message : error);
      }
      return false;
    }
  },

  /**
   * 登出测试账号
   */
  async logoutTestAccount(): Promise<void> {
    try {
      await authService.logout();
    } catch (_error) {
      // 即使登出失败，也尝试清理本地数据
      await this.clearAllData();
    }
  },

  /**
   * 确保测试账号已登录
   * 如果未登录，尝试登录
   * 
   * @returns 是否已登录（或登录成功）
   */
  async ensureLoggedIn(): Promise<boolean> {
    // 检查当前会话
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      return true;
    }

    // 未登录，尝试登录
    return await this.loginWithTestAccount();
  },
};

/**
 * 用于创建可重复使用的测试数据
 */
export const testFixtures = {
  tags: {
    frontend: { name: '前端', color: '#4ECDC4' },
    backend: { name: '后端', color: '#45B7D1' },
    database: { name: '数据库', color: '#96CEB4' },
    testing: { name: '测试', color: '#FFEAA7' },
  },

  pages: {
    github: {
      url: 'https://github.com',
      title: 'GitHub',
      domain: 'github.com',
    },
    google: {
      url: 'https://google.com',
      title: 'Google',
      domain: 'google.com',
    },
    stackoverflow: {
      url: 'https://stackoverflow.com',
      title: 'Stack Overflow',
      domain: 'stackoverflow.com',
    },
  },
};

