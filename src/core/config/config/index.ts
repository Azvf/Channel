import { DEFAULT_APP_CONFIG } from './defaults';
import { ChromeConfigProvider } from './providers/chromeConfigProvider';
import { MemoryConfigProvider } from './providers/memoryConfigProvider';
import { DefaultConfigService } from './configService';
import type { ConfigProvider } from './types';
import type { AppConfig } from '../../../shared/types/appConfig';

function detectProvider(): ConfigProvider {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        return new ChromeConfigProvider();
    }
    return new MemoryConfigProvider();
}

const provider = detectProvider();
const configService = new DefaultConfigService(provider, DEFAULT_APP_CONFIG);

export async function loadInitialAppConfig(): Promise<AppConfig> {
    return configService.getConfig();
}

export { configService };
export type { AppConfig };

