import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { POSITIONING } from "../utils/layoutConstants";
import { DURATION } from "../../design-tokens/animation"; // [Refactor] 使用统一的动画常量

// ----------------------------------------------------------------
// 独立组件: 负责无延迟跟随的下拉菜单容器
// ----------------------------------------------------------------
export interface StickyDropdownProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  zIndex?: string;
}

export function StickyDropdown({ isOpen, anchorRef, children, zIndex = "var(--z-dropdown)" }: StickyDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(isOpen);

  // 处理延迟卸载以播放退出动画 (简单的状态同步)
  // [Refactor] 使用统一的动画常量，避免逻辑-CSS 竞态冒险
  useEffect(() => {
    if (isOpen) setIsMounted(true);
    else {
      // 使用物理引擎常量，确保与 CSS transition 同步
      const timer = setTimeout(() => setIsMounted(false), DURATION.FAST * 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 核心：高性能定位逻辑
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const rect = anchor.getBoundingClientRect();
    // 直接操作 style，避开 React Render Cycle
    // [Refactor] 使用标准定位常量
    dropdown.style.top = `${rect.bottom + POSITIONING.DROPDOWN_OFFSET}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isMounted) return;
    
    // 1. 立即定位 (防止首帧错位)
    updatePosition();
    
    // 2. 绑定事件 (增强版)
    // 某些测试环境或复杂布局下，scroll 事件可能只冒泡到 document 而非 window
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    // ✅ 修复：增加对 document 的滚动监听，作为双重保障
    document.addEventListener('scroll', updatePosition, true);
    
    // 3. 启动 rAF 循环
    // ✅ 修复：使用 Ref 追踪最新的 frameId，确保 cleanup 能拿到正确的值
    const frameRef = { id: 0 };
    const loop = () => {
      updatePosition();
      frameRef.id = requestAnimationFrame(loop);
    };
    
    // 启动循环
    frameRef.id = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      // ✅ 修复：清理 document 滚动监听
      document.removeEventListener('scroll', updatePosition, true);
      // ✅ 总是取消最新的帧，防止资源泄漏
      cancelAnimationFrame(frameRef.id);
    };
  }, [isMounted, updatePosition]);

  if (!isMounted) return null;

  return createPortal(
    <div 
      ref={dropdownRef}
      className={`fixed transition-[opacity,transform] duration-200 ease-out ${
        isOpen 
          ? 'opacity-100 translate-y-1 scale-100' 
          : 'opacity-0 translate-y-0 scale-98 pointer-events-none'
      }`}
      style={{
        zIndex: zIndex,
        transformOrigin: 'top center',
        // [Refactor] 使用 visibility 替代 top: -9999 hack，避免布局副作用
        visibility: isOpen ? 'visible' : 'hidden',
        top: 0, // 重置为安全值，实际位置由 updatePosition 控制
        left: 0 
      }}
    >
      {children}
    </div>,
    document.body
  );
}

