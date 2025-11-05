# 动画高度效果使用指南

这个可复用的动画高度效果通过分离动画容器和布局容器，实现了平滑的高度过渡，同时避免了布局抖动问题。

## 两种使用方式

### 方式 1: 使用 Hook（灵活控制）

适用于需要自定义容器结构的情况。

```tsx
import { useAnimatedHeight } from '../utils/useAnimatedHeight';

function MyComponent() {
  const wrapperRef = useAnimatedHeight({
    duration: 200,
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
  });

  return (
    <div 
      ref={wrapperRef}
      className="min-h-[3.2rem]"
      style={{
        overflow: 'hidden',
        willChange: 'height',
        backfaceVisibility: 'hidden'
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
    </div>
  );
}
```

**重要提示：**
- 外层容器（绑定 `ref`）：负责高度动画和裁切，不要设置 flex 等布局样式
- 内层容器：负责实际布局，设置 `height: 'auto'`

### 方式 2: 使用组件（快速应用）

适用于快速应用标准动画效果的情况。

```tsx
import { AnimatedHeightWrapper } from '../components/AnimatedHeightWrapper';

function MyComponent() {
  return (
    <AnimatedHeightWrapper 
      className="min-h-[3.2rem]"
      innerClassName="flex flex-wrap gap-2 items-center px-5 py-3"
    >
      {/* 你的内容 */}
      <Tag label="Tag 1" />
      <Tag label="Tag 2" />
    </AnimatedHeightWrapper>
  );
}
```

## 配置选项

```tsx
interface UseAnimatedHeightOptions {
  duration?: number;           // 动画持续时间（毫秒），默认 200
  easing?: string;             // CSS 缓动函数，默认 'cubic-bezier(0.25, 0.1, 0.25, 1)'
  threshold?: number;          // 高度变化阈值（像素），默认 1
  debounceMs?: number;         // 防抖延迟（毫秒），默认 16
  observeMutations?: boolean;  // 是否监听 DOM 变化，默认 true
  observeResize?: boolean;     // 是否监听尺寸变化，默认 true
}
```

## 工作原理

1. **布局分离**：将布局容器（内层）和动画容器（外层）分离
2. **单次布局**：内容变化时，内层容器立即完成一次布局重排
3. **平滑动画**：外层容器测量新高度后，平滑过渡到新高度
4. **避免抖动**：由于布局只发生一次，避免了每帧都重排导致的抖动

## 参考实现

查看 `TagInput.tsx` 组件可以看到实际使用示例。




