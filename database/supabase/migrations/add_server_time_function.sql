-- ==========================================
-- 添加服务器时间基准函数 (Scheme F+)
-- ==========================================
-- 返回数据库的 Unix 毫秒时间戳 (高精度)
-- 用于消除客户端时钟差异，确保时间戳的一致性

create or replace function get_server_time()
returns bigint
language sql
stable
as $$
  select extract(epoch from now()) * 1000;
$$;

-- 添加注释说明
comment on function get_server_time() is '返回服务器的 Unix 毫秒时间戳，用于客户端时间校准';

