// src/rpc/server.ts
// 服务端设计：事务控制与异常屏障

import { TagManager } from '../services/tagManager';
import { timeService } from '../services/timeService';
import { getInitializationPromise } from '../background/init';
import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  RpcErrorCode, 
  RpcErrorShape,
  RpcError
} from './protocol';

// 依赖注入或单例获取
const tagManager = TagManager.getInstance();

// 慢查询阈值（毫秒）
const SLOW_QUERY_THRESHOLD = 200;

/**
 * 触发后台同步但不阻塞响应
 * 实现 "Fire and Forget" 模式
 * 
 * 注意：此函数仅用于业务层（BackgroundServiceImpl）调用，不在 Server 层自动触发同步
 */
function triggerBackgroundSync(syncPromise: Promise<void>): void {
  syncPromise.catch((err) => {
    console.warn('[RPC-Server] 异步同步触发失败 (已由 SyncService 内部处理，此处仅记录):', err);
  });
}

/**
 * 判断方法是否为写入操作（用于时间校准，不影响同步逻辑）
 */
function isWriteOperation(method: string): boolean {
  const writeMethods = ['create', 'update', 'delete', 'add', 'remove', 'import'];
  return writeMethods.some(prefix => method.toLowerCase().startsWith(prefix));
}

/**
 * RPC 服务端注册器
 */
export function registerRpcHandler<T extends object>(service: T): void {
  chrome.runtime.onMessage.addListener(
    (message: JsonRpcRequest, _sender, sendResponse) => {
      // 1. 协议校验
      if (message?.jsonrpc !== '2.0' || !message.method || !message.id) {
        // 忽略非 RPC 消息，返回 false 让其他处理器处理
        return false;
      }

      const { id, method, args, meta } = message;
      const traceId = meta?.traceId || id;
      const startTime = performance.now();

      // [DEBUG] 服务端接收日志
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RPC-Server] 📥 Handling ${method} (ID: ${id}, TraceID: ${traceId})`);
      }

      // 2. 异步执行器
      (async () => {
        try {
          const handler = (service as any)[method];

          if (typeof handler !== 'function') {
            throw new RpcError(
              RpcErrorCode.HANDLER_NOT_FOUND, 
              `Method '${method}' not found`
            );
          }

          // === 事务开始 ===

          // 3. 确保数据是最新的 (Rehydration)
          await getInitializationPromise();

          // 4. 时间校准 (如果是写入操作)
          if (isWriteOperation(method)) {
            await timeService.calibrate().catch(() => {
              // 校准失败不影响业务，降级使用本地时间
              console.warn(`[RPC-Server] 时间校准失败，降级使用本地时间 (${method})`);
            });
          }

          // 5. 执行业务逻辑
          // 使用 .apply 确保 this 上下文正确
          const result = await handler.apply(service, args);

          // 6. 事务提交 (Atomic Commit)
          // 只有业务逻辑成功才提交。
          // 如果 tagManager.commit() 失败，这里会抛出异常，sendResponse 会返回错误给前端
          await tagManager.commit();

          // 注意：同步逻辑由业务层（BackgroundServiceImpl）精细控制
          // 业务层会调用 syncService.markTagChange() 或 syncService.markPageChange()
          // 这些方法比全量 syncAll() 更精准，能准确标记需要同步的变更
          // 因此 Server 层不在此处自动触发同步，避免双重触发和资源浪费

          // === 事务结束 ===

          // 8. 性能监控：慢查询检测
          const duration = performance.now() - startTime;
          if (duration > SLOW_QUERY_THRESHOLD) {
            console.warn(
              `[RPC-Server] ⚠️ Slow Query Warning: ${method} took ${duration.toFixed(2)}ms`, 
              { traceId, args: args.length }
            );
          }

          // [DEBUG] 性能日志
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[RPC-Server] ✅ ${method} completed in ${duration.toFixed(2)}ms (TraceID: ${traceId})`
            );
          }

          // 9. 发送成功响应
          sendResponse({
            jsonrpc: '2.0',
            id,
            result
          } as JsonRpcResponse);

        } catch (err: any) {
          const duration = performance.now() - startTime;
          console.error(`[RPC-Server] ❌ Error in ${method} (${duration.toFixed(2)}ms):`, err);

          // 10. 发送错误响应 (异常屏障)
          const errorResponse: RpcErrorShape = {
            code: err.code || RpcErrorCode.INTERNAL_ERROR,
            message: err.message || 'Internal Server Error',
            data: err.data,
            // 仅在开发模式暴露堆栈
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
          };

          sendResponse({
            jsonrpc: '2.0',
            id,
            error: errorResponse
          } as JsonRpcResponse);
        }
      })();

      return true; // 保持通道开放以进行异步响应
    }
  );
}

// 导出辅助函数供服务实现使用
export { triggerBackgroundSync };
