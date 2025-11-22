import type { AppConfig } from '../../../../shared/types/appConfig';
import type { ConfigProvider } from '../types';

export class MemoryConfigProvider implements ConfigProvider {
    private config: AppConfig | null = null;

    async load(): Promise<AppConfig | null> {
        return this.config;
    }

    async save(config: AppConfig): Promise<void> {
        this.config = { ...config };
    }
}

