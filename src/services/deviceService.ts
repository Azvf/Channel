// src/services/deviceService.ts
import { supabase } from '../lib/supabase';
import { getDeviceId, getDeviceName } from '../popup/utils/device';
import { cacheService } from './cacheService';

export interface Device {
  id: string;
  name: string;
  last_sync_at: string;
  is_current: boolean; // 这是一个前端计算属性，数据库中不存储
}

class DeviceService {
  /**
   * 注册或更新当前设备的心跳
   * (通常在登录成功后或每次同步时调用)
   */
  async registerCurrentDevice(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const id = getDeviceId();
    const name = getDeviceName();

    const { error } = await supabase.from('devices').upsert({
      id,
      user_id: session.user.id,
      name,
      last_sync_at: new Date().toISOString()
    });

    if (error) throw error;
    
    // 注册成功后，让缓存失效，以便下次拉取最新时间
    await cacheService.remove(`devices_${session.user.id}`);
  }

  /**
   * 获取设备列表 (纯粹的数据获取，不处理缓存)
   * 缓存逻辑由 useCachedResource Hook 处理
   */
  async getDevices(): Promise<Device[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const currentDeviceId = getDeviceId();
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('last_sync_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      last_sync_at: row.last_sync_at,
      is_current: row.id === currentDeviceId
    }));
  }

  /**
   * 移除设备
   */
  async removeDevice(deviceId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', deviceId);

    if (error) throw error;

    // 移除成功后，必须让缓存失效
    await cacheService.remove(`devices_${session.user.id}`);
  }
}

export const deviceService = new DeviceService();

