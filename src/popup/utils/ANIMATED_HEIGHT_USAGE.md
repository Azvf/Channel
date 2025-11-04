# 动画高度效果使用指南

这个可复用的动画高度效果通过分离动画容器和布局容器，实现了平滑的高度过渡，同时避免了布局抖动问题。**现已升级为使用 React Spring 实现**。

## 特性

- ✨ 基于 React Spring 的物理动画，更自然流畅
- 🎯 自动插值，性能更优
- 🔄 自动检测内容变化并触发动画
- 🎨 支持自定义动画配置和缓动函数
- 📦 开箱即用的组件包装器
- ⚡️ 防抖优化，避免过度渲染

## 两种使用方式

### 方式 1: 使用 Hook（灵活控制）

适用于需要自定义容器结构的情况。

```tsx
import { useAnimatedHeight } from '../utils/useAnimatedHeight';
import { animated } from '@react-spring/web';

function MyComponent() {
  const { ref, style } = useAnimatedHeight({
    config: { duration: 200 }
  });

  return (
    <animated.div 
      ref={ref}
      className="min-h-[3.2rem]"
      style={{
        ...style,
        // 可以添加其他样式
      }}
    >
      {/* 内部容器：包含实际的布局样式 */}
      <div 
        className="flex flex-wrap gap-2 items-center px-5 py-3"
        style={{ height: 'auto' }}
      >
        {/* 你的内容 */}
        <Tag label="Tag 1" />
        <Tag label="Tag 2" />
      </div>
    </animated.div>
  );
}
```

**重要提示：**
- 外层容器（绑定 `ref`）：负责高度动画和裁切，不要设置 flex 等布局样式
- 内层容器：负责实际布局，设置 `height: 'auto'`
- 使用 `animated.div` 而不是普通的 `div`，以获得 React Spring 的动画能力

### 方式 2: 使用组件（快速应用）

适用于快速应用标准动画效果的情况。

```tsx
import { AnimatedHeightWrapper } from '../components/AnimatedHeightWrapper';

function MyComponent() {
  return (
    <AnimatedHeightWrapper 
      className="min-h-[3.2rem]"
      innerClassName="flex flex-wrap gap-2 items-center px-5 py-3"
      config={{ duration: 300 }}
    >
      {/* 你的内容 */}
      <Tag label="Tag 1" />
      <Tag label="Tag 2" />
    </AnimatedHeightWrapper>
  );
}
```

## 配置选项

### Hook 配置

```tsx
interface UseAnimatedHeightOptions {
  config?: Partial<SpringConfig>;     // React Spring 配置，默认 { duration: 200 }
  threshold?: number;                  // 高度变化阈值（像素），默认 1
  debounceMs?: number;                 // 防抖延迟（毫秒），默认 16
  observeMutations?: boolean;          // 是否监听 DOM 变化，默认 true
  observeResize?: boolean;             // 是否监听尺寸变化，默认 true
  immediate?: boolean;                 // 是否初始禁用动画，默认 false
}
```

### React Spring 配置示例

```tsx
// 基本配置
useAnimatedHeight({
  config: { duration: 200 }
});

// 弹性动画
useAnimatedHeight({
  config: { 
    duration: 400,
    tension: 200,
    friction: 20
  }
});

// 快速动画
useAnimatedHeight({
  config: { 
    duration: 150,
    easing: 'easeOutCubic'
  }
});

// 更详细的配置
useAnimatedHeight({
  config: {
    duration: 300,
    easing: 'easeInOutBack',
    tension: 150,
    friction: 15
  },
  threshold: 5,        // 高度变化小于 5px 不触发动画
  debounceMs: 50       // 防抖延迟 50ms
});
```

## 工作原理

1. **布局分离**：将布局容器（内层）和动画容器（外层）分离
2. **单次布局**：内容变化时，内层容器立即完成一次布局重排
3. **React Spring 动画**：外层容器使用 React Spring 测量新高度后，通过物理模拟平滑过渡
4. **避免抖动**：由于布局只发生一次，避免了每帧都重排导致的抖动
5. **自动插值**：React Spring 自动处理中间值的插值计算，性能更好

## 为什么选择 React Spring？

相比传统 CSS transition，React Spring 的优势：

- **物理准确性**：使用弹簧物理学，动画更自然
- **自动插值**：优化性能，减少 layout thrashing
- **丰富配置**：支持弹簧、缓动等多种动画类型
- **更好的性能**：基于 requestAnimationFrame 的优化
- **类型安全**：完整的 TypeScript 支持
- **生命周期**：支持 onStart, onRest 等回调

## 高级用法

### 获取动画 API

如果需要手动控制动画：

```tsx
const { ref, style, api } = useAnimatedHeight();

// 手动触发动画
const handleClick = () => {
  api.start({ height: '400px' });
};

// 暂停动画
api.pause();

// 恢复动画
api.resume();

// 停止动画
api.stop();
```

### 自定义动画配置

```tsx
<AnimatedHeightWrapper
  config={{
    duration: 500,
    tension: 200,      // 弹簧张力
    friction: 25,      // 摩擦力
    mass: 1,           // 质量
    clamp: false       // 是否限制值
  }}
>
  {/* 内容 */}
</AnimatedHeightWrapper>
```

### 监听动画生命周期

使用 `api.start()` 的第二个参数：

```tsx
api.start(
  { height: '400px' },
  {
    onStart: () => console.log('动画开始'),
    onRest: () => console.log('动画结束'),
    onChange: (values) => console.log('值变化:', values)
  }
);
```

## 参考实现

查看 `TaggingPage.tsx` 组件可以看到实际使用示例。

## 迁移指南

如果你的代码中使用了旧版本的 hook（CSS transition），迁移到 React Spring 版本只需要：

1. 将 `div` 改为 `animated.div`（使用 Hook 时）
2. 将 `duration` 和 `easing` 配置改为 `config` 对象
3. 不需要其他改变，API 保持兼容

```tsx
// 旧版本
const wrapperRef = useAnimatedHeight({ duration: 200 });

// 新版本
const { ref, style } = useAnimatedHeight({ config: { duration: 200 } });
```
