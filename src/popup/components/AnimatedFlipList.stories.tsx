import type { Meta, StoryObj } from '@storybook/react';
import { useCallback, useState } from 'react';

import { AnimatedFlipList } from './AnimatedFlipList';
import { GlassButton } from './ui/buttons';

interface DemoItem {
  id: number;
  label: string;
}

const createInitialItems = (): DemoItem[] =>
  Array.from({ length: 5 }).map((_, index) => ({
    id: index,
    label: `列表项 ${index + 1}`,
  }));

const meta: Meta<typeof AnimatedFlipList<DemoItem>> = {
  title: 'Popup/AnimatedFlipList',
  component: AnimatedFlipList,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof AnimatedFlipList<DemoItem>>;

export const Interactive: Story = {
  render: () => {
    const [items, setItems] = useState<DemoItem[]>(createInitialItems);
    const [counter, setCounter] = useState(items.length);

    const addItem = useCallback(() => {
      setItems((prev) => [
        ...prev,
        {
          id: counter,
          label: `新增项 ${counter + 1}`,
        },
      ]);
      setCounter((value) => value + 1);
    }, [counter]);

    const removeItem = useCallback(() => {
      setItems((prev) => prev.slice(0, -1));
    }, []);

    const shuffleItems = useCallback(() => {
      setItems((prev) => {
        const next = [...prev];
        next.sort(() => Math.random() - 0.5);
        return next;
      });
    }, []);

    return (
      <div className="flex flex-col gap-4 w-[320px]">
        <div className="flex items-center gap-2">
          <GlassButton className="px-3 py-1 text-sm" onClick={addItem}>
            添加
          </GlassButton>
          <GlassButton className="px-3 py-1 text-sm" onClick={removeItem} disabled={items.length === 0}>
            删除
          </GlassButton>
          <GlassButton className="px-3 py-1 text-sm" onClick={shuffleItems} disabled={items.length < 2}>
            打乱
          </GlassButton>
        </div>
        <AnimatedFlipList
          items={items}
          renderItem={(item) => (
            <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--c-glass)20%,transparent)] border border-[color-mix(in_srgb,var(--c-glass)35%,transparent)] text-sm text-[color-mix(in_srgb,var(--c-content)80%,var(--c-bg))] shadow-sm">
              {item.label}
            </div>
          )}
          className="flex flex-col gap-2"
        />
      </div>
    );
  },
};

