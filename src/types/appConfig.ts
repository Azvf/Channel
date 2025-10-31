export interface AppConfig {
    /**
     * 是否在弹窗中展示调试模块。默认启用，仅在开发/运维配置中关闭。
     */
    enableDebugModule: boolean;
}

export const CONFIG_STORAGE_KEY = 'developer_config';

