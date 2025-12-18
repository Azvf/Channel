import { toast as sonnerToast } from 'sonner';

/**
 * Toast 工具函数
 * 提供统一的 Toast 通知接口
 */
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4000,
    });
  },
  // 自定义 Toast
  custom: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast(message, options);
  },
};

