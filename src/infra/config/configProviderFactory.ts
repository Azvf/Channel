/**
 * Config Provider Factory
 * 
 * 在 infra 层创建 ConfigProvider，避免 Core 层依赖 Chrome API
 */

import type { ConfigProvider } from '../../core/config/config/types';
import { ChromeConfigProvider } from './chromeConfigProvider';
import { MemoryConfigProvider } from '../../core/config/config/providers/memoryConfigProvider';

/**
 * 检测并创建合适的 ConfigProvider
 */
export function createConfigProvider(): ConfigProvider {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        return new ChromeConfigProvider();
    }
    return new MemoryConfigProvider();
}

// 导出类型以便外部使用
export type { ConfigProvider };

