import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { authService } from '../authService';
import { GameplayStore } from '../gameplayStore';
import { storageService, STORAGE_KEYS } from '../storageService';
import { testHelpers } from '../../test/helpers';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: null }, unsubscribe: jest.fn() })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ data: { url: 'https://auth.example.com' }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      setSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
}));

// Mock chrome.identity
global.chrome = {
  ...global.chrome,
  identity: {
    getRedirectURL: jest.fn(() => 'https://extension-id.chromiumapp.org/'),
    launchWebAuthFlow: jest.fn(() => Promise.resolve('https://extension-id.chromiumapp.org/#access_token=token&refresh_token=refresh')),
  },
} as any;

describe('AuthService 状态流转测试', () => {
  let store: GameplayStore;

  beforeEach(async () => {
    await testHelpers.clearAllData();
    store = await testHelpers.initTagManager();
    
    // Mock chrome.storage 的调用
    (storageService.removeMultiple as any) = jest.fn(() => Promise.resolve());
    (storageService.getMultiple as any) = jest.fn(() => Promise.resolve({}));
  });

  afterEach(async () => {
    await testHelpers.clearAllData();
    authService.resetForTests(); // 必须显式重置内存状态，避免测试间状态污染
    jest.clearAllMocks();
  });

  describe('登出清理逻辑', () => {
    it('logout_should_call_cleanup: Mock TagManager 和 StorageService，断言调用 logout 时，clearAllData 和 removeMultiple 被调用', async () => {
      // 创建一些测试数据
      store.createTag('UserA-Tag');
      expect(store.getAllTags()).toHaveLength(1);

      // Mock TagManager 的 clearAllData
      const clearAllDataSpy = jest.spyOn(store, 'clearAllData');

      // Mock StorageService 的 removeMultiple
      const removeMultipleSpy = jest.spyOn(storageService, 'removeMultiple');

      // 执行登出
      try {
        await authService.logout();
      } catch (error) {
        // 忽略 Supabase 相关的错误（因为我们只测试清理逻辑）
      }

      // 验证 clearAllData 被调用
      expect(clearAllDataSpy).toHaveBeenCalled();

      // 验证 removeMultiple 被调用，且参数正确
      expect(removeMultipleSpy).toHaveBeenCalledWith([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES,
        STORAGE_KEYS.SYNC_PENDING_CHANGES,
        STORAGE_KEYS.SYNC_LAST_TIMESTAMP,
      ]);

      clearAllDataSpy.mockRestore();
      removeMultipleSpy.mockRestore();
    });

    it('logout_should_clear_tag_manager_data: 验证登出后 TagManager 数据被清空', async () => {
      // 创建一些数据
      store.createTag('测试标签');
      const page = store.createOrUpdatePage('https://example.com', '测试页面', 'example.com');
      store.addTagToPage(page.id, store.getAllTags()[0].id);

      expect(store.getAllTags().length).toBeGreaterThan(0);
      expect(store.getTaggedPages().length).toBeGreaterThan(0);

      // 执行登出
      try {
        await authService.logout();
      } catch (error) {
        // 忽略 Supabase 相关的错误
      }

      // 验证数据已清空（通过 TagManager 的 clearAllData 方法）
      // 注意：由于 logout 内部会调用 clearAllData，所以数据应该被清空
      // 但由于我们使用的是单例，需要手动验证
      expect(store.getAllTags().length).toBe(0);
    });

    it('logout_should_reset_storage: 验证登出后存储被清空', async () => {
      // Mock 存储数据
      await storageService.set(STORAGE_KEYS.TAGS, { 'tag-1': { id: 'tag-1', name: '测试' } });
      await storageService.set(STORAGE_KEYS.PAGES, { 'page-1': { id: 'page-1', url: 'https://example.com' } });

      // 验证数据存在
      const tagsBefore = await storageService.get(STORAGE_KEYS.TAGS);
      expect(tagsBefore).not.toBeNull();

      // Mock removeMultiple
      const removeMultipleSpy = jest.spyOn(storageService, 'removeMultiple');

      // 执行登出
      try {
        await authService.logout();
      } catch (error) {
        // 忽略 Supabase 相关的错误
      }

      // 验证 removeMultiple 被调用
      expect(removeMultipleSpy).toHaveBeenCalledWith([
        STORAGE_KEYS.TAGS,
        STORAGE_KEYS.PAGES,
        STORAGE_KEYS.SYNC_PENDING_CHANGES,
        STORAGE_KEYS.SYNC_LAST_TIMESTAMP,
      ]);

      removeMultipleSpy.mockRestore();
    });
  });

  describe('状态管理', () => {
    it('should_initialize_with_anonymous_state: 初始化时应该处于匿名状态', () => {
      const state = authService.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should_notify_listeners_on_state_change: 状态变化时应该通知监听器', () => {
      const listener = jest.fn();
      const unsubscribe = authService.subscribe(listener);

      // 监听器应该在订阅时立即被调用
      expect(listener).toHaveBeenCalled();

      // 清理
      unsubscribe();
    });
  });

  describe('隐私保护', () => {
    it('logout_should_clear_all_user_data: 登出时应该清除所有用户数据', async () => {
      // 创建用户数据
      store.createTag('UserA-Tag1');
      store.createTag('UserA-Tag2');
      const page = store.createOrUpdatePage('https://example.com', 'UserA-Page', 'example.com');
      store.addTagToPage(page.id, store.getAllTags()[0].id);

      const tagsBefore = store.getAllTags();
      expect(tagsBefore.length).toBeGreaterThan(0);

      // Mock 清理方法
      const clearAllDataSpy = jest.spyOn(store, 'clearAllData');
      const removeMultipleSpy = jest.spyOn(storageService, 'removeMultiple');

      // 执行登出
      try {
        await authService.logout();
      } catch (error) {
        // 忽略错误
      }

      // 验证清理被调用
      expect(clearAllDataSpy).toHaveBeenCalled();
      expect(removeMultipleSpy).toHaveBeenCalled();

      clearAllDataSpy.mockRestore();
      removeMultipleSpy.mockRestore();
    });
  });
});

