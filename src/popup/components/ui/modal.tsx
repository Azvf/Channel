import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../GlassCard';
import { DIALOG_TRANSITION, SMOOTH_TRANSITION } from '../../utils/motion';
import { useModalRegistry } from '../../context/ModalRegistryContext';
import { cn } from '../../utils/cn';

export interface ModalProps {
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
  backgroundImage?: string; // Hero image URL for glassmorphism background
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export function Modal({
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
  backgroundImage,
}: ModalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  const handleBackdropClick = onBackdropClick || onClose;
  
  // Modal Registry 集成：自动注册/注销
  const modalRegistry = useModalRegistry();
  const modalId = useId();
  
  useEffect(() => {
    if (isOpen) {
      // 注册 Modal
      modalRegistry.register({
        id: modalId,
        onClose,
      });
      
      // 清理函数：注销 Modal
      return () => {
        modalRegistry.unregister(modalId);
      };
    }
  }, [isOpen, modalId, onClose, modalRegistry]);

  // 默认 backdrop 样式
  const defaultBackdropStyle: React.CSSProperties = {
    zIndex: 'var(--z-modal-backdrop)',
    background: 'var(--bg-surface-glass-active)',
    backdropFilter: 'blur(var(--glass-blur-base))',
  };

  const modalContent = (
    <motion.div
      className={cn("fixed inset-0 flex items-center justify-center p-4", backdropClassName, className)}
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
            position: 'relative',
            backgroundColor: backgroundImage 
              ? 'var(--bg-surface-glass-active)'
              : 'var(--bg-surface-solid-ish)',
            backdropFilter: backgroundImage
              ? 'blur(var(--glass-blur-base)) saturate(var(--saturation))'
              : 'blur(calc(var(--glass-blur-base) * 1.5)) saturate(var(--saturation))',
            border: '1px solid var(--border-glass-strong)',
            boxShadow: 'var(--shadow-xl)',
            ...glassCardStyle,
          }}
        >
          {backgroundImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 'var(--opacity-disabled)',
                zIndex: -1,
                borderRadius: 'var(--radius-2xl)',
                overflow: 'hidden',
              }}
            />
          )}
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

