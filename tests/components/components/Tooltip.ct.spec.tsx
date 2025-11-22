import { Tooltip } from '../../../src/popup/components/Tooltip';
import { test, expect } from '../fixtures';

test('Tooltip 应延迟显示以防止闪烁', async ({ mount, page }) => {
  await mount(
    <div style={{ padding: 50 }}>
      <Tooltip content="Tips" delay={400}>
        <button>Hover Me</button>
      </Tooltip>
    </div>
  );

  const trigger = page.locator('button');
  const tooltipContent = page.locator('.frost-tooltip-content');
  
  // 1. 鼠标悬停
  await trigger.hover();
  
  // 2. 立即检查：Tooltip 不应立即可见 (在 300ms 内)
  // 这是一个"负向断言"，用于验证防抖逻辑
  await expect(tooltipContent).not.toBeVisible();
  
  // 3. 等待延迟时间 (400ms + buffer)
  await page.waitForTimeout(450);
  
  // 4. 检查：现在应该可见
  await expect(tooltipContent).toBeVisible();
});

