import { useState, useEffect } from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { TaggingPage } from "./TaggingPage";
import { setMockCurrentPage } from "../mocks/storybookMocks";
import type { TaggedPage } from "../../shared/types/gameplayTag";

/**
 * Storybook Wrapper Component
 * 模拟网络卡顿场景：title 初始为 URL，然后异步更新为真实 title
 */
function UrlTitleStoryWrapper({ 
  initialTitle, 
  finalTitle, 
  autoUpdate = false,
  updateDelay = 2000 
}: {
  initialTitle: string;
  finalTitle: string;
  autoUpdate?: boolean;
  updateDelay?: number;
}) {
  const [currentTitle, setCurrentTitle] = useState(initialTitle);

  // 设置 mock 当前页面
  useEffect(() => {
    const mockPage: TaggedPage = {
      id: 'p1',
      url: 'https://example.com/article',
      title: currentTitle,
      domain: 'example.com',
      tags: ['t1'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMockCurrentPage(mockPage);
  }, [currentTitle]);

  // 模拟异步更新 title
  useEffect(() => {
    if (autoUpdate && currentTitle === initialTitle) {
      const timer = setTimeout(() => {
        setCurrentTitle(finalTitle);
      }, updateDelay);

      return () => clearTimeout(timer);
    }
  }, [autoUpdate, currentTitle, initialTitle, finalTitle, updateDelay]);

  return (
    <div style={{ width: '400px', height: '600px', padding: '1rem' }}>
      <TaggingPage />
    </div>
  );
}

const meta: Meta<typeof UrlTitleStoryWrapper> = {
  title: 'Popup/Pages/TaggingPage - URL Title Scenario',
  component: UrlTitleStoryWrapper,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'glass',
      values: [
        { name: 'glass', value: '#F5F5F7' },
        { name: 'dark-glass', value: '#1C1C1E' },
      ],
    },
  },
  argTypes: {
    autoUpdate: {
      control: 'boolean',
      description: '是否自动更新 title（模拟异步获取）',
    },
    updateDelay: {
      control: { type: 'number', min: 500, max: 5000, step: 500 },
      description: '更新延迟（毫秒）',
    },
  },
};

export default meta;

type Story = StoryObj<typeof UrlTitleStoryWrapper>;

/**
 * 场景 1: Title 是 URL，显示 loading 状态
 * 模拟网络卡顿时，浏览器将 tab.title 设置为 URL 的情况
 */
export const UrlTitleWithLoading: Story = {
  args: {
    initialTitle: 'https://example.com/article',
    finalTitle: 'Understanding Modern Web Development',
    autoUpdate: false, // 不自动更新，保持 URL 状态
    updateDelay: 2000,
  },
  parameters: {
    docs: {
      description: {
        story: '当网络卡顿时，title 显示为 URL，旁边显示旋转的 loading 图标。用户可以正常添加 tag，但保存的 title 仍然是 URL。',
      },
    },
  },
};

/**
 * 场景 2: Title 从 URL 异步更新为真实 title
 * 模拟异步获取真实 title 后的更新过程
 */
export const UrlTitleAutoUpdate: Story = {
  args: {
    initialTitle: 'https://example.com/article',
    finalTitle: 'Understanding Modern Web Development',
    autoUpdate: true, // 自动更新
    updateDelay: 2000,
  },
  parameters: {
    docs: {
      description: {
        story: '初始显示 URL + loading 图标，2 秒后自动更新为真实 title，loading 图标消失。',
      },
    },
  },
};

/**
 * 场景 3: 长 URL 作为 title
 */
export const LongUrlTitle: Story = {
  args: {
    initialTitle: 'https://example.com/very/long/path/to/article?query=parameter&another=value',
    finalTitle: 'A Comprehensive Guide to Building Scalable Applications',
    autoUpdate: true,
    updateDelay: 2000,
  },
  parameters: {
    docs: {
      description: {
        story: '展示长 URL 作为 title 时的显示效果，以及更新后的对比。',
      },
    },
  },
};

/**
 * 场景 4: HTTP URL（非 HTTPS）
 */
export const HttpUrlTitle: Story = {
  args: {
    initialTitle: 'http://example.com/article',
    finalTitle: 'Legacy HTTP Article',
    autoUpdate: true,
    updateDelay: 2000,
  },
  parameters: {
    docs: {
      description: {
        story: '展示 HTTP URL 作为 title 时的处理。',
      },
    },
  },
};

/**
 * 场景 5: 快速更新（模拟网络良好时的情况）
 */
export const FastUpdate: Story = {
  args: {
    initialTitle: 'https://example.com/article',
    finalTitle: 'Quick Load Article',
    autoUpdate: true,
    updateDelay: 500, // 快速更新
  },
  parameters: {
    docs: {
      description: {
        story: '模拟网络良好时，title 快速从 URL 更新为真实 title。',
      },
    },
  },
};

/**
 * 场景 6: 慢速更新（模拟网络较差时的情况）
 */
export const SlowUpdate: Story = {
  args: {
    initialTitle: 'https://example.com/article',
    finalTitle: 'Slow Network Article',
    autoUpdate: true,
    updateDelay: 4000, // 慢速更新
  },
  parameters: {
    docs: {
      description: {
        story: '模拟网络较差时，title 需要较长时间才能从 URL 更新为真实 title。',
      },
    },
  },
};

