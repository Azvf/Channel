// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 1. 定义 Supabase 配置
// 从环境变量读取（在构建时由 Vite 注入）
// Vite 会在构建时根据 mode 自动替换 import.meta.env 的值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 防御性检查，防止构建配置错误
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase URL or Key is missing. Check your .env files. ' +
    'Please create .env.development (for dev) or .env.production (for prod) ' +
    'and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
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
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // 扩展环境中无法通过 URL 自动检测 Session
  },
});

