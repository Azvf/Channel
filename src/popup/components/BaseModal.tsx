import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { DIALOG_TRANSITION, SMOOTH_TRANSITION } from '../utils/motion';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  depthLevel?: number;
  className?: string;
  style?: React.CSSProperties;
  onBackdropClick?: () => void;
  glassCardClassName?: string;
  glassCardStyle?: React.CSSProperties;
  modalRef?: React.Ref<HTMLDivElement>;
  backdropStyle?: React.CSSProperties;
  backdropClassName?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export function BaseModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'var(--modal-max-width)',
  maxHeight = 'var(--modal-max-height)',
  depthLevel = 10,
  className,
  style,
  onBackdropClick,
  glassCardClassName,
  glassCardStyle,
  modalRef,
  backdropStyle,
  backdropClassName,
}: BaseModalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  const handleBackdropClick = onBackdropClick || onClose;

  // 默认 backdrop 样式（参考 StatsWallModal）
  const defaultBackdropStyle: React.CSSProperties = {
    zIndex: 'var(--z-modal-backdrop)',
    background: 'var(--bg-surface-glass-active)',
    backdropFilter: 'blur(var(--glass-blur-base))',
  };

  const modalContent = (
    <motion.div
      className={`fixed inset-0 flex items-center justify-center p-4 ${backdropClassName || className || ''}`}
      style={{
        ...defaultBackdropStyle,
        ...style,
        ...backdropStyle,
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={SMOOTH_TRANSITION}
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={modalRef}
        className="w-full flex flex-col"
        style={{
          maxWidth,
          maxHeight,
          zIndex: 'var(--z-modal-content)',
        }}
        variants={modalVariants}
        transition={DIALOG_TRANSITION}
        onClick={(event) => event.stopPropagation()}
      >
        <GlassCard
          className={glassCardClassName}
          depthLevel={depthLevel}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '100%',
            borderRadius: 'var(--radius-2xl)',
            // 默认样式（参考 StatsWallModal 的 .stats-wall-container）
            backgroundColor: 'var(--bg-surface-solid-ish)',
            backdropFilter: 'blur(var(--glass-blur-heavy)) saturate(180%)',
            border: '1px solid var(--border-glass-strong)',
            boxShadow: 'var(--shadow-xl)',
            ...glassCardStyle,
          }}
        >
          {children}
        </GlassCard>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>{isOpen && modalContent}</AnimatePresence>,
    document.body
  );
}

