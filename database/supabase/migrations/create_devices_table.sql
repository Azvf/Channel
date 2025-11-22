-- 1. 创建设备表
create table if not exists devices (
  id text not null, -- 客户端生成的 UUID，存储在 localStorage
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- 例如: "Chrome on macOS"
  last_sync_at timestamptz default now(),
  created_at timestamptz default now(),
  
  primary key (id, user_id)
);

-- 2. 启用 RLS (Row Level Security)
alter table devices enable row level security;

-- 3. 配置访问策略 (用户只能管理自己的设备)
create policy "Users can view their own devices" 
  on devices for select using (auth.uid() = user_id);

create policy "Users can register/update their own devices" 
  on devices for insert with check (auth.uid() = user_id);

create policy "Users can update sync time" 
  on devices for update using (auth.uid() = user_id);

create policy "Users can delete their own devices" 
  on devices for delete using (auth.uid() = user_id);

