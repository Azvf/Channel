import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { DIALOG_TRANSITION, SMOOTH_TRANSITION } from '../utils/motion';
import { useModalRegistry } from '../context/ModalRegistryContext';

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
  backgroundImage,
}: BaseModalProps) {
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

  // 默认 backdrop 样式（参考 StatsWallModal）
  const defaultBackdropStyle: React.CSSProperties = {
    zIndex: 'var(--z-modal-backdrop)',
    background: 'var(--bg-surface-glass-active)',
    backdropFilter: 'blur(var(--glass-blur-base))',
  };

  // 背景图片通过独立层承载，支持预留的模糊效果功能
  // 当前实现：直接显示背景图片（无模糊）
  // 预留功能：可通过 filter: blur() 实现背景图片模糊（已禁用）

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
            position: 'relative',
            backgroundColor: backgroundImage 
              ? 'var(--bg-surface-glass-active)' // 使用标准玻璃背景 token，与背景图片层叠加
              : 'var(--bg-surface-solid-ish)',
            backdropFilter: backgroundImage
              ? 'blur(var(--glass-blur-base)) saturate(var(--saturation))'
              : 'blur(calc(var(--glass-blur-base) * 1.5)) saturate(var(--saturation))', // 使用 calc() 基于 token 计算，避免硬编码
            border: '1px solid var(--border-glass-strong)',
            boxShadow: 'var(--shadow-xl)',
            ...glassCardStyle,
          }}
        >
          {/* 
            [预留功能] 背景图片模糊效果
            当前已禁用（通过 false && 条件），如需启用：
            1. 将 false && 改为 true && 或移除条件
            2. 调整 filter 和 opacity 值以优化视觉效果
            实现原理：backdrop-filter 只能模糊元素后面的内容，无法模糊元素自身的背景图片。
            因此需要使用 filter: blur() 对背景图片层本身进行模糊，配合半透明背景实现毛玻璃效果。
          */}
          {backgroundImage && false && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: `blur(calc(var(--glass-blur-base) * 1.5))`, // 使用设计 token 计算模糊值
                opacity: 'var(--opacity-hover)', // 使用设计 token
                zIndex: -1,
                borderRadius: 'var(--radius-2xl)',
                overflow: 'hidden',
              }}
            />
          )}
          {/* 
            [当前实现] 背景图片直接显示（无模糊）
            背景图片保持原始清晰度，通过降低 opacity 确保内容可读性
          */}
          {backgroundImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 'var(--opacity-disabled)', // 使用设计 token，确保内容可读性
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

