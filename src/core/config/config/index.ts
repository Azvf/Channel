import { DEFAULT_APP_CONFIG } from './defaults';
import { DefaultConfigService } from './configService';
import type { ConfigProvider } from './types';
import type { AppConfig } from '../../../shared/types/appConfig';

// 延迟导入 provider factory，避免 Core 层直接依赖 Chrome API
async function createProvider(): Promise<ConfigProvider> {
    const { createConfigProvider } = await import('../../../infra/config/configProviderFactory');
    return createConfigProvider();
}

// 异步初始化 provider 和 configService
let providerPromise: Promise<ConfigProvider> | null = null;
let configServicePromise: Promise<DefaultConfigService> | null = null;

async function getConfigService(): Promise<DefaultConfigService> {
    if (!configServicePromise) {
        if (!providerPromise) {
            providerPromise = createProvider();
        }
        const provider = await providerPromise;
        configServicePromise = Promise.resolve(new DefaultConfigService(provider, DEFAULT_APP_CONFIG));
    }
    return configServicePromise;
}

export async function loadInitialAppConfig(): Promise<AppConfig> {
    const service = await getConfigService();
    return service.getConfig();
}

// 导出异步获取 configService 的函数
export async function getConfigServiceInstance(): Promise<DefaultConfigService> {
    return getConfigService();
}

export type { AppConfig };

