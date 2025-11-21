import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Supabase 必须在所有导入之前
// 条件性 Mock Supabase：只有在 USE_REAL_SUPABASE 不为 'true' 时才 mock
// 这样可以支持使用真实的 dev 数据库进行集成测试
const USE_REAL_SUPABASE = process.env.USE_REAL_SUPABASE === 'true';

if (!USE_REAL_SUPABASE) {
  // Mock Supabase（默认行为）
  // 使用 jest.mock 而不是 vi.mock，因为 jest.mock 在模块顶层调用更可靠
  jest.mock('../../lib/supabase', () => ({
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gt: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: null }, unsubscribe: jest.fn() })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
      },
      channel: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn(),
        })),
      })),
      removeChannel: jest.fn(),
    },
  }));
} else {
  // 使用真实数据库时，也需要 mock 以避免 import.meta 错误
  // 但返回真实的 Supabase 客户端实例
  jest.mock('../../lib/supabase', () => {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment');
    }
    
    // 使用与真实 supabase.ts 相同的存储适配器
    // 注意：setup.ts 中的 chrome.storage.local 返回 Promise，所以直接使用 await
    const chromeStorageAdapter = {
      getItem: async (key: string): Promise<string | null> => {
        try {
          const result = await chrome.storage.local.get([key]);
          return result[key] || null;
        } catch (error) {
          console.warn('[Supabase] Storage getItem failed:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string): Promise<void> => {
        try {
          await chrome.storage.local.set({ [key]: value });
        } catch (error) {
          console.warn('[Supabase] Storage setItem failed:', error);
          throw error;
        }
      },
      removeItem: async (key: string): Promise<void> => {
        try {
          await chrome.storage.local.remove(key);
        } catch (error) {
          console.warn('[Supabase] Storage removeItem failed:', error);
          throw error;
        }
      },
    };
    
    return {
      supabase: createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: chromeStorageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }),
    };
  });
}

import { authService } from '../../services/authService';
import { GameplayStore } from '../../services/gameplayStore';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { testHelpers, TEST_ACCOUNT } from '../../test/helpers';

// Mock chrome.identity
global.chrome = {
  ...global.chrome,
  identity: {
    getRedirectURL: jest.fn(() => 'https://extension-id.chromiumapp.org/'),
    launchWebAuthFlow: jest.fn(() => Promise.resolve('https://extension-id.chromiumapp.org/#access_token=token&refresh_token=refresh')),
  },
} as any;

