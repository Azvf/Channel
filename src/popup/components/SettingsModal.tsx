import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  const modalContent = (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
        backdropFilter: 'blur(4px)',
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm"
        variants={modalVariants}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing on modal click
      >
        <GlassCard className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--c-content)',
                letterSpacing: '-0.02em',
                margin: 0
              }}
            >
              Settings
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-all"
              style={{
                background: 'color-mix(in srgb, var(--c-glass) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c-glass) 20%, transparent)',
                color: 'color-mix(in srgb, var(--c-content) 70%, var(--c-bg))',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 35%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 8%, transparent)';
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--c-glass) 20%, transparent)';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div 
            className="space-y-3"
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.85rem',
              color: 'var(--c-content)',
            }}
          >
            <p>Import / Export</p>
            <p>Theme Settings</p>
            <p>About</p>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && modalContent}
    </AnimatePresence>,
    document.body
  );
}

