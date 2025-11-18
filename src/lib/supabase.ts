// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 1. 定义 Supabase 配置
// 从环境变量读取（在构建时由 Vite 注入）
// Vite 会自动处理以 VITE_ 开头的环境变量
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// 开发环境警告
if (SUPABASE_URL === 'https://your-project-id.supabase.co' || SUPABASE_ANON_KEY === 'your-anon-key') {
  console.warn(
    '[Supabase] 警告: 未配置 Supabase 环境变量。请创建 .env 文件并设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'
  );
}

// 2. 自定义存储适配器 (Chrome Storage Adapter)
// Supabase 需要一个实现了 getItem/setItem/removeItem 的对象
// 我们直接封装 chrome.storage.local，确保在 Service Worker 中也能工作
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  },
  setItem: async (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  },
  removeItem: async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  },
};

// 3. 初始化客户端
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // 扩展环境中无法通过 URL 自动检测 Session
  },
});

