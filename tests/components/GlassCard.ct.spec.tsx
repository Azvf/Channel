import { test, expect } from '@playwright/experimental-ct-react';
import { GlassCard } from '@/popup/components/GlassCard';
import { GlassTestBed } from './fixtures/GlassTestBed';

/**
 * GlassCard 组件视觉回归测试
 * 
 * 测试目标：
 * 1. 验证玻璃态模糊效果是否正确应用（backdrop-filter: blur()）
 * 2. 检测深度层级（depthLevel）的视觉效果
 * 3. 验证性能模式（performance-mode）下的渲染
 * 4. 检测 Stacking Context 问题（z-index）
 * 
 * 关键原理：
 * - 玻璃态效果只有在复杂背景上才能被观察到
 * - 使用 GlassTestBed 提供棋盘格背景，确保模糊效果可被像素级检测
 * - 如果 blur 失效，背景会变得清晰，导致截图 diff 失败
 */
test.describe('GlassCard Visual Regression', () => {
  test('默认状态应该应用有效的模糊效果', async ({ mount }) => {
    const component = await mount(
      <GlassTestBed>
        <GlassCard depthLevel={1}>
          <div style={{ padding: '20px', color: 'white' }}>
            Glass Card Content
          </div>
        </GlassCard>
      </GlassTestBed>
    );

    // 1. 视觉快照：如果有模糊，截图会与之前的基准图匹配
    // 如果 blur 失效，背景的棋盘格会变得清晰，导致 diff 失败
    await expect(component).toHaveScreenshot('glass-card-default.png', {
      threshold: 0.1, // 允许 10% 的像素差异（用于抗锯齿等）
    });

    // 2. 计算样式检查（防御性编程）
    // 验证 CSS 属性是否正确应用
    const card = component.locator('.liquidGlass-wrapper').first();
    const backdropFilter = await card.evaluate((el) => {
      return window.getComputedStyle(el).backdropFilter;
    });
    
    // 验证 backdrop-filter 包含 blur
    expect(backdropFilter).toMatch(/blur/);
  });

  test('不同深度层级应该有视觉差异', async ({ mount }) => {
    const component = await mount(
      <GlassTestBed width={600} height={300}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <GlassCard depthLevel={1}>
            <div style={{ padding: '20px', color: 'white' }}>Depth 1</div>
          </GlassCard>
          <GlassCard depthLevel={3}>
            <div style={{ padding: '20px', color: 'white' }}>Depth 3</div>
          </GlassCard>
          <GlassCard depthLevel={5}>
            <div style={{ padding: '20px', color: 'white' }}>Depth 5</div>
          </GlassCard>
        </div>
      </GlassTestBed>
    );

    await expect(component).toHaveScreenshot('glass-card-depth-levels.png', {
      threshold: 0.15,
    });
  });

  test('性能模式应该正确渲染', async ({ mount }) => {
    const component = await mount(
      <GlassTestBed>
        <GlassCard depthLevel={1} isAnimated={true}>
          <div style={{ padding: '20px', color: 'white' }}>
            Performance Mode
          </div>
        </GlassCard>
      </GlassTestBed>
    );

    await expect(component).toHaveScreenshot('glass-card-performance-mode.png', {
      threshold: 0.1,
    });

    // 验证性能模式类名已应用
    const card = component.locator('.liquidGlass-wrapper.performance-mode');
    await expect(card).toHaveCount(1);
  });

  test('禁用状态应该正确渲染', async ({ mount }) => {
    const component = await mount(
      <GlassTestBed>
        <GlassCard depthLevel={1} disabled={true}>
          <div style={{ padding: '20px', color: 'white' }}>
            Disabled Card
          </div>
        </GlassCard>
      </GlassTestBed>
    );

    await expect(component).toHaveScreenshot('glass-card-disabled.png', {
      threshold: 0.1,
    });

    // 验证禁用类名已应用
    const card = component.locator('.liquidGlass-wrapper.glasscard-disabled');
    await expect(card).toHaveCount(1);
  });

  test('应该创建新的 Stacking Context', async ({ mount }) => {
    // 测试：确保 Tooltip 或 Dropdown 能浮在玻璃卡片之上
    // 这需要验证 z-index token 的正确性
    
    const component = await mount(
      <GlassTestBed width={500} height={500}>
        <GlassCard depthLevel={1}>
          <div style={{ padding: '20px', color: 'white', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                padding: '10px',
                background: 'rgba(255, 0, 0, 0.8)',
                zIndex: 1000, // 模拟 Tooltip
              }}
            >
              Overlay Content
            </div>
            Card Content
          </div>
        </GlassCard>
      </GlassTestBed>
    );

    // 验证 Stacking Context 是否正确创建
    // 如果 z-index 有问题，overlay 可能被遮挡
    await expect(component).toHaveScreenshot('glass-card-stacking-context.png', {
      threshold: 0.1,
    });
  });

  test('不同背景模式下的模糊效果', async ({ mount }) => {
    // 测试在不同背景下的模糊效果一致性
    const backgrounds: Array<'checkerboard' | 'noise' | 'gradient'> = [
      'checkerboard',
      'noise',
      'gradient',
    ];

    for (const bgMode of backgrounds) {
      const component = await mount(
        <GlassTestBed backgroundMode={bgMode}>
          <GlassCard depthLevel={2}>
            <div style={{ padding: '20px', color: 'white' }}>
              Background: {bgMode}
            </div>
          </GlassCard>
        </GlassTestBed>
      );

      await expect(component).toHaveScreenshot(
        `glass-card-background-${bgMode}.png`,
        {
          threshold: 0.15,
        }
      );
    }
  });
});

