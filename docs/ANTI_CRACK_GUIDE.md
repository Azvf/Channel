# 浏览器插件防破解指南

本文档详细说明如何保护您的浏览器插件不被破解。

## ⚠️ 重要提示

**完全防止破解是不可能的**。客户端代码始终可以被逆向工程，本文档提供的是**增加破解难度**的防护措施，而不是绝对安全方案。

## 一、代码混淆和保护

### 1.1 使用 JavaScript 代码混淆器

推荐工具：
- **javascript-obfuscator** - 功能强大，配置灵活
- **terser** - 压缩和简单混淆
- **webpack-obfuscator-plugin** - 与构建工具集成

#### 安装 javascript-obfuscator

```bash
npm install --save-dev javascript-obfuscator
```

#### 创建混淆配置文件 `obfuscator.config.js`

```javascript
module.exports = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};
```

### 1.2 集成到构建流程

修改 `package.json`：

```json
{
  "scripts": {
    "build": "vite build && npm run obfuscate",
    "obfuscate": "node obfuscate.js"
  }
}
```

创建 `obfuscate.js`：

```javascript
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');
const config = require('./obfuscator.config.js');

const filesToObfuscate = [
  'dist/background.js',
  'dist/popup.js',
  'dist/content.js',
  'dist/injected.js'
];

filesToObfuscate.forEach(file => {
  const filePath = path.resolve(file);
  if (fs.existsSync(filePath)) {
    console.log(`混淆文件: ${file}`);
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscated = JavaScriptObfuscator.obfuscate(code, config);
    fs.writeFileSync(filePath, obfuscated.getObfuscatedCode());
  }
});

console.log('✓ 所有文件已混淆');
```

## 二、Source Map 保护

### 2.1 生产环境禁用 Source Maps

修改 `vite.config.ts`：

```typescript
export default defineConfig({
  build: {
    sourcemap: false, // 生产环境禁用
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console 日志
        drop_debugger: true
      }
    }
  }
});
```

### 2.2 如果必须使用 Source Maps

分离敏感信息，将 source maps 存储在安全的服务器上，使用 token 认证访问。

## 三、代码分割和动态加载

### 3.1 关键逻辑放在后台

背景脚本（background/service worker）比 content script 和 popup 更难被篡改：

```typescript
// background.ts - 将关键验证逻辑放在这里
export function validateLicense(licenseKey: string): boolean {
  // 复杂的验证逻辑
  return performComplexValidation(licenseKey);
}

// popup.ts - 只负责 UI，调用后台 API
const result = await chrome.runtime.sendMessage({
  action: 'validateLicense',
  data: licenseKey
});
```

### 3.2 使用动态导入

延迟加载关键模块，增加逆向难度：

```typescript
// 动态加载关键业务逻辑
const criticalModule = await import('./critical.bundle.js');
criticalModule.performValidation();
```

## 四、运行时检查

### 4.1 检测开发者工具

```typescript
// 检测调试工具是否打开
function detectDevTools(): boolean {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    // 开发者工具已打开
    return true;
  }
  return false;
}

// 防止控制台检查
console.log = function() {};
Object.freeze(console);
```

### 4.2 定时检测完整性

```typescript
// 定期检查关键函数是否被修改
setInterval(() => {
  const hash = calculateHash(criticalFunctions);
  if (hash !== expectedHash) {
    // 代码被篡改，采取行动
    alert('检测到篡改行为');
    disableExtension();
  }
}, 5000);
```

### 4.3 环境检测

```typescript
function isProduction(): boolean {
  // 检查多个环境指标
  const isDev = process.env.NODE_ENV === 'development';
  const hasSourceMap = document.querySelector('script[src*="sourcemap"]');
  const hasUncompressedCode = /\.(js|css)$/.test(document.location.href);
  
  return !isDev && !hasSourceMap && !hasUncompressedCode;
}
```

