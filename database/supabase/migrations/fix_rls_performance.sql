-- ==========================================
-- 修复 RLS 策略性能问题
-- ==========================================
-- 
-- 问题：RLS 策略中的 auth.uid() 在每个行上都重新评估，导致性能问题
-- 解决：将 auth.uid() 替换为 (select auth.uid())，这样只在查询开始时评估一次
-- 
-- 执行方式：
-- 1. 在 Supabase Dashboard 的 SQL Editor 中执行
-- 2. 或使用 Supabase CLI: supabase db push
-- ==========================================

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON tags;

DROP POLICY IF EXISTS "Users can view their own pages" ON pages;
DROP POLICY IF EXISTS "Users can insert their own pages" ON pages;
DROP POLICY IF EXISTS "Users can update their own pages" ON pages;
DROP POLICY IF EXISTS "Users can delete their own pages" ON pages;

-- 重新创建优化后的 Tags 表 RLS 策略
-- 使用 (select auth.uid()) 而不是 auth.uid() 以优化性能
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own tags"
  ON tags FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING ((select auth.uid()) = user_id);

-- 重新创建优化后的 Pages 表 RLS 策略
-- 使用 (select auth.uid()) 而不是 auth.uid() 以优化性能
CREATE POLICY "Users can view their own pages"
  ON pages FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own pages"
  ON pages FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own pages"
  ON pages FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own pages"
  ON pages FOR DELETE
  USING ((select auth.uid()) = user_id);

