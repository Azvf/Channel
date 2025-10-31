import type { AppConfig } from '../types/appConfig';
import type { ConfigProvider, ConfigService } from './types';

export class DefaultConfigService implements ConfigService {
    private cachedConfig: AppConfig | null = null;

    constructor(
        private readonly provider: ConfigProvider,
        private readonly defaults: AppConfig
    ) {}

    async getConfig(): Promise<AppConfig> {
        if (this.cachedConfig) {
            return this.cachedConfig;
        }

        const stored = await this.safeLoad();
        const merged = {
            ...this.defaults,
            ...(stored ?? {})
        } as AppConfig;

        this.cachedConfig = merged;
        return merged;
    }

    async updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
        const current = await this.getConfig();
        const updated = { ...current, ...patch } as AppConfig;
        await this.safeSave(updated);
        this.cachedConfig = updated;
        return updated;
    }

    private async safeLoad(): Promise<AppConfig | null> {
        try {
            return await this.provider.load();
        } catch (error) {
            console.error('[Config] Failed to load config:', error);
            return null;
        }
    }

    private async safeSave(config: AppConfig): Promise<void> {
        try {
            await this.provider.save(config);
        } catch (error) {
            console.error('[Config] Failed to persist config:', error);
        }
    }
}