## 五、License 验证

### 5.1 客户端验证 + 服务器验证

```typescript
// 双重验证：客户端 + 服务器
async function validateLicense(licenseKey: string): Promise<boolean> {
  // 1. 客户端快速验证（避免空密钥等）
  if (!licenseKey || licenseKey.length < 10) {
    return false;
  }
  
  // 2. 服务器验证（关键）
  try {
    const response = await fetch('https://your-server.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        license: licenseKey,
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version
      })
    });
    
    const data = await response.json();
    return data.valid;
  } catch (error) {
    console.error('License 验证失败:', error);
    return false;
  }
}
```

### 5.2 加密存储

```typescript
import CryptoJS from 'crypto-js';

// 存储加密的 license
function saveLicense(license: string): void {
  const encrypted = CryptoJS.AES.encrypt(license, secretKey).toString();
  chrome.storage.local.set({ encryptedLicense: encrypted });
}

// 读取并解密
async function loadLicense(): Promise<string | null> {
  const { encryptedLicense } = await chrome.storage.local.get('encryptedLicense');
  if (!encryptedLicense) return null;
  
  const decrypted = CryptoJS.AES.decrypt(encryptedLicense, secretKey);
  return decrypted.toString(CryptoJS.enc.Utf8);
}
```

### 5.3 时间限制

```typescript
// 检查试用期
function checkTrialPeriod(): boolean {
  const installTime = await chrome.storage.local.get('installTime') || Date.now();
  const trialDays = 30;
  const expired = Date.now() - installTime > trialDays * 24 * 60 * 60 * 1000;
  
  return !expired;
}
```

## 六、Chrome Extension 特有保护

### 6.1 使用 CSP (Content Security Policy)

在 `manifest.json` 中：

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; script-src-elem 'self'"
  }
}
```

### 6.2 最小权限原则

只请求必要的权限：

```json
{
  "permissions": [
    "storage", // 必要
    "activeTab" // 必要时才请求其他权限
  ],
  "host_permissions": [
    // 限制到必要的域名
    "https://api.yourdomain.com/*"
  ]
}
```

### 6.3 限制 web_accessible_resources

```json
{
  "web_accessible_resources": [
    {
      "resources": ["injected.js"], // 只暴露必要的资源
      "matches": ["<all_urls>"]
    }
  ]
}
```

## 七、架构设计

### 7.1 将核心逻辑移到服务器

```typescript
// ❌ 不好：客户端完整逻辑
function processData(input: string): string {
  // 500行核心业务逻辑
  return processed;
}

