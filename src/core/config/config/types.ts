import type { AppConfig } from '../../../shared/types/appConfig';

export interface ConfigProvider {
    load(): Promise<AppConfig | null>;
    save(config: AppConfig): Promise<void>;
}

export interface ConfigService {
    getConfig(): Promise<AppConfig>;
    updateConfig(patch: Partial<AppConfig>): Promise<AppConfig>;
}

