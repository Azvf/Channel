-- ==========================================
-- GameplayTag Extension - Database Schema
-- ==========================================
-- 
-- 使用说明：
-- 1. 开发新功能时，先在 Dev Dashboard 验证 SQL
-- 2. 验证通过后，将 SQL 语句追加到此文件中
-- 3. 上线前，手动（或通过 CLI）对 Prod 数据库执行新增的 SQL 语句
--
-- 重要提示：
-- - 每次修改表结构后，务必同步到 Prod 环境
-- - 修改 RLS 策略后，也要同步到 Prod 环境
-- ==========================================

-- ==========================================
-- 1. Tags 表
-- ==========================================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  bindings TEXT[] DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  
  PRIMARY KEY (id, user_id)
);

-- ==========================================
-- 2. Pages 表
-- ==========================================
CREATE TABLE IF NOT EXISTS pages (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  favicon TEXT,
  description TEXT,
  deleted BOOLEAN DEFAULT FALSE,
  
  PRIMARY KEY (id, user_id)
);

-- ==========================================
-- 3. 索引优化
-- ==========================================
-- 为常用查询字段创建索引，提升查询性能

-- Tags 表索引
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id_updated_at ON tags(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_id_deleted ON tags(user_id, deleted) WHERE deleted = FALSE;

-- Pages 表索引
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id_updated_at ON pages(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pages_user_id_deleted ON pages(user_id, deleted) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_pages_domain ON pages(domain);

-- ==========================================
-- 4. Row Level Security (RLS) 策略
-- ==========================================
-- 启用 RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Tags 表 RLS 策略
-- 用户只能访问自己的标签
CREATE POLICY IF NOT EXISTS "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Pages 表 RLS 策略
-- 用户只能访问自己的页面
CREATE POLICY IF NOT EXISTS "Users can view their own pages"
  ON pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own pages"
  ON pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own pages"
  ON pages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own pages"
  ON pages FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. 注释说明
-- ==========================================
COMMENT ON TABLE tags IS '存储用户的游戏标签数据';
COMMENT ON TABLE pages IS '存储用户标记的网页数据';

COMMENT ON COLUMN tags.deleted IS '软删除标记，用于同步功能';
COMMENT ON COLUMN pages.deleted IS '软删除标记，用于同步功能';
COMMENT ON COLUMN tags.bindings IS '绑定的其他标签ID数组';
COMMENT ON COLUMN pages.tags IS '关联的标签ID数组';

