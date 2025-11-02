# Iframe 架构方案

## 架构设计

```
┌─────────────────────────────────────┐
│  popup.html (Bridge Layer)           │
│  └─ <iframe src="ui.html"></iframe>  │
│     └─ postMessage 通信               │
└─────────────────────────────────────┘
              │ postMessage
              ▼
┌─────────────────────────────────────┐
│  ui.html (UI Layer in iframe)        │
│  └─ React App                        │
│     └─ iframeBridgeService           │
│        └─ postMessage -> parent      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  popup.html (Message Forwarder)      │
│  └─ chrome.runtime.sendMessage      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Background (Service Worker)         │
│  └─ TagManager                       │
└─────────────────────────────────────┘
```

## 实现步骤

### 1. 创建 Bridge Service (popup.html 中)

```typescript
// src/popup/bridge/bridgeService.ts
class BridgeService {
  private iframe: HTMLIFrameElement | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  init(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent) {
    // 验证来源
    if (event.source !== this.iframe?.contentWindow) return;
    
    const { type, payload, requestId } = event.data;
    
    if (type === 'API_REQUEST') {
      // 转发到 background
      chrome.runtime.sendMessage(payload, (response) => {
        // 发送响应回 iframe
        this.iframe?.contentWindow?.postMessage({
          type: 'API_RESPONSE',
          requestId,
          response
        }, '*');
      });
    }
  }

  sendToIframe(message: any) {
    this.iframe?.contentWindow?.postMessage(message, '*');
  }
}

export const bridgeService = new BridgeService();
```

### 2. 创建 Iframe Bridge Service (iframe 内部)

```typescript
// src/popup/iframeBridge/iframeBridgeService.ts
class IframeBridgeService {
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();

  constructor() {
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent) {
    // 只接收来自 parent 的消息
    if (event.source !== window.parent) return;

    const { type, requestId, response } = event.data;
    
    if (type === 'API_RESPONSE') {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        pending.resolve(response);
        this.pendingRequests.delete(requestId);
      }
    }
  }

  async sendRequest(action: string, data?: any): Promise<any> {
    const requestId = Math.random().toString(36).substring(7);
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      window.parent.postMessage({
        type: 'API_REQUEST',
        requestId,
        payload: { action, data }
      }, '*');
      
      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
}

export const iframeBridgeService = new IframeBridgeService();
```

### 3. 修改 currentPageService 使用 iframe bridge

```typescript
// src/services/popup/currentPageService.ts (iframe 版本)
import { iframeBridgeService } from '../popup/iframeBridge/iframeBridgeService';

class CurrentPageService {
  async getCurrentPage(): Promise<TaggedPage> {
    const response = await iframeBridgeService.sendRequest('getCurrentPage');
    // ... 处理响应
  }
}
```

### 4. 修改 popup.html

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <iframe 
    id="ui-iframe" 
    src="ui.html" 
    style="width: 100%; height: 100vh; border: none;">
  </iframe>
  <script type="module" src="./bridge/bridgeService.ts"></script>
  <script>
    const iframe = document.getElementById('ui-iframe');
    bridgeService.init(iframe);
  </script>
</body>
</html>
```

## 优势和劣势分析

### ✅ 优势

1. **完全隔离 UI 代码**
   - UI 层和 bridge 层完全分离
   - UI 可以独立开发、测试、部署

2. **灵活性**
   - 可以动态切换不同的 UI 版本
   - UI 可以托管在外部服务器（需要配置 CSP）

3. **模块化**
   - UI 层不直接依赖 Chrome API
   - 便于单元测试（可以 mock iframeBridgeService）

4. **复用性**
   - 相同的 UI 可以用于不同的场景（popup、side panel、独立页面）

### ❌ 劣势

1. **复杂度增加**
   - 需要维护 bridge 层
   - 跨框架通信增加了调试难度

2. **性能开销**
   - postMessage 比直接调用稍慢
   - 额外的消息传递层

3. **CSP 限制**
   - 如果加载外部 URL，需要配置 CSP
   - 内联脚本和样式受限

4. **开发体验**
   - 调试更复杂（需要在不同的上下文间切换）
   - 热重载可能受影响

## 建议

### 当前架构已经足够好

基于你的当前实现，**不建议**改为 iframe 架构，因为：

1. **架构已清晰分层**
   - `currentPageService` 已经封装了通信逻辑
   - UI 层只依赖 service 层，不直接调用 Chrome API
   - 符合关注点分离原则

2. **简单高效**
   - 直接使用 `chrome.runtime.sendMessage` 更简单
   - 没有额外的通信层开销

3. **易于维护**
   - 代码结构清晰
   - 调试方便

### 适合使用 iframe 的场景

如果以下情况出现，再考虑 iframe：

1. **需要动态切换 UI**
   - 需要 A/B 测试不同的 UI
   - 需要根据配置加载不同的界面

2. **UI 需要托管在外部**
   - UI 需要实时更新（不更新扩展）
   - 多个扩展共享同一套 UI

3. **需要完全隔离**
   - UI 代码来自第三方
   - 需要防止 UI 代码访问敏感 API

4. **复用性需求**
   - 同一个 UI 需要用于 popup、side panel、独立页面等多个场景

## 结论

**当前的架构设计已经很好了**，没有必要改为 iframe。只有在有特定需求（如上述场景）时才考虑 iframe 方案。

如果未来需要 iframe 方案，可以参考上面的实现代码进行改造。

