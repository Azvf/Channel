/**
 * Device Adapter
 * 平台能力桥接层
 * 
 * 目的：隔离 Web 和 Mobile App (Webview/PWA) 的差异，优雅降级
 */

/**
 * 平台类型
 */
export type Platform = 'web' | 'ios-webview' | 'android-webview' | 'electron';

/**
 * 触感反馈接口
 */
export interface HapticFeedback {
  /** 轻微震动（对应 iOS UIImpactFeedbackGenerator.Light） */
  impactLight(): void;
  /** 中等震动 */
  impactMedium(): void;
  /** 强烈震动 */
  impactHeavy(): void;
  /** 成功通知震动 */
  notificationSuccess(): void;
  /** 错误通知震动 */
  notificationError(): void;
}

/**
 * 虚拟键盘接口
 */
export interface VirtualKeyboard {
  /**
   * 设置虚拟键盘的 Enter 键提示
   * @param hint - 提示类型
   */
  setEnterHint(hint: 'done' | 'go' | 'search' | 'next'): void;
  /** 关闭虚拟键盘 */
  dismiss(): void;
}

/**
 * 输入接口
 */
export interface InputAdapter {
  /**
   * 设置自动大写
   * @param enabled - 是否启用
   */
  setAutocapitalize(enabled: boolean): void;
}

/**
 * 设备适配器接口
 */
export interface DeviceAdapter {
  /** 当前平台 */
  platform: Platform;
  /** 触感反馈 */
  haptic: HapticFeedback;
  /** 虚拟键盘 */
  virtualKeyboard: VirtualKeyboard;
  /** 输入适配 */
  input: InputAdapter;
}

/**
 * 检测平台类型
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'web';
  }

  const ua = navigator.userAgent.toLowerCase();

  // 检测 Electron
  if (typeof (window as any).process !== 'undefined' && (window as any).process.versions?.electron) {
    return 'electron';
  }

  // 检测 iOS Webview
  if (/iphone|ipad|ipod/.test(ua)) {
    // 检测是否在 WebView 中
    if (/safari/.test(ua) && !/chrome|crios|fxios/.test(ua)) {
      return 'ios-webview';
    }
  }

  // 检测 Android Webview
  if (/android/.test(ua)) {
    // 检测是否在 WebView 中（简单检测）
    if (!/chrome/.test(ua) || /wv/.test(ua)) {
      return 'android-webview';
    }
  }

  return 'web';
}

/**
 * Web 平台设备适配器实现
 */
class WebDeviceAdapter implements DeviceAdapter {
  platform: Platform;

  constructor() {
    this.platform = detectPlatform();
  }

  haptic: HapticFeedback = {
    impactLight: () => {
      // 使用 Vibration API（如果支持）
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          // 优雅降级：不支持则忽略
        }
      }
    },
    impactMedium: () => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          // 优雅降级
        }
      }
    },
    impactHeavy: () => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(30);
        } catch {
          // 优雅降级
        }
      }
    },
    notificationSuccess: () => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([10, 50, 10]);
        } catch {
          // 优雅降级
        }
      }
    },
    notificationError: () => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([20, 50, 20, 50, 20]);
        } catch {
          // 优雅降级
        }
      }
    },
  };

  virtualKeyboard: VirtualKeyboard = {
    setEnterHint: (_hint: 'done' | 'go' | 'search' | 'next') => {
      // 这个功能需要在具体的 input 元素上设置
      // 这里只提供接口，实际使用需要在组件中调用
    },
    dismiss: () => {
      // 在 Web 中，虚拟键盘的关闭由浏览器控制
      // 可以通过 blur input 来触发
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
  };

  input: InputAdapter = {
    setAutocapitalize: (_enabled: boolean) => {
      // 这个功能需要在具体的 input 元素上设置
      // 这里只提供接口，实际使用需要在组件中调用
    },
  };
}

/**
 * 创建默认的设备适配器实例
 */
export function createDeviceAdapter(): DeviceAdapter {
  return new WebDeviceAdapter();
}

/**
 * 全局设备适配器实例（单例）
 */
let deviceAdapterInstance: DeviceAdapter | null = null;

/**
 * 获取全局设备适配器实例
 */
export function getDeviceAdapter(): DeviceAdapter {
  if (!deviceAdapterInstance) {
    deviceAdapterInstance = createDeviceAdapter();
  }
  return deviceAdapterInstance;
}

