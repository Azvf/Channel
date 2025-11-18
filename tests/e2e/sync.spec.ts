import { test, expect, BrowserContext } from '@playwright/test';

/**
 * E2E 测试 - 多设备同步
 * 
 * 注意：这些测试需要真实的扩展环境
 * 在实际运行前，请确保：
 * 1. 扩展已构建（npm run build）
 * 2. 有可用的测试数据库连接（配置 .env.development）
 */

/**
 * 获取扩展的 popup URL
 * @param context Browser context
 * @returns Extension popup URL
 */
async function getExtensionUrl(context: BrowserContext): Promise<string> {
  // 触发扩展加载：创建一个页面（这会触发 Service Worker 注册）
  const triggerPage = await context.newPage();
  try {
    await triggerPage.goto('about:blank');
  } catch {
    // 忽略导航错误
  }

  // 轮询获取扩展 ID（最多重试 20 次，每次间隔 300ms，总共最多 6 秒）
  const tryGetExtensionId = (): string | null => {
    // 方法 1: 从 Service Workers 获取（Manifest V3 使用 service worker）
    const serviceWorkers = context.serviceWorkers();
    for (const sw of serviceWorkers) {
      const swUrl = sw.url();
      // 扩展 ID 格式：chrome-extension://[32字符ID]/background.js
      const match = swUrl.match(/chrome-extension:\/\/([a-z]{32})\//);
      if (match && match[1]) {
        return match[1];
      }
    }

    // 方法 2: 从背景页面获取（Manifest V2 或备用）
    const backgroundPages = context.backgroundPages();
    for (const bg of backgroundPages) {
      const bgUrl = bg.url();
      const match = bgUrl.match(/chrome-extension:\/\/([a-z]{32})\//);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  for (let i = 0; i < 20; i++) {
    const extensionId = tryGetExtensionId();
    if (extensionId) {
      await triggerPage.close();
      return `chrome-extension://${extensionId}/popup.html`;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  await triggerPage.close();
  
  // 提供详细的错误信息用于调试
  const serviceWorkers = context.serviceWorkers();
  const backgroundPages = context.backgroundPages();
  const serviceWorkerUrls = serviceWorkers.map(sw => sw.url()).join(', ') || '(无)';
  
  throw new Error(
    `无法获取扩展 ID。调试信息：\n` +
    `- Service Workers 数量: ${serviceWorkers.length}\n` +
    `- Service Worker URLs: ${serviceWorkerUrls}\n` +
    `- 背景页面数量: ${backgroundPages.length}\n` +
    `请确保：1) 扩展已构建 (npm run build) 2) playwright.config.ts 已配置扩展加载`
  );
}

test.describe('E2E 多设备同步测试', () => {
  test.beforeEach(async ({ context }) => {
    // 等待扩展加载完成
    // 扩展会在 context 创建时自动加载（通过 playwright.config.ts 配置）
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('多端同步：一端创建，另一端应同步', async ({ browser }) => {
    // 模拟两台设备 - 每个 context 都会自动加载扩展
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    // 等待扩展加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 获取扩展 popup URL
      const extensionUrlA = await getExtensionUrl(contextA);
      const extensionUrlB = await getExtensionUrl(contextB);

      // 1. 设备 A 创建数据
      await pageA.goto(extensionUrlA);
      // 等待 popup 加载完成
      await pageA.waitForLoadState('domcontentloaded');
      
      // TODO: 实现实际的测试逻辑
      // 需要根据实际的 UI 元素选择器来操作
      // 例如：
      // const tagInput = pageA.locator('input[placeholder*="Tag"]');
      // await tagInput.fill('Playwright-Sync');
      // await pageA.getByRole('button', { name: /Add|创建/i }).click();

      // 2. 设备 B 同步并验证
      await pageB.goto(extensionUrlB);
      await pageB.waitForLoadState('domcontentloaded');
      
      // TODO: 实现实际的验证逻辑
      // await pageB.getByRole('button', { name: /Sync|同步/i }).click();
      // await expect(pageB.getByText('Playwright-Sync')).toBeVisible({ timeout: 10000 });
    } finally {
      // 清理
      await contextA.close();
      await contextB.close();
    }
  });

  test('多端同步：一端删除，另一端应同步删除（防僵尸数据核心测试）', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    // 等待扩展加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const extensionUrlA = await getExtensionUrl(contextA);
      const extensionUrlB = await getExtensionUrl(contextB);

      // 1. 设备 A 创建数据
      await pageA.goto(extensionUrlA);
      await pageA.waitForLoadState('domcontentloaded');
      
      // TODO: 实现创建标签的逻辑

      // 2. 设备 B 同步并验证
      await pageB.goto(extensionUrlB);
      await pageB.waitForLoadState('domcontentloaded');
      
      // TODO: 实现同步和验证逻辑

      // 3. 设备 A 删除数据
      // TODO: 实现删除逻辑

      // 4. 设备 B 同步并验证删除（防僵尸数据核心测试）
      // TODO: 实现验证删除的逻辑
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('离线/弱网测试：离线创建标签，恢复在线后应自动上传', async ({ context }) => {
    const page = await context.newPage();
    
    try {
      // 1. 设置离线状态
      await context.setOffline(true);

      // 2. 创建标签
      const extensionUrl = await getExtensionUrl(context);
      await page.goto(extensionUrl);
      await page.waitForLoadState('domcontentloaded');
      
      // TODO: 实现创建标签的逻辑

      // 3. 恢复在线
      await context.setOffline(false);

      // 4. 等待自动同步
      // TODO: 等待同步状态更新
      // await page.waitForSelector('[data-testid="sync-status"][data-status="synced"]', { timeout: 10000 });

      // 5. 验证数据已上传
      // TODO: 实现验证逻辑
    } finally {
      await page.close();
    }
  });
});

test.describe('E2E 真实环境视频检测', () => {
  test('真实环境视频检测：验证插件能正确读取 iframe 视频播放时间', async ({ context }) => {
    // 注意：这个测试需要一个包含 iframe 视频的真实测试页面
    // 可以使用 GitHub Pages 托管一个简单的 HTML，内嵌 YouTube

    const page = await context.newPage();
    
    try {
      // 1. 打开包含 iframe 视频的测试页面
      // TODO: 替换为实际的测试页面 URL
      // await page.goto('https://your-test-page.github.io/iframe-video-test.html');

      // 2. 等待视频加载
      // await page.waitForSelector('iframe', { timeout: 5000 });

      // 3. 打开扩展 popup
      const extensionUrl = await getExtensionUrl(context);
      const popupPage = await context.newPage();
      await popupPage.goto(extensionUrl);
      await popupPage.waitForLoadState('domcontentloaded');

      // 4. 验证视频时间戳被正确读取
      // TODO: 实现验证逻辑
      // 可以通过检查 URL 参数或扩展状态来验证
      
      await popupPage.close();
    } finally {
      await page.close();
    }
  });
});