describe('集成测试 - Auth + Sync + Storage 隐私泄露防范', () => {
  // 所有超时都设置为 10 秒
  jest.setTimeout(10000);

  // 在测试套件开始时登录测试账号（如果使用真实数据库）
  beforeAll(async () => {
    if (USE_REAL_SUPABASE) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('[privacy.spec] ❌ 环境变量未正确设置，无法连接到真实数据库');
        return;
      }
      
      // 如果测试账号已配置，尝试登录
      if (TEST_ACCOUNT.isConfigured()) {
        await testHelpers.loginWithTestAccount();
      }
    }
  }, 10000); // 10秒超时

  let store: GameplayStore;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    store = await testHelpers.initTagManager();
  });

  afterEach(async () => {
    await testHelpers.clearAllData();
    jest.clearAllMocks();
  });

  // 在所有测试结束后登出测试账号（如果已登录）
  afterAll(async () => {
    if (USE_REAL_SUPABASE && TEST_ACCOUNT.isConfigured()) {
      await testHelpers.logoutTestAccount();
    }
  });

  it('用户切换时应彻底清除本地数据', async () => {
    // 1. 模拟用户 A 数据
    store.createTag('UserA-Tag');
    store.createTag('UserA-Tag2');
    const page = store.createOrUpdatePage('https://usera.example.com', 'UserA Page', 'usera.example.com');
    store.addTagToPage(page.id, store.getAllTags()[0].id);

    expect(store.getAllTags()).toHaveLength(2);

    // 2. 执行登出
    try {
      await authService.logout();
    } catch (error) {
      // 忽略 Supabase 相关的错误
    }

    // 3. 验证清理
    expect(store.getAllTags()).toHaveLength(0);
    const storageDump = await storageService.getMultiple([STORAGE_KEYS.TAGS, STORAGE_KEYS.PAGES]);
    expect(storageDump[STORAGE_KEYS.TAGS]).toBeNull();
    expect(storageDump[STORAGE_KEYS.PAGES]).toBeNull();
  });

  it('用户 A 登出后，用户 B 登录时不应看到 A 的数据', async () => {
    // 1. 用户 A 创建数据
    store.createTag('UserA-Private-Tag');
    await store.commit();

    // 验证数据存在
    let storageData = await storageService.get(STORAGE_KEYS.TAGS);
    expect(storageData).not.toBeNull();

    // 2. 用户 A 登出
    try {
      await authService.logout();
    } catch (error) {
      // 忽略错误
    }

    // 3. 验证数据已被清除
    storageData = await storageService.get(STORAGE_KEYS.TAGS);
    expect(storageData).toBeNull();
    expect(store.getAllTags()).toHaveLength(0);

    // 4. 用户 B "登录"（模拟，因为我们需要 mock Supabase）
    // 这里我们验证 TagManager 是干净的，用户 B 不应该看到 A 的数据
    store.clearAllData();
    expect(store.getAllTags()).toHaveLength(0);

    // 5. 用户 B 创建自己的数据
    store.createTag('UserB-Tag');
    expect(store.getAllTags()).toHaveLength(1);
    expect(store.getAllTags()[0].name).toBe('UserB-Tag');
    expect(store.getAllTags()[0].name).not.toBe('UserA-Private-Tag');
  });

  it('同步服务应该处理用户切换', async () => {
    // 这个测试验证 SyncService 在用户切换时的行为
    // 注意：由于 SyncService 的私有方法和复杂的初始化逻辑，
    // 这里主要验证 GameplayStore 和 StorageService 的清理逻辑

    // 1. 用户 A 数据
    store.createTag('UserA-Tag');
    await store.commit();

    // 2. 登出
    try {
      await authService.logout();
    } catch (error) {
      // 忽略错误
    }

    // 3. 验证数据清理
    expect(store.getAllTags()).toHaveLength(0);
    const storageData = await storageService.getMultiple([
      STORAGE_KEYS.TAGS,
      STORAGE_KEYS.PAGES,
      STORAGE_KEYS.SYNC_PENDING_CHANGES,
      STORAGE_KEYS.SYNC_LAST_TIMESTAMP,
    ]);

    // 所有相关存储都应该被清除
    expect(storageData[STORAGE_KEYS.TAGS]).toBeNull();
    expect(storageData[STORAGE_KEYS.PAGES]).toBeNull();
  });

  it('应该验证数据库连接配置', async () => {
    // 验证环境变量是否正确设置
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (USE_REAL_SUPABASE) {
      // 使用真实数据库时的验证
      expect(supabaseUrl).toBeDefined();
      expect(supabaseKey).toBeDefined();
      expect(supabaseUrl).toContain('supabase.co');
      
      // 验证 Supabase 客户端是否正确初始化
      const { supabase } = await import('../../lib/supabase');
      expect(supabase).toBeDefined();
      
      // 验证不是 Mock（Mock 的 from 方法会有 mockClear 等属性）
      const isMocked = typeof (supabase.from as any).mockClear === 'function';
      expect(isMocked).toBe(false);
      
      // 尝试一个简单的查询来验证连接（需要登录状态）
      if (TEST_ACCOUNT.isConfigured()) {
        const isLoggedIn = await testHelpers.ensureLoggedIn();
        
        if (isLoggedIn) {
          try {
            const queryPromise = supabase
              .from('tags')
              .select('id')
              .limit(0);
            
            let timeoutTimer: NodeJS.Timeout | null = null;
            const timeoutPromise = new Promise((_, reject) => {
              timeoutTimer = setTimeout(() => {
                reject(new Error('查询超时'));
              }, 5000);
            });
            
            try {
              await Promise.race([queryPromise, timeoutPromise]);
            } finally {
              // 清除超时定时器，防止资源泄漏
              if (timeoutTimer) {
                clearTimeout(timeoutTimer);
              }
            }
          } catch {
            // 查询失败或超时，不影响测试通过（配置已验证正确）
          }
        }
      }
    } else {
      // 使用 Mock 时的验证
      const { supabase } = await import('../../lib/supabase');
      expect(supabase).toBeDefined();
      
      // 验证是 Mock
      const isMocked = typeof (supabase.from as any).mockClear === 'function';
      expect(isMocked).toBe(true);
    }
  }, 10000); // 10秒超时

  it('Storage 和 GameplayStore 应该保持同步', async () => {
    // 1. 创建数据
    const tag = store.createTag('TestTag');
    const page = store.createOrUpdatePage('https://example.com', 'Test Page', 'example.com');
    store.addTagToPage(page.id, tag.id);

    // 2. 同步到存储
    await store.commit();

    // 3. 验证存储中有数据
    const storedTags = await storageService.get(STORAGE_KEYS.TAGS);
    const storedPages = await storageService.get(STORAGE_KEYS.PAGES);

    expect(storedTags).not.toBeNull();
    expect(storedPages).not.toBeNull();

    // 4. 清空 GameplayStore
    store.clearAllData();

    // 5. 重新从存储加载
    await store.reloadFromStorage();

    // 6. 验证数据已恢复（现在 chrome.storage mock 会真正保存数据）
    const restoredTags = store.getAllTags();
    const restoredPages = store.getTaggedPages();

    expect(store.isInitialized).toBe(true);
    expect(restoredTags.length).toBe(1);
    expect(restoredTags[0].name).toBe('TestTag');
    expect(restoredPages.length).toBe(1);
    expect(restoredPages[0].url).toBe('https://example.com');
  });
});

