import { StorageService, storageService, STORAGE_KEYS } from '../storageService';

describe('StorageService', () => {
  const originalChrome = global.chrome;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (global as any).chrome = originalChrome;
  });

  afterAll(() => {
    (global as any).chrome = originalChrome;
  });

  it('should read and write via chrome.storage.local when available', async () => {
    const key = STORAGE_KEYS.THEME;
    const value = 'dark';

    const service = StorageService.create();

    (global as any).chrome.storage.local.get.mockResolvedValue({ [key]: value });

    await service.set(key, value);

    expect((global as any).chrome.storage.local.set).toHaveBeenCalledWith({ [key]: value });

    const result = await service.get<string>(key);
    expect(result).toBe(value);
  });

  it('should fall back to localStorage when chrome.storage is unavailable', async () => {
    (global as any).chrome = undefined;

    const service = StorageService.create();

    await service.set('custom_key', { foo: 'bar' });

    expect(localStorage.getItem('custom_key')).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('should warn and fallback when chrome.storage.sync is missing', async () => {
    const originalSync = (global as any).chrome.storage.sync;
    (global as any).chrome.storage.sync = undefined;

    const service = StorageService.create('sync');

    await service.set('sync_key', 'value');

    expect(localStorage.getItem('sync_key')).toBe(JSON.stringify('value'));
    expect(console.warn).toHaveBeenCalledWith(
      '[StorageService] chrome.storage.sync not available, falling back to localStorage',
    );

    (global as any).chrome.storage.sync = originalSync;
  });

  it('should handle getMultiple returning nulls when keys missing', async () => {
    const keys = ['key_a', 'key_b'];
    (global as any).chrome.storage.local.get.mockResolvedValue({ key_a: 'A' });

    const result = await storageService.getMultiple<string>(keys);

    expect(result).toEqual({ key_a: 'A', key_b: null });
  });
});

