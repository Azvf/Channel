import { supabase } from '../infra/database/supabase';
import { logger } from '../infra/logger';

const log = logger('TimeService');

/**
 * 时间校准服务 (Scheme F+)
 * 
 * 职责：
 * 1. 通过 RPC 调用获取服务器时间
 * 2. 计算客户端与服务器的时钟偏移量
 * 3. 提供校准后的本地时间（Date.now() + offset）
 * 
 * 校准策略：
 * - 多重采样（3次）去噪，降低网络延迟影响
 * - 取中位数作为最终偏移量
 * - 精度目标：< 50ms
 */
class TimeService {
  private static instance: TimeService;
  private offset: number = 0;
  private _isCalibrated = false;

  private constructor() {
    // 单例模式
  }

  public static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  /**
   * 使用 RPC 进行多重采样校准，精度 < 50ms
   * 
   * 算法：
   * 1. 发送 3 次 RPC 请求
   * 2. 每次记录：localStart, serverTime, localEnd
   * 3. 计算：offset = serverTime - (localTime + latency/2)
   * 4. 取中位数作为最终偏移量
   */
  public async calibrate(): Promise<void> {
    if (this._isCalibrated) {
      log.debug('时间已校准，跳过');
      return;
    }

    try {
      const samples: number[] = [];

      // 3次采样去噪
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const { data, error } = await supabase.rpc('get_server_time');
        const end = performance.now();

        if (error) {
          log.warn('RPC 调用失败，跳过本次采样', { error: error.message, attempt: i + 1 });
          continue;
        }

        if (data !== null && data !== undefined) {
          const latency = (end - start) / 2; // 往返延迟的一半作为单向延迟估计
          const localNow = Date.now();
          // Offset = ServerTime - (LocalTime + Latency)
          const offset = data - (localNow + latency);
          samples.push(offset);
          log.debug('采样完成', { attempt: i + 1, offset, latency });
        }
      }

      if (samples.length > 0) {
        // 排序并取中位数
        samples.sort((a, b) => a - b);
        const medianIndex = Math.floor(samples.length / 2);
        this.offset = Math.round(samples[medianIndex]);
        this._isCalibrated = true;
        log.info('时间校准完成', { 
          offset: this.offset, 
          samples: samples.length,
          medianOffset: this.offset 
        });
      } else {
        log.warn('所有采样失败，使用默认偏移量 0');
        this._isCalibrated = false;
      }
    } catch (error) {
      log.error('时间校准失败', { error });
      this._isCalibrated = false;
      // 不抛出错误，允许降级使用本地时间
    }
  }

  /**
   * 获取校准后的当前时间戳（毫秒）
   * 
   * 如果未校准，返回本地时间
   * 如果已校准，返回 Date.now() + offset
   */
  public now(): number {
    return Date.now() + this.offset;
  }

  /**
   * 获取校准状态
   */
  public get isCalibrated(): boolean {
    return this._isCalibrated;
  }

  /**
   * 获取当前偏移量（毫秒）
   */
  public getOffset(): number {
    return this.offset;
  }

  /**
   * 重置校准状态（用于测试）
   */
  public reset(): void {
    this.offset = 0;
    this._isCalibrated = false;
  }
}

export const timeService = TimeService.getInstance();

