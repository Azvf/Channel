// src/popup/utils/device.ts

const DEVICE_ID_KEY = 'channel_client_device_id';

/**
 * 获取或生成当前设备的唯一 ID (持久化存储在 localStorage)
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * 解析 UserAgent 生成易读的设备名称
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  if (ua.includes('Mac')) os = 'macOS';
  if (ua.includes('Linux')) os = 'Linux';
  if (ua.includes('Android')) os = 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser = 'Unknown Browser';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

  return `${browser} on ${os}`;
}

