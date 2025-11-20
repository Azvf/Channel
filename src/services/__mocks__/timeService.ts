// Mock for timeService.ts in Jest tests
// 测试环境中，我们不需要真正的时间校准，直接返回本地时间

class MockTimeService {
  private offset: number = 0;
  private _isCalibrated: boolean = false;

  public async calibrate(): Promise<void> {
    // 测试环境中，直接标记为已校准，不执行实际的 RPC 调用
    this._isCalibrated = true;
    this.offset = 0; // 测试中使用本地时间
  }

  public now(): number {
    return Date.now() + this.offset;
  }

  public get isCalibrated(): boolean {
    return this._isCalibrated;
  }

  public getOffset(): number {
    return this.offset;
  }

  public reset(): void {
    this.offset = 0;
    this._isCalibrated = false;
  }
}

export const timeService = new MockTimeService();

