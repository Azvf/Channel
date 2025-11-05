import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Checkbox } from './ui/checkbox';
import { ThemeSwitcher } from './ThemeSwitcher';
import { usePageSettings } from '../utils/usePageSettings';
import { DEFAULT_PAGE_SETTINGS } from '../../types/pageSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme: string;
}

export function SettingsModal({ isOpen, onClose, initialTheme }: SettingsModalProps) {
  // 使用 pageSettings hook 管理"同步视频时间戳"设置
  const pageSettings = usePageSettings(DEFAULT_PAGE_SETTINGS);
  const { settings, updateSyncVideoTimestamp } = pageSettings;
  const syncVideoTimestamp = settings.syncVideoTimestamp;

  const handleSyncVideoTimestampChange = (checked: boolean) => {
    updateSyncVideoTimestamp(checked);
  };

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
            className="space-y-4"
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.85rem',
              color: 'var(--c-content)',
            }}
          >
            {/* Theme Settings */}
            <div className="space-y-2">
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem'
                }}
              >
                Theme
              </div>
              <div className="flex justify-center">
                <ThemeSwitcher initialTheme={initialTheme} />
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: '1px',
                backgroundColor: 'color-mix(in srgb, var(--c-glass) 20%, transparent)',
                margin: '0.75rem 0'
              }}
            />

            {/* Page Settings */}
            <div className="space-y-2">
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem'
                }}
              >
                Page Settings
              </div>
              <label
                htmlFor="sync-video-timestamp"
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{
                  color: 'color-mix(in srgb, var(--c-content) 75%, var(--c-bg))',
                  fontSize: '0.8rem',
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                  transition: 'color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--c-content)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 75%, var(--c-bg))';
                }}
              >
                <Checkbox
                  id="sync-video-timestamp"
                  checked={syncVideoTimestamp}
                  onCheckedChange={handleSyncVideoTimestampChange}
                />
                <span>同步视频时间戳到 URL</span>
              </label>
            </div>

            {/* Divider */}
            <div
              style={{
                height: '1px',
                backgroundColor: 'color-mix(in srgb, var(--c-glass) 20%, transparent)',
                margin: '0.75rem 0'
              }}
            />

            {/* Other Settings Placeholder */}
            <div className="space-y-2">
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'color-mix(in srgb, var(--c-content) 80%, var(--c-bg))',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem'
                }}
              >
                Data
              </div>
              <p style={{ 
                fontSize: '0.8rem',
                color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))'
              }}>
                Import / Export
              </p>
              <p style={{ 
                fontSize: '0.8rem',
                color: 'color-mix(in srgb, var(--c-content) 60%, var(--c-bg))'
              }}>
                About
              </p>
            </div>
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