// ✅ 好：调用服务器 API
async function processData(input: string): Promise<string> {
  const response = await fetch('https://api.server.com/process', {
    method: 'POST',
    body: JSON.stringify({ data: input }),
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.text();
}
```

### 7.2 混淆 API 调用

```typescript
// 不使用明显的 API 端点
// ❌ const response = await fetch('https://api.server.com/auth');

// ✅ 动态构建端点
const endpoints = {
  'auth': 'a$i?v=s',
  'validate': 'v?l!d=t'
};

function obfuscateEndpoint(key: string): string {
  const base = 'https://api.server.com';
  return base + endpoints[key].replace(/[^a-z0-9]/gi, '');
}
```

## 八、持续监控

### 8.1 错误报告

```typescript
// 收集异常和可疑行为
async function reportSuspiciousActivity(event: string): Promise<void> {
  try {
    await fetch('https://analytics.server.com/suspicious', {
      method: 'POST',
      body: JSON.stringify({
        extensionId: chrome.runtime.id,
        event,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      })
    });
  } catch (error) {
    // 静默失败
  }
}

// 监听关键函数调用
const originalConsoleLog = console.log;
console.log = function(...args) {
  if (args.some(arg => /obfuscated|debug|decompile/.test(String(arg)))) {
    reportSuspiciousActivity('console-tampering');
  }
  originalConsoleLog.apply(console, args);
};
```

### 8.2 水印追踪

```typescript
// 在代码中嵌入可追踪的水印
function embedWatermark(userId: string): void {
  // 将用户 ID 编码到不显眼的位置
  const watermark = btoa(userId).replace(/=/g, '');
  window.__wb = watermark; // 伪装成常见的调试变量
}
```

## 九、版本更新和撤销

### 9.1 强制更新机制

```typescript
// 检查是否有新版本
async function checkUpdates(): Promise<void> {
  const response = await fetch('https://api.server.com/version');
  const { version, forceUpdate } = await response.json();
  const currentVersion = chrome.runtime.getManifest().version;
  
  if (forceUpdate || version !== currentVersion) {
    // 显示更新提示或强制更新
    showUpdateNotification();
  }
}
```

### 9.2 撤销受损版本

```typescript
// 如果检测到破解，禁用功能
async function validateBuildIntegrity(): Promise<void> {
  const buildHash = await calculateBuildHash();
  const serverResponse = await fetch('https://api.server.com/verify-build', {
    body: JSON.stringify({ hash: buildHash })
  });
  
  const { valid } = await serverResponse.json();
  if (!valid) {
    // 版本已被篡改，禁用功能
    await disableExtension();
  }
}
```

## 十、最佳实践总结

### ✅ 应该做的

1. **多层防护**：混淆 + License 验证 + 服务器端逻辑
2. **最小权限**：只请求必要的权限
3. **禁用调试工具**：生产环境移除 console 和 source maps
4. **服务器验证**：关键功能必须通过服务器验证
5. **持续监控**：检测异常行为并报告
6. **定期更新**：及时修复漏洞和发布新版本
7. **加密存储**：敏感数据加密存储
8. **代码分割**：关键逻辑分散在不同模块

### ❌ 不应该做的

1. **绝对安全假设**：认为可以完全防止破解
2. **客户端完全控制**：将核心业务逻辑全部放在客户端
3. **硬编码密钥**：在代码中直接写入 API 密钥
4. **过度混淆**：影响性能和可维护性
5. **忽视用户体验**：过度的安全措施影响正常用户

## 十一、应对已知破解

### 11.1 检测常见破解工具

```typescript
function detectCrackTools(): boolean {
  // 检测常见的逆向工具
  const suspiciousProcesses = [
    'Cheat Engine',
    'ollydbg',
    'x64dbg',
    'IDA Pro'
  ];
  
  // 这些检测在浏览器中效果有限，但可以起到警示作用
  
  // 更好的方法是检测行为异常
  const originalSetInterval = setInterval;
  let callCount = 0;
  setInterval = function(...args) {
    callCount++;
    if (callCount > 1000) {
      reportSuspiciousActivity('timer-manipulation');
    }
    return originalSetInterval.apply(this, args);
  };
  
  return false;
}
```

### 11.2 黑名单机制

```typescript
// 维护已知破解版本的哈希值列表
const BLACKLISTED_HASHES = [
  'abc123...', // 已知破解版本1
  'def456...'  // 已知破解版本2
];

async function checkBlacklist(): Promise<void> {
  const currentHash = await calculateBuildHash();
  if (BLACKLISTED_HASHES.includes(currentHash)) {
    await disableExtension();
  }
}
```

## 十二、法律保护

1. **版权声明**：在代码和界面中明确声明版权
2. **EULA**：制定明确的使用许可协议
3. **DMCA**：发现盗版版本，可以提起 DMCA 下架请求
4. **法律行动**：对大规模破解行为采取法律手段

## 结语

记住：**没有绝对安全，只有相对安全**。目标是增加破解成本，让破解得不偿失。

重点应该放在：
1. 提供稳定的商业价值
2. 合理的定价策略
3. 良好的用户体验
4. 及时的技术支持

这样即使有人破解，大多数人仍然愿意购买正版。

