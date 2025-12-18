import { useState } from "react";
import { motion } from "framer-motion";
import type { Meta, StoryObj } from '@storybook/react';
import { TagInput } from "./TagInput";
import { ArrowUpRight } from "lucide-react";

// 模拟 props，在 Storybook 中展示 Zen 设计
interface ZenTaggingPageProps {
  // 模拟数据
  mockTitle?: string;
  mockUrl?: string;
  mockTags?: string[];
  mockStats?: { today: number; streak: number };
}

const ZenTaggingPage = ({
  mockTitle = "Understanding the Complexity of Modern UI Systems",
  mockUrl = "medium.com/design-systems/ui-complexity",
  mockTags = ["Design", "Productivity"],
  mockStats = { today: 12, streak: 5 }
}: ZenTaggingPageProps) => {
  
  // 状态模拟
  const [title, setTitle] = useState(mockTitle);
  const [tags, setTags] = useState(mockTags);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // 动画配置：更接近 iOS 的弹簧效果
  const springTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  };

  return (
    <div className="w-full h-full flex flex-col justify-center p-4">
        {/* 容器设计：
           这里我们不使用显式的 GlassCard 包裹整个区域，而是让内容"浮"在背景上。
           如果必须有卡片感，我们去除内边距的线条感。
        */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="relative w-full max-w-md mx-auto"
        >
          <div className="flex flex-col gap-1">
            
            {/* 1. Page Title Area - 核心锚点 */}
            {/* 这里的交互必须极其平滑，从文本到输入框无缝切换 */}
            <div className="relative group">
              {isEditingTitle ? (
                <textarea
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  className="w-full bg-transparent resize-none outline-none m-0 p-0"
                  style={{
                    font: "var(--font-title2-emphasized)", // 更大，更自信
                    color: "var(--color-text-primary)",
                    lineHeight: "1.2",
                    minHeight: "3.5rem"
                  }}
                />
              ) : (
                <h1 
                  onClick={() => setIsEditingTitle(true)}
                  className="cursor-text transition-colors duration-200"
                  style={{
                    font: "var(--font-title2-emphasized)",
                    color: "var(--color-text-primary)",
                    lineHeight: "1.2",
                    margin: 0,
                    padding: 0,
                    // 悬停时仅微弱提示可编辑
                  }}
                >
                  {title}
                </h1>
              )}
            </div>

            {/* 2. Metadata / URL - 极简的面包屑 */}
            <div className="flex items-center gap-1 mb-4 opacity-60">
               <ArrowUpRight size={12} style={{ color: "var(--color-text-tertiary)" }}/>
               <span 
                 className="truncate"
                 style={{
                   font: "var(--font-caption1)",
                   color: "var(--color-text-tertiary)",
                   maxWidth: "80%"
                 }}
               >
                 {mockUrl}
               </span>
            </div>

            {/* 3. The Core Action: Tagging */}
            {/* 移除了外层的 GlassCard 边框，让 Input 融入背景 
                或者使用一个极浅的 Surface
            */}
            <div className="mb-6">
               <TagInput
                 tags={tags}
                 onTagsChange={setTags} // Mock change
                 mode="list"
                 placeholder="Add context..." // 比 "Enter a tag" 更有人情味
                 className="w-full"
                 // TODO: 如果需要更扁平的设计，可以在 TagInput 内部支持 variant="minimal"
                 // 或者通过 CSS 变量或 className 覆盖样式
               />
            </div>

            {/* 4. Ambient Footer - 无干扰的反馈 */}
            <motion.div 
              className="flex items-center gap-3 pt-4 border-t border-dashed"
              style={{ borderColor: "var(--border-glass-subtle)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <StatsItem label="Today" value={mockStats.today} />
              <div className="w-1 h-1 rounded-full bg-[var(--color-text-quaternary)]" />
              <StatsItem label="Streak" value={`${mockStats.streak} days`} />
            </motion.div>

          </div>
        </motion.div>
    </div>
  );
};

// 辅助极简组件
const StatsItem = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex items-baseline gap-1.5">
    <span style={{ 
      font: "var(--font-caption1)", 
      color: "var(--color-text-tertiary)" 
    }}>
      {label}
    </span>
    <span style={{ 
      font: "var(--font-caption1-emphasized)", 
      color: "var(--color-text-secondary)",
      fontVariantNumeric: "tabular-nums"
    }}>
      {value}
    </span>
  </div>
);

// Storybook Default Export
const meta: Meta<typeof ZenTaggingPage> = {
  title: 'Popup/Pages/ZenTaggingPage',
  component: ZenTaggingPage,
  parameters: {
    layout: 'centered',
    backgrounds: {
        default: 'glass',
        values: [
            { name: 'glass', value: 'oklch(0.97 0.003 264)' },  // OKLCH: 浅色毛玻璃背景
            { name: 'dark-glass', value: 'oklch(0.12 0.005 264)' },  // OKLCH: 深色毛玻璃背景
        ],
    },
  },
};

export default meta;

type Story = StoryObj<typeof ZenTaggingPage>;

export const Default: Story = {
  args: {
    mockTitle: "Understanding the Complexity of Modern UI Systems",
    mockUrl: "medium.com/design-systems/ui-complexity",
    mockTags: ["Design", "Productivity"],
    mockStats: { today: 12, streak: 5 }
  },
};

export const LongTitle: Story = {
  args: {
    mockTitle: "A Comprehensive Guide to Building Scalable Design Systems with Glassmorphism and Modern Web Technologies",
    mockUrl: "design.blog/articles/comprehensive-guide",
    mockTags: ["Design Systems", "Glassmorphism", "Web Development"],
    mockStats: { today: 24, streak: 7 }
  },
};

export const MinimalTags: Story = {
  args: {
    mockTitle: "Simple Article",
    mockUrl: "example.com/article",
    mockTags: [],
    mockStats: { today: 1, streak: 1 }
  },
};

