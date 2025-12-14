/**
 * useDropdownSections Hook
 * Headless 数据切片 Hook
 * 
 * 目的：将扁平的 renderedItems 切分为 scrollable 和 fixed 区域，并提供索引映射
 */

import { useMemo } from 'react';

/**
 * Dropdown 切片结果
 */
export interface DropdownSections<T> {
  /** 可滚动区域的项（match 类型） */
  scrollableItems: T[];
  /** 固定底部的项（create 类型） */
  fixedFooterItem: T | undefined;
  /** 分割线项（separator 类型） */
  separatorItem: T | undefined;
  /** 获取原始索引：根据局部索引和所在区域返回原始数据中的真实索引 */
  getOriginalIndex: (localIndex: number, section: 'scrollable' | 'footer') => number;
}

/**
 * useDropdownSections Hook
 * 
 * 将扁平的 items 切分为 scrollable 和 fixed 区域，并维护索引映射关系
 */
export function useDropdownSections<T extends { type: string; index: number }>(
  items: T[]
): DropdownSections<T> {
  return useMemo(() => {
    const scrollableItems: T[] = [];
    let fixedFooterItem: T | undefined;
    let separatorItem: T | undefined;
    
    // 记录每个 item 的原始索引（用于索引映射）
    const originalIndexMap = new Map<T, number>();

    // 单次遍历，性能 O(n)
    items.forEach((item, originalIndex) => {
      originalIndexMap.set(item, originalIndex);
      
      if (item.type === 'create') {
        fixedFooterItem = item;
      } else if (item.type === 'separator') {
        separatorItem = item;
      } else {
        // match 类型或其他类型放入可滚动区域
        scrollableItems.push(item);
      }
    });

    // 索引映射函数：根据所在区域返回原始数据中的真实索引
    const getOriginalIndex = (localIndex: number, section: 'scrollable' | 'footer'): number => {
      if (section === 'scrollable') {
        const item = scrollableItems[localIndex];
        return item ? originalIndexMap.get(item) ?? localIndex : localIndex;
      }
      // Footer 的原始索引
      if (fixedFooterItem) {
        return originalIndexMap.get(fixedFooterItem) ?? items.length - 1;
      }
      return -1;
    };

    return { 
      scrollableItems, 
      fixedFooterItem, 
      separatorItem,
      getOriginalIndex 
    };
  }, [items]);
}

