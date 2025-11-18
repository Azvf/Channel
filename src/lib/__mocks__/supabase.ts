// Mock for supabase.ts in Jest tests
import { createClient } from '@supabase/supabase-js';

const mockSupabaseUrl = 'https://mock.supabase.co';
const mockSupabaseKey = 'mock-anon-key';

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

export const supabase = createClient(mockSupabaseUrl, mockSupabaseKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

