import type { AppConfig } from '../../types/appConfig';
import { CONFIG_STORAGE_KEY } from '../../types/appConfig';
import type { ConfigProvider } from '../types';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

export class ChromeConfigProvider implements ConfigProvider {
    async load(): Promise<AppConfig | null> {
        // 使用统一的存储服务，如果 CONFIG_STORAGE_KEY 等于 STORAGE_KEYS.APP_CONFIG，直接使用
        const storageKey = CONFIG_STORAGE_KEY === 'developer_config' 
            ? STORAGE_KEYS.APP_CONFIG 
            : CONFIG_STORAGE_KEY;
        
        const result = await storageService.get<AppConfig>(storageKey);
        return result;
    }

    async save(config: AppConfig): Promise<void> {
        const storageKey = CONFIG_STORAGE_KEY === 'developer_config' 
            ? STORAGE_KEYS.APP_CONFIG 
            : CONFIG_STORAGE_KEY;
        
        await storageService.set(storageKey, config);
    }
}

