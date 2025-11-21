import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SyncService } from '../syncService';
import { authService } from '../authService';
import { storageService, STORAGE_KEYS } from '../storageService';
import { GameplayStore } from '../gameplayStore';
import { supabase } from '../../lib/supabase';

// 1. Mock 外部依赖
jest.mock('../authService');
jest.mock('../storageService');
jest.mock('../gameplayStore');
jest.mock('../timeService', () => ({
  timeService: {
    calibrate: jest.fn(() => Promise.resolve()),
    now: jest.fn(() => Date.now()),
    get isCalibrated() { return true; },
    getOffset: jest.fn(() => 0),
    reset: jest.fn(),
  },
}));
jest.mock('../../lib/supabase', () => {
  const mockFn = jest.fn as any;
  return {
  supabase: {
    auth: {
        getSession: mockFn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: mockFn(() => ({
        data: { subscription: null },
        unsubscribe: jest.fn(),
      })),
    },
      channel: mockFn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
      removeChannel: mockFn(),
      rpc: mockFn().mockResolvedValue({ data: Date.now(), error: null }), // Mock get_server_time RPC
      from: mockFn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
        upsert: mockFn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(), // for soft delete
    })),
  }
  };
});

describe('SyncService (Logic Flow)', () => {
  let syncService: SyncService;
  let mockTagManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authService.getState 默认返回未登录状态
    (authService.getState as jest.Mock).mockReturnValue({ 
      isAuthenticated: false,
      user: null 
    });
    
    // [修复] 必须先创建 Mock 对象并注入，再实例化 SyncService
    // 这样 SyncService 构造函数中获取到的才是我们能够断言的 mockTagManager
    mockTagManager = {
      getAllTags: jest.fn().mockReturnValue([]),
      getTaggedPages: jest.fn().mockReturnValue([]),
      getAllData: jest.fn().mockReturnValue({ tags: {}, pages: {} }), // 添加 getAllData
      initialize: jest.fn(),
      updateData: jest.fn(),
      syncToStorage: jest.fn(),
    };
    (GameplayStore.getInstance as jest.Mock).mockReturnValue(mockTagManager);
    
    // 重置单例 (这是 Hack，实际项目中最好提供 reset 方法)
    (SyncService as any).instance = null;
    syncService = SyncService.getInstance();
    
    // Mock Storage - 确保锁始终为空，避免递归等待
    (storageService.get as jest.Mock).mockImplementation((key) => {
      if (key === STORAGE_KEYS.SYNC_LOCK) return Promise.resolve(null); // 始终无锁
      if (key === STORAGE_KEYS.SYNC_PENDING_CHANGES) return Promise.resolve([]);
      return Promise.resolve(null);
    });
    (storageService.set as jest.Mock<any>).mockResolvedValue(undefined);
    (storageService.remove as jest.Mock<any>).mockResolvedValue(undefined);
    
    // [修复] 稳健的 Mock Query 实现
    // 正确实现 Thenable 接口，确保 await 可靠工作
    // 包含所有必要字段，Mock 常见查询方法
    const createMockQuery = () => {
      const builder: any = {
        // Thenable 接口：支持 await
        then: (onfulfilled?: any, onrejected?: any) => {
          return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected);
        },
        catch: (onrejected?: any) => {
          return Promise.resolve({ data: [], error: null }).catch(onrejected);
        }
      };
      
      // Chainable 方法：返回 this
      const methods = ['select', 'eq', 'gt', 'lt', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'maybeSingle'];
      methods.forEach(method => {
        builder[method] = jest.fn().mockReturnValue(builder);
      });
      
      return builder;
    };
    
    // Mock Supabase 查询链 (默认返回空)
    (supabase.from as jest.Mock).mockImplementation(() => {
      return createMockQuery();
    });
  });

  it('initialize: 应该加载待同步队列', async () => {
    const pendingChanges = [{ type: 'tag', operation: 'create', id: 't1', timestamp: 123 }];
    (storageService.get as jest.Mock<any>).mockResolvedValueOnce(pendingChanges);

    await syncService.initialize();

    const state = syncService.getSyncState();
    expect(state.pendingChangesCount).toBe(1);
    expect(storageService.get).toHaveBeenCalledWith(expect.stringContaining('sync_pending_changes'));
  });

  it('markTagChange: 未登录时应加入本地队列', async () => {
    // 模拟未登录
    (authService.getState as jest.Mock).mockReturnValue({ isAuthenticated: false });

    await syncService.markTagChange('create', 't1', { id: 't1', name: 'test' } as any);

    const state = syncService.getSyncState();
    expect(state.pendingChangesCount).toBe(1);
    expect(storageService.set).toHaveBeenCalledWith(
      expect.stringContaining('sync_pending_changes'), 
      expect.any(Array)
    );
  });

  it('markTagChange: 已登录时应立即尝试上传', async () => {
    // 模拟已登录
    (authService.getState as jest.Mock).mockReturnValue({ 
      isAuthenticated: true, 
      user: { id: 'user-1' } 
    });

    // Mock Supabase upsert 成功
    const mockUpsert = jest.fn<any>().mockResolvedValue({ error: null });
    const mockFrom = jest.fn(() => ({
      upsert: mockUpsert,
    }));
    (supabase.from as jest.Mock).mockReturnValue(mockFrom);

    await syncService.markTagChange('create', 't1', { id: 't1', name: 'test' } as any);

    // 应该调用 Supabase upsert（通过 syncTagToCloud）
    expect(supabase.from).toHaveBeenCalledWith('tags');
    // 注意：如果 syncTagToCloud 成功，不会加入队列；如果失败，会加入队列
    // 这里我们 mock 成功，所以应该不会加入队列
    // 但由于 syncTagToCloud 内部可能还有其他逻辑，我们只验证调用了 supabase
  });

  it('syncAll: 应该执行完整的同步流程 (Push -> Pull -> Merge)', async () => {
    // 模拟已登录
    (authService.getState as jest.Mock).mockReturnValue({ 
      isAuthenticated: true, 
      user: { id: 'user-1' } 
    });
    
    // Mock 存储数据：确保触发增量同步而不是全量同步
    const mockNow = Date.now();
    const { timeService } = require('../timeService');
    (timeService.now as jest.Mock).mockReturnValue(mockNow);
    
    // Mock 上次同步时间和 Shadow Map
    (storageService.get as jest.Mock).mockImplementation((key) => {
      if (key === STORAGE_KEYS.SYNC_LAST_TIMESTAMP) {
        // 返回一个最近的同步时间戳（1小时前），确保走增量同步
        return Promise.resolve(mockNow - 3600 * 1000);
      }
      if (key === STORAGE_KEYS.SYNC_LAST_FULL_SYNC) {
        // 返回一个最近的全量同步时间戳（1天前），确保不会触发周期性全量同步
        return Promise.resolve(mockNow - 24 * 3600 * 1000);
      }
      if (key === STORAGE_KEYS.SYNC_SHADOW_MAP) {
        // 返回一个非空的 Shadow Map，确保不会触发 Shadow Map 丢失的全量同步
        return Promise.resolve({ 'tag:t1': { h: '46-1000', u: 1000 } });
      }
      if (key === STORAGE_KEYS.SYNC_LOCK) {
        return Promise.resolve(null); // 无锁
      }
      if (key === STORAGE_KEYS.SYNC_PENDING_CHANGES) {
        return Promise.resolve([]);
      }
      return Promise.resolve(null);
    });
    
    // Mock set 操作
    (storageService.set as jest.Mock<any>).mockResolvedValue(undefined);
    (storageService.remove as jest.Mock<any>).mockResolvedValue(undefined);

    // [修复] 稳健的 Mock Query 实现
    // 正确实现 Thenable 接口，确保 await 可靠工作
    // 包含所有必要字段，Mock 常见查询方法
    const createMockQuery = () => {
      // Mock 数据：包含 tags 和 pages 所需的所有字段
      const mockData = [{ 
        id: 't1', 
        name: 'Test', 
        user_id: 'user-1', 
        updated_at: 2000, 
        created_at: 1000, 
        bindings: [],
        // 额外添加 Page 所需字段，以防万一
        url: 'http://example.com',
        title: 'Page',
        domain: 'example.com'
      }];
      
      // 创建一个符合 Supabase v2 接口的 Builder 对象
      // 它既是 Chainable 的，又是 Thenable 的
      const builder: any = {
        // Thenable 接口：支持 await
        then: (onfulfilled?: any, onrejected?: any) => {
          return Promise.resolve({ data: mockData, error: null }).then(onfulfilled, onrejected);
        },
        catch: (onrejected?: any) => {
          return Promise.resolve({ data: mockData, error: null }).catch(onrejected);
        }
      };
      
      // Chainable 方法：返回 this
      const methods = ['select', 'eq', 'gt', 'lt', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'maybeSingle'];
      methods.forEach(method => {
        builder[method] = jest.fn().mockReturnValue(builder);
      });
      
      return builder;
    };
    
    // 应用 Mock
    (supabase.from as jest.Mock).mockImplementation(() => {
      return createMockQuery();
    });

    await syncService.syncAll();

    // 验证流程
    // 1. Push (uploadPendingChanges)
    // 2. Pull (fetchFromCloud) -> supabase.from 被调用
    expect(supabase.from).toHaveBeenCalledWith('tags');
    expect(supabase.from).toHaveBeenCalledWith('pages');
    
    // 3. Merge & Save
    // 增量同步应该更新 SYNC_LAST_TIMESTAMP
    expect(storageService.set).toHaveBeenCalledWith(STORAGE_KEYS.SYNC_LAST_TIMESTAMP, expect.any(Number));
    
    // 验证调用了 TagManager 的方法 (如果不包含数据，SyncService 会跳过这些调用)
    expect(mockTagManager.getAllData).toHaveBeenCalled();
    expect(mockTagManager.updateData).toHaveBeenCalled();
    expect(mockTagManager.syncToStorage).toHaveBeenCalled();
  });
});

