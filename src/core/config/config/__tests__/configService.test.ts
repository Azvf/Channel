import { DefaultConfigService } from '../configService';
import type { ConfigProvider } from '../types';
import { DEFAULT_APP_CONFIG } from '../defaults';

describe('DefaultConfigService', () => {
  let load: jest.Mock;
  let save: jest.Mock;
  let provider: ConfigProvider;

  beforeEach(() => {
    load = jest.fn().mockResolvedValue({ enableDebugModule: false });
    save = jest.fn().mockResolvedValue(undefined);
    provider = { load, save };
  });

  it('首次调用 getConfig 时加载并缓存配置', async () => {
    const service = new DefaultConfigService(provider, DEFAULT_APP_CONFIG);

    const first = await service.getConfig();
    const second = await service.getConfig();

    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ enableDebugModule: false });
    expect(second).toBe(first);
  });

  it('当 provider 返回 null 时使用默认配置', async () => {
    load.mockResolvedValueOnce(null);
    const service = new DefaultConfigService(provider, DEFAULT_APP_CONFIG);

    const config = await service.getConfig();

    expect(config).toEqual(DEFAULT_APP_CONFIG);
  });

  it('updateConfig 会合并 patch 并持久化', async () => {
    const service = new DefaultConfigService(provider, DEFAULT_APP_CONFIG);
    await service.getConfig(); // 触发初次加载
    load.mockClear();
    save.mockClear();

    const updated = await service.updateConfig({ enableDebugModule: true });

    expect(updated).toEqual({ enableDebugModule: true });
    expect(save).toHaveBeenCalledWith({ enableDebugModule: true });
    expect(load).not.toHaveBeenCalled();

    const cached = await service.getConfig();
    expect(cached).toEqual({ enableDebugModule: true });
    expect(load).not.toHaveBeenCalled();
  });
});


