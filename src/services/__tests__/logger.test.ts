import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { logger } from '../logger';

describe('Logger', () => {
  let originalConsole: typeof console;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let infoSpy: jest.SpiedFunction<typeof console.info>;
  let debugSpy: jest.SpiedFunction<typeof console.debug>;

  beforeEach(() => {
    // 保存原始console方法
    originalConsole = { ...console };
    
    // 创建spy
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    infoSpy = jest.spyOn(console, 'info').mockImplementation();
    debugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    // 恢复原始console方法
    Object.assign(console, originalConsole);
    jest.restoreAllMocks();
  });

  describe('logger实例创建', () => {
    it('应该为不同的命名空间创建独立的logger', () => {
      const logger1 = logger('Namespace1');
      const logger2 = logger('Namespace2');
      
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });

    it('应该提供所有日志级别的方法', () => {
      const log = logger('TestNamespace');
      
      expect(typeof log.debug).toBe('function');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
      expect(typeof log.timeStart).toBe('function');
      expect(typeof log.timeEnd).toBe('function');
    });
  });

  describe('debug级别日志', () => {
    it('应该输出debug日志', () => {
      const log = logger('TestNamespace');
      
      log.debug('测试消息');
      
      expect(debugSpy).toHaveBeenCalledWith('[TestNamespace] 测试消息');
    });

    it('应该支持带上下文的debug日志', () => {
      const log = logger('TestNamespace');
      
      log.debug('测试消息', { key: 'value', count: 123 });
      
      expect(debugSpy).toHaveBeenCalledWith(
        '[TestNamespace] 测试消息',
        { key: 'value', count: 123 }
      );
    });
  });

  describe('info级别日志', () => {
    it('应该输出info日志', () => {
      const log = logger('TestNamespace');
      
      log.info('信息消息');
      
      expect(infoSpy).toHaveBeenCalledWith('[TestNamespace] 信息消息');
    });

    it('应该支持带上下文的info日志', () => {
      const log = logger('TestNamespace');
      
      log.info('信息消息', { status: 'success' });
      
      expect(infoSpy).toHaveBeenCalledWith(
        '[TestNamespace] 信息消息',
        { status: 'success' }
      );
    });
  });

  describe('warn级别日志', () => {
    it('应该输出warn日志', () => {
      const log = logger('TestNamespace');
      
      log.warn('警告消息');
      
      expect(warnSpy).toHaveBeenCalledWith('[TestNamespace] 警告消息');
    });

    it('应该支持带上下文的warn日志', () => {
      const log = logger('TestNamespace');
      
      log.warn('警告消息', { errorCode: 'W001' });
      
      expect(warnSpy).toHaveBeenCalledWith(
        '[TestNamespace] 警告消息',
        { errorCode: 'W001' }
      );
    });
  });

  describe('error级别日志', () => {
    it('应该输出error日志', () => {
      const log = logger('TestNamespace');
      
      log.error('错误消息');
      
      expect(errorSpy).toHaveBeenCalledWith('[TestNamespace] 错误消息');
    });

    it('应该支持带上下文的error日志', () => {
      const log = logger('TestNamespace');
      
      log.error('错误消息', { error: 'Something went wrong' });
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[TestNamespace] 错误消息',
        { error: 'Something went wrong' }
      );
    });

    it('应该正确记录错误对象', () => {
      const log = logger('TestNamespace');
      const error = new Error('测试错误');
      
      log.error('捕获到错误', { error, stack: error.stack });
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[TestNamespace] 捕获到错误',
        expect.objectContaining({
          error: expect.any(Error),
          stack: expect.any(String)
        })
      );
    });
  });

  describe('性能计时功能', () => {
    it('应该正确开始计时', () => {
      const log = logger('TestNamespace');
      const timer = log.timeStart('测试操作');
      
      expect(timer).toBeDefined();
      expect(timer.t0).toBeDefined();
      expect(typeof timer.t0).toBe('number');
      expect(timer.label).toBe('测试操作');
    });

    it('应该正确结束计时并输出结果', async () => {
      const log = logger('TestNamespace');
      const timer = log.timeStart('测试操作');
      
      // 模拟一些异步操作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = log.timeEnd(timer);
      
      expect(duration).toBeDefined();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestNamespace] time: 测试操作'),
        expect.objectContaining({
          durationMs: expect.any(Number)
        })
      );
    });

    it('应该支持不带标签的计时', () => {
      const log = logger('TestNamespace');
      const timer = log.timeStart();
      
      expect(timer.label).toBeUndefined();
      
      const duration = log.timeEnd(timer);
      expect(duration).toBeDefined();
    });

    it('应该支持带额外上下文的计时', () => {
      const log = logger('TestNamespace');
      const timer = log.timeStart('数据库查询');
      
      const duration = log.timeEnd(timer, { queryType: 'SELECT', rows: 100 });
      
      expect(duration).toBeDefined();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestNamespace] time: 数据库查询'),
        expect.objectContaining({
          durationMs: expect.any(Number),
          queryType: 'SELECT',
          rows: 100
        })
      );
    });

    it('应该返回正确的duration值', async () => {
      const log = logger('TestNamespace');
      const timer = log.timeStart();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = log.timeEnd(timer);
      expect(duration).toBeGreaterThanOrEqual(90); // 允许一些时间误差
      expect(duration).toBeLessThan(200);
    });
  });

  describe('实际使用场景', () => {
    it('应该支持典型的使用流程', () => {
      const log = logger('TagManager');
      
      const timer = log.timeStart('初始化');
      log.info('开始初始化TagManager');
      log.timeEnd(timer);
      log.debug('初始化完成', { success: true });
      
      expect(infoSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalled();
    });

    it('应该支持错误处理场景', () => {
      const log = logger('APIHandler');
      
      log.info('开始请求', { url: '/api/data' });
      log.warn('请求超时，尝试重试', { attempt: 1 });
      log.error('请求失败', { 
        error: 'Network error',
        statusCode: 500
      });
      
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('应该支持复杂上下文对象', () => {
      const log = logger('DataProcessor');
      
      const context = {
        userId: '12345',
        action: 'update',
        timestamp: Date.now(),
        metadata: {
          source: 'web',
          version: '1.0.0'
        }
      };
      
      log.debug('处理数据', context);
      
      expect(debugSpy).toHaveBeenCalledWith(
        '[DataProcessor] 处理数据',
        context
      );
    });
  });

  describe('边缘情况', () => {
    it('应该处理空消息', () => {
      const log = logger('TestNamespace');
      
      log.debug('');
      expect(debugSpy).toHaveBeenCalledWith('[TestNamespace] ');
    });

    it('应该处理空上下文', () => {
      const log = logger('TestNamespace');
      
      log.debug('消息', {});
      expect(debugSpy).toHaveBeenCalledWith('[TestNamespace] 消息', {});
    });

    it('应该处理undefined上下文', () => {
      const log = logger('TestNamespace');
      
      log.debug('消息');
      expect(debugSpy).toHaveBeenCalledWith('[TestNamespace] 消息');
    });

    it('应该处理特殊字符和emoji', () => {
      const log = logger('TestNamespace');
      
      log.info('包含特殊字符: !@#$%^&*()');
      log.debug('包含emoji: 🎉✨🚀');
      
      expect(infoSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe('性能表现', () => {
    it('应该高效处理大量日志', () => {
      const log = logger('TestNamespace');
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        log.debug(`消息 ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 应该能在合理时间内完成（1000条日志应小于100ms）
      expect(duration).toBeLessThan(100);
      expect(debugSpy).toHaveBeenCalledTimes(1000);
    });
  });
});

