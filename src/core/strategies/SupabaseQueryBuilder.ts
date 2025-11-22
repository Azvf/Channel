import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 查询构建器
 * 提取查询构建逻辑，便于测试和维护
 */
export class SupabaseQueryBuilder {
  /**
   * 构建数据拉取查询
   * @param supabase Supabase 客户端
   * @param table 表名
   * @param userId 用户ID
   * @param sinceTimestamp 增量同步游标（时间戳，毫秒）。如果为0，则执行全量拉取
   * @returns 构建好的查询对象
   */
  static buildFetchQuery(
    supabase: SupabaseClient,
    table: string,
    userId: string,
    sinceTimestamp: number = 0
  ) {
    let query = supabase.from(table).select('*').eq('user_id', userId);
    
    if (sinceTimestamp > 0) {
      query = query.gt('updated_at', sinceTimestamp);
    }
    
    return query;
  }
}

