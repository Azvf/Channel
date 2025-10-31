import type { AppConfig } from '../../types/appConfig';
import { CONFIG_STORAGE_KEY } from '../../types/appConfig';
import type { ConfigProvider } from '../types';

export class ChromeConfigProvider implements ConfigProvider {
    private get storage(): chrome.storage.LocalStorageArea | null {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
            return null;
        }
        return chrome.storage.local;
    }

    async load(): Promise<AppConfig | null> {
        const storage = this.storage;
        if (!storage) {
            return null;
        }

        const result = await this.wrapGet(storage, CONFIG_STORAGE_KEY);
        if (!result) {
            return null;
        }

        return result as AppConfig;
    }

    async save(config: AppConfig): Promise<void> {
        const storage = this.storage;
        if (!storage) {
            return;
        }

        await this.wrapSet(storage, CONFIG_STORAGE_KEY, config);
    }

    private wrapGet<T>(storage: chrome.storage.LocalStorageArea, key: string): Promise<T | null> {
        return new Promise((resolve) => {
            storage.get([key], (items) => {
                const error = chrome.runtime?.lastError;
                if (error) {
                    console.warn('[Config] Failed to read from storage:', error.message);
                    resolve(null);
                    return;
                }
                resolve((items?.[key] as T | undefined) ?? null);
            });
        });
    }

    private wrapSet(storage: chrome.storage.LocalStorageArea, key: string, value: unknown): Promise<void> {
        return new Promise((resolve, reject) => {
            storage.set({ [key]: value }, () => {
                const error = chrome.runtime?.lastError;
                if (error) {
                    console.warn('[Config] Failed to write to storage:', error.message);
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
}

