// src/rpc/client.ts
// 客户端设计：超时控制与错误还原

import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  RpcError, 
  RpcErrorCode,
  RpcClientOptions,
  IBackgroundApi
} from './protocol';

const DEFAULT_TIMEOUT = 5000; // 5秒 - 快速失败策略，配合优化后的初始化（预期2-3秒）

/**
 * 生成唯一请求ID
 */
function generateRequestId(): string {
  // 优先使用 crypto.randomUUID()，如果不支持则使用时间戳 + 随机数
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建 RPC 客户端
 * 利用 ES6 Proxy 拦截方法调用，自动将其转换为 Chrome 消息
 */
export function createRpcClient<T extends IBackgroundApi>(
  options: RpcClientOptions = {}
): T {
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;

  return new Proxy({} as any, {
    get: (_target, method: string | symbol) => {
      // 防止拦截 Promise 的 then/catch/finally 等属性
      if (typeof method !== 'string' || method === 'then' || method === 'catch' || method === 'finally') {
        return undefined;
      }

      return async (...args: any[]) => {
        const requestId = generateRequestId();
        const traceId = requestId; // 使用 requestId 作为 traceId

        // 构造请求体
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: requestId,
          method,
          args,
          meta: { 
            timeout: timeoutMs, 
            traceId 
          }
        };

        // 创建超时 Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new RpcError(
              RpcErrorCode.TIMEOUT, 
              `RPC Call '${method}' timed out after ${timeoutMs}ms`
            ));
          }, timeoutMs);
        });

        // 执行 Chrome 消息发送
        const sendPromise = new Promise<any>((resolve, reject) => {
          // [DEBUG] 客户端发送日志
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[RPC-Client] ⬆️ Sending ${method}`, { 
              id: requestId, 
              traceId,
              args: args.length 
            });
          }

          chrome.runtime.sendMessage(request, (response: JsonRpcResponse) => {
            const lastError = chrome.runtime.lastError;
            
            // 1. 处理 Chrome 运行时错误 (如 Service Worker 未启动)
            if (lastError) {
              console.error(`[RPC-Client] Chrome Runtime Error:`, lastError);
              return reject(new RpcError(
                RpcErrorCode.INTERNAL_ERROR, 
                lastError.message || 'Chrome Runtime Error'
              ));
            }

            // [DEBUG] 响应日志
            if (process.env.NODE_ENV === 'development') {
              console.debug(`[RPC-Client] ⬇️ Received ${method}`, { 
                id: response?.id,
                hasResult: !!response?.result,
                hasError: !!response?.error 
              });
            }

            // 2. 处理业务逻辑错误 (服务端抛出的异常)
            if (response?.error) {
              const err = new RpcError(
                response.error.code, 
                response.error.message, 
                response.error.data
              );
              
              // 在开发环境下，恢复服务端堆栈，便于调试
              if (process.env.NODE_ENV === 'development' && response.error.stack) {
                err.stack = `[Remote Stack]\n${response.error.stack}\n--- [Local Stack] ---\n${err.stack || new Error().stack}`;
              }
              
              return reject(err);
            }

            // 3. 成功
            resolve(response?.result);
          });
        });

        // 使用 Promise.race 实现超时竞态
        return Promise.race([sendPromise, timeoutPromise]);
      };
    }
  });
}
