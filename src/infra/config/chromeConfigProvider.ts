/**
 * Chrome Config Provider
 * 
 * 从 core/config 移到 infra 层，避免 Core 层依赖 Chrome API 和 Service 层
 * 直接使用 chrome.storage API，不依赖 storageService
 */

import type { AppConfig } from '../../shared/types/appConfig';
import { CONFIG_STORAGE_KEY } from '../../shared/types/appConfig';
import type { ConfigProvider } from '../../core/config/config/types';

export class ChromeConfigProvider implements ConfigProvider {
    async load(): Promise<AppConfig | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get([CONFIG_STORAGE_KEY], (result) => {
                const config = result[CONFIG_STORAGE_KEY];
                resolve(config ? (config as AppConfig) : null);
            });
        });
    }

    async save(config: AppConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: config }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }
}


