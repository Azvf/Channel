import { describe, it, expect, jest } from '@jest/globals';
import { SupabaseQueryBuilder } from '../SupabaseQueryBuilder';

describe('SupabaseQueryBuilder', () => {
  it('全量同步: 不应该添加 gt(updated_at) 过滤条件', () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockGt = jest.fn().mockReturnThis();
    
    const mockClient = {
      from: jest.fn(() => ({ 
        select: mockSelect, 
        eq: mockEq, 
        gt: mockGt 
      }))
    } as any;

    SupabaseQueryBuilder.buildFetchQuery(mockClient, 'tags', 'u1', 0);

    expect(mockClient.from).toHaveBeenCalledWith('tags');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockGt).not.toHaveBeenCalled();
  });

  it('增量同步: 应该添加 gt(updated_at) 过滤条件', () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockGt = jest.fn().mockReturnThis();
    
    const mockClient = {
      from: jest.fn(() => ({ 
        select: mockSelect, 
        eq: mockEq, 
        gt: mockGt 
      }))
    } as any;

    SupabaseQueryBuilder.buildFetchQuery(mockClient, 'tags', 'u1', 1000);

    expect(mockClient.from).toHaveBeenCalledWith('tags');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockGt).toHaveBeenCalledWith('updated_at', 1000);
  });

  it('应该支持不同的表名', () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    
    const mockClient = {
      from: jest.fn(() => ({ 
        select: mockSelect, 
        eq: mockEq
      }))
    } as any;

    SupabaseQueryBuilder.buildFetchQuery(mockClient, 'pages', 'u1', 0);

    expect(mockClient.from).toHaveBeenCalledWith('pages');
  });

  it('默认参数: 当不传 sinceTimestamp 时，应默认为 0 (全量拉取)', () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockGt = jest.fn().mockReturnThis();
    
    const mockClient = {
      from: jest.fn(() => ({ 
        select: mockSelect, 
        eq: mockEq, 
        gt: mockGt 
      }))
    } as any;

    // Act: 不传第四个参数
    SupabaseQueryBuilder.buildFetchQuery(mockClient, 'tags', 'u1');

    // Assert
    expect(mockClient.from).toHaveBeenCalledWith('tags');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    // 关键断言：确保没有调用 gt()，意味着 sinceTimestamp 默认为 0
    expect(mockGt).not.toHaveBeenCalled();
  });
});

