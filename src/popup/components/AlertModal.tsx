import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { ModalHeader } from './ModalHeader';
import { ModalFooter } from './ModalFooter';
import { GlassButton } from './GlassButton';
import { Info, AlertTriangle, XCircle } from 'lucide-react';
import { DIALOG_TRANSITION, SMOOTH_TRANSITION } from '../utils/motion'; // [Refactor] 使用统一的动画系统

type AlertActionVariant = 'default' | 'primary' | 'destructive';

export interface AlertAction {
  id: string;
  label: string;
  variant: AlertActionVariant;
  onClick: () => void;
  autoFocus?: boolean;
}

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  intent?: 'info' | 'warning' | 'destructive';
  actions: AlertAction[];
}

const intentMap = {
  info: {
    icon: Info,
    color: 'var(--c-action)',
  },
  warning: {
    icon: AlertTriangle,
    color: '#F5A623', // Keep as is until Warning Token is added
  },
  destructive: {
    icon: XCircle,
    color: 'var(--color-destructive)', // [Refactor] Tokenized
  },
} as const;

export function AlertModal({
  isOpen,
  onClose,
  title,
  children,
  intent = 'info',
  actions,
}: AlertModalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  const { icon: Icon, color } = intentMap[intent];

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  const resolvedAutoFocusId = useMemo(() => {
    const explicit = actions.find((action) => action.autoFocus);
    if (explicit) {
      return explicit.id;
    }
    const primary = actions.find((action) => action.variant === 'primary');
    return primary?.id;
  }, [actions]);

  const modalContent = (
    <motion.div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        // [Refactor] 使用明确的 Backdrop 层级
        zIndex: 'var(--z-modal-backdrop)',
        // [Refactor] 使用标准遮罩 Token
        background: 'var(--bg-surface-glass-active)', 
        backdropFilter: 'blur(var(--glass-blur-base))',
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={SMOOTH_TRANSITION} // [Refactor] 使用统一的动画系统
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm flex flex-col"
        style={{
          // 1. 硬性限制模态框最大高度，留出上下边距
          maxHeight: '85vh',
          // [Refactor] 使用明确的 Content 层级，确保在 Backdrop 之上
          zIndex: 'var(--z-modal-content)',
        }}
        variants={modalVariants}
        transition={DIALOG_TRANSITION} // [Refactor] 使用统一的动画系统
        onClick={(event) => event.stopPropagation()}
      >
        <GlassCard
          // 2. 核心修复：使用 [&>...] 语法穿透控制 GlassCard 内部的 .liquidGlass-content
          // - [&>.liquidGlass-content]:flex-col : 让内部内容垂直排列
          // - [&>.liquidGlass-content]:h-full : 让内部内容撑满卡片高度
          // - [&>.liquidGlass-content]:overflow-hidden : 防止圆角溢出
          className="flex flex-col min-h-0 overflow-hidden [&>.liquidGlass-content]:flex [&>.liquidGlass-content]:flex-col [&>.liquidGlass-content]:h-full [&>.liquidGlass-content]:max-h-full [&>.liquidGlass-content]:overflow-hidden"
          depthLevel={10} // Alert 级别较高
          style={{
            width: '100%',
            height: 'auto', // 允许高度自适应（内容少时变矮）
            maxHeight: '100%', // 继承父级的 85vh 限制（内容多时受限）
          }}
        >
          {/* Header: 固定高度 (flex-shrink-0 防止被压缩) */}
          <div className="flex-shrink-0">
            <ModalHeader title={title} onClose={onClose} />
          </div>

          {/* Content: 弹性区域 (flex-1)，负责滚动 (overflow-y-auto) */}
          <div 
            className="flex-1 overflow-y-auto px-5 py-5 min-h-0"
            style={{
              scrollbarWidth: 'thin',
              // [Refactor] 使用标准 Scrollbar Token
              scrollbarColor: 'var(--sb-thumb-idle) transparent',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <Icon className="icon-lg" style={{ color }} />
              </div>
              <div
                className="flex-1 min-w-0"
                style={{
                  font: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: 'var(--letter-spacing-body)',
                  wordBreak: 'break-word', // 防止长文本撑破布局
                  overflowWrap: 'break-word'
                }}
              >
                {children}
              </div>
            </div>
          </div>

          {/* Footer: 固定高度 */}
          <div className="flex-shrink-0">
            <ModalFooter>
              {actions.map((action) => {
                const { id, label, variant, onClick: handleClick, autoFocus } = action;
                // Map 'default' to 'secondary' for GlassButton
                const buttonVariant = variant === 'default' ? 'secondary' : variant;
                return (
                  <GlassButton
                    key={id}
                    onClick={handleClick}
                    variant={buttonVariant}
                    autoFocus={autoFocus ?? id === resolvedAutoFocusId}
                  >
                    {label}
                  </GlassButton>
                );
              })}
            </ModalFooter>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>{isOpen && modalContent}</AnimatePresence>,
    document.body
  );
}
