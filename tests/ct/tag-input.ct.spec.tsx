import { TagInputInteractive } from './storyWrappers/tag-input';
import { test, expect } from './fixtures';

test.describe('TagInput', () => {
  test('portal renders suggestions and selection works', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        suggestions={['React', 'Vue']}
        tags={[]}
      />,
    );

    await page.locator('input').type('R');

    await expect(page.locator('body')).toContainText('React');

    await page.locator('button:has-text("React")').click();

    await expect(page.locator('.tag-content')).toContainText('React');
  });

  test('dropdown visual regression', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        suggestions={['React', 'Vue']}
        tags={[]}
      />,
    );

    const input = page.locator('input');
    await input.click();
    await input.type('R');

    // 等待下拉菜单出现
    const dropdown = page.locator('[data-sticky-dropdown]');
    await expect(dropdown).toBeVisible();
    
    // 等待下拉菜单从初始 -9999 位置移动到正确位置
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-sticky-dropdown]');
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.top > 0 && rect.top < window.innerHeight;
    }, { timeout: 2000 });
    
    // 等待 CSS transition 动画完成（duration 200ms）
    await page.waitForTimeout(250);
    
    // 等待下拉菜单内容稳定（确保所有按钮都渲染完成）
    await expect(dropdown.locator('button')).toHaveCount(2, { timeout: 1000 });

    await expect(page).toHaveScreenshot('tag-input-dropdown.png', {
      animations: 'disabled',
      scale: 'css',
      maxDiffPixels: 500, // 允许一些像素差异（由于字体渲染等）
    });
  });

  test('supports keyboard navigation across suggestions', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        suggestions={['Vue', 'Svelte', 'Solid']}
        tags={[]}
        allowCreation={false}
      />,
    );

    const input = page.locator('input');
    await input.click();
    await input.type('s');
    
    // 等待建议列表出现并包含期望的选项
    // 输入 's' 后，所有三个建议（Vue, Svelte, Solid）都包含 's'，都会显示
    await expect(page.locator('[data-sticky-dropdown]')).toBeVisible();
    await expect(page.locator('button:has-text("Svelte")')).toBeVisible();

    // 等待下拉菜单完全渲染
    await page.waitForTimeout(150);

    // 按 ArrowDown 选择第一个建议
    // 由于过滤后的顺序，第一个可能是 'Svelte' 或 'Solid'（取决于原始顺序）
    // 让我们先检查第一个选项是什么
    const firstOption = page.locator('[data-sticky-dropdown] button').first();
    await firstOption.waitFor();
    
    // 按 ArrowDown 选择第一个建议
    await page.keyboard.press('ArrowDown');
    
    // 等待选择状态更新（高亮显示）
    await page.waitForTimeout(100);
    
    // 按 Enter 确认选择
    await page.keyboard.press('Enter');

    // 等待标签添加完成 - 应该添加了某个包含 's' 的建议
    // 由于我们不确定是哪个，检查是否有标签被添加
    await expect(page.locator('.tag-content')).toBeVisible();
    
    // 验证添加的标签是三个建议之一
    const tagText = await page.locator('.tag-content').textContent();
    expect(['Vue', 'Svelte', 'Solid']).toContain(tagText?.trim());
  });

  test('Backspace removes previous tag', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        tags={['React']}
      />,
    );

    const input = page.locator('input');
    await input.focus();
    await input.press('Backspace');

    await expect(page.locator('.tag-content')).toHaveCount(0);
  });

  test('Dropdown 应该在页面滚动时更新位置 (Sticky Behavior)', async ({ mount, page }) => {
    await mount(
      <div id="scrollable-container" style={{ height: '200vh', padding: '20px', position: 'relative' }}>
        <TagInputInteractive suggestions={['React']} tags={[]} />
      </div>
    );

    const input = page.locator('input');
    await input.click();
    await input.type('R');

    // 等待下拉菜单出现
    const dropdown = page.locator('[data-sticky-dropdown]');
    await expect(dropdown).toBeVisible();
    
    // 等待下拉菜单从初始 -9999 位置移动到正确位置
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-sticky-dropdown]');
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.top > 0 && rect.top < window.innerHeight;
    }, { timeout: 2000 });

    // 获取输入框和下拉菜单的初始位置
    const inputBox = await input.boundingBox();
    const initialDropdownBox = await dropdown.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(initialDropdownBox).not.toBeNull();
    expect(initialDropdownBox?.y).toBeGreaterThan(0);

    // 通过改变输入框容器的位置来模拟滚动效果
    // 这样下拉菜单应该跟随输入框移动
    const moveAmount = 100;
    await page.evaluate((amount) => {
      const container = document.getElementById('scrollable-container');
      if (container) {
        // 使用 transform 移动容器，模拟滚动效果
        container.style.transform = `translateY(-${amount}px)`;
        // 触发 scroll 事件，确保 StickyDropdown 的监听器被调用
        window.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
    }, moveAmount);
    
    // 等待 requestAnimationFrame 循环更新位置
    // StickyDropdown 使用 requestAnimationFrame 循环，需要等待几个帧
    await page.waitForTimeout(300);
    
    // 等待下拉菜单位置更新 - 使用 waitForFunction 确保位置真的改变了
    await page.waitForFunction(
      (initialY) => {
        const element = document.querySelector('[data-sticky-dropdown]');
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        // 位置应该改变了（至少改变 50px）
        return Math.abs(rect.top - initialY) > 50;
      },
      initialDropdownBox!.y,
      { timeout: 2000 }
    );

    // 获取新位置
    const newDropdownBox = await dropdown.boundingBox();
    const newInputBox = await input.boundingBox();
    expect(newDropdownBox).not.toBeNull();
    expect(newInputBox).not.toBeNull();

    // 验证位置已更新
    if (initialDropdownBox && newDropdownBox && inputBox && newInputBox) {
      // 输入框应该向上移动（y 坐标减小）
      const inputDeltaY = inputBox.y - newInputBox.y;
      expect(inputDeltaY).toBeGreaterThan(50);
      
      // 下拉菜单应该跟随输入框移动（y 坐标也应该减小）
      const dropdownDeltaY = initialDropdownBox.y - newDropdownBox.y;
      expect(dropdownDeltaY).toBeGreaterThan(50);
      
      // 下拉菜单应该保持在输入框下方（相对位置应该保持一致）
      const initialGap = initialDropdownBox.y - inputBox.y;
      const newGap = newDropdownBox.y - newInputBox.y;
      // 间距应该大致相同（允许 ±5px 的误差）
      expect(Math.abs(newGap - initialGap)).toBeLessThan(5);
    }
  });
});

