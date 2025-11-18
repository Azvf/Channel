// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 1. 定义 Supabase 配置
// 从环境变量读取（在构建时由 Vite 注入）
// Vite 会在构建时根据 mode 自动替换 import.meta.env 的值
// 在测试环境中，如果没有 import.meta.env，尝试从 process.env 读取

// 使用函数来动态获取环境变量，避免 Jest 解析时的 import.meta 错误
function getSupabaseUrl(): string | undefined {
  // 优先使用 process.env（测试环境）
  if (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) {
    return process.env.VITE_SUPABASE_URL;
  }
  
  // Vite 环境：使用 import.meta.env
  // 注意：Jest 在解析时会报错，但实际运行时 Vite 已经替换了这些值
  // 所以只有在没有 process.env 的情况下才会到达这里
  // 使用 eval 来避免 Jest 解析时的错误
  try {
    // eslint-disable-next-line no-eval
    const metaEnv = eval('typeof import.meta !== "undefined" ? import.meta.env : undefined');
    return metaEnv?.VITE_SUPABASE_URL;
  } catch {
    return undefined;
  }
}

function getSupabaseKey(): string | undefined {
  // 优先使用 process.env（测试环境）
  if (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) {
    return process.env.VITE_SUPABASE_ANON_KEY;
  }
  
  // Vite 环境：使用 import.meta.env
  try {
    // eslint-disable-next-line no-eval
    const metaEnv = eval('typeof import.meta !== "undefined" ? import.meta.env : undefined');
    return metaEnv?.VITE_SUPABASE_ANON_KEY;
  } catch {
    return undefined;
  }
}

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

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
// 支持 Promise 和回调两种风格的 API（以兼容测试环境和真实环境）

// 检测 storage API 是否支持 Promise 风格（测试环境）还是回调风格（真实环境）
const isPromiseBasedStorage = (): boolean => {
  try {
    // 测试环境：mock 函数直接返回 Promise，不调用 callback
    // 真实环境：调用 callback，不返回 Promise
    // 我们通过检查 mock 属性来判断（Jest mock 会有 mock 属性）
    const storageGet = chrome.storage.local.get;
    return typeof (storageGet as any)?.mock !== 'undefined' || 
           (typeof storageGet === 'function' && storageGet.length === 0);
  } catch {
    return false;
  }
};

const isPromiseBased = isPromiseBasedStorage();

const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isPromiseBased) {
      // Promise 风格（测试环境）
      try {
        const result = await chrome.storage.local.get([key]);
        return result?.[key] || null;
      } catch (error) {
        console.warn('[Supabase] Storage getItem failed:', error);
        return null;
      }
    }
    
    // 回调风格（真实环境），添加超时保护
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Storage getItem timeout'));
      }, 5000);
      
      try {
        chrome.storage.local.get([key], (result: Record<string, any> | null) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result?.[key] || null);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    if (isPromiseBased) {
      // Promise 风格（测试环境）
      try {
        await chrome.storage.local.set({ [key]: value });
        return;
      } catch (error) {
        console.warn('[Supabase] Storage setItem failed:', error);
        throw error;
      }
    }
    
    // 回调风格（真实环境），添加超时保护
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Storage setItem timeout'));
      }, 5000);
      
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  },
  
  removeItem: async (key: string): Promise<void> => {
    if (isPromiseBased) {
      // Promise 风格（测试环境）
      try {
        await chrome.storage.local.remove(key);
        return;
      } catch (error) {
        console.warn('[Supabase] Storage removeItem failed:', error);
        throw error;
      }
    }
    
    // 回调风格（真实环境），添加超时保护
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Storage removeItem timeout'));
      }, 5000);
      
      try {
        chrome.storage.local.remove(key, () => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
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

