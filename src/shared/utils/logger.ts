/**
 * 日志管理工具
 * 统一管理应用日志，支持开发/生产环境切换
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;
  private module: string;

  constructor(module: string = 'App') {
    this.module = module;
    // 检查是否为开发环境
    this.isDevelopment =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.module}] [${level.toUpperCase()}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.isDevelopment && level === 'debug') {
      return; // 生产环境不输出 debug 日志
    }

    const formattedMessage = this.formatMessage(level, message);

    switch (level) {
      case 'debug':
        console.log(formattedMessage, data || '');
        break;
      case 'info':
        console.info(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }

    // 可以在这里添加日志上报逻辑
    // 例如：发送到日志服务、存储到本地等
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * 创建子模块日志器
   */
  createChild(module: string): Logger {
    return new Logger(`${this.module}/${module}`);
  }
}

// 导出默认日志器
export const logger = new Logger('App');

// 导出 Logger 类，允许创建自定义日志器
export { Logger };

// 导出便捷函数
export const createLogger = (module: string): Logger => {
  return new Logger(module);
};

