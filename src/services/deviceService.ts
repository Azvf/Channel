// src/services/deviceService.ts
import { supabase } from '../infra/database/supabase';
import { getDeviceId, getDeviceName } from '../popup/utils/device';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import { logger } from '../infra/logger';

const log = logger('DeviceService');

export interface Device {
  id: string;
  name: string;
  last_sync_at: string;
  is_current: boolean;
}

class DeviceService {
  /**
   * 注册或更新当前设备的心跳
   * [最佳实践]：包含 try-catch 容错，确保不阻塞主流程
   */
  async registerCurrentDevice(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const id = getDeviceId();
      const name = getDeviceName();

      // 使用 upsert 更新心跳
      const { error } = await supabase.from('devices').upsert({
        id,
        user_id: session.user.id,
        name,
        last_sync_at: new Date().toISOString()
      });

      if (error) {
        // 记录错误但不抛出，防止阻塞后续的数据读取
        log.warn('Heartbeat update failed (non-critical)', { error: error.message });
      } else {
        // 仅在成功时失效缓存，强制下次读取最新数据
        // 使用 TanStack Query 失效缓存
        queryClient.invalidateQueries({ queryKey: queryKeys.devices(session.user.id) });
      }
    } catch (error) {
      // 捕获所有网络或未知错误
      log.error('Unexpected error during heartbeat', { error });
    }
  }

  /**
   * 获取设备列表
   * 这里应该抛出错误供 UI 层处理（显示重试按钮等），因为读不到数据是关键错误
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
    // 使用 TanStack Query 失效缓存
    queryClient.invalidateQueries({ queryKey: queryKeys.devices(session.user.id) });
  }
}

export const deviceService = new DeviceService();

