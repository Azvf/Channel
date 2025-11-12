import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { ModalHeader } from './ModalHeader';
import { ModalFooter } from './ModalFooter';
import { GlassButton } from './GlassButton';
import { Info, AlertTriangle, XCircle } from 'lucide-react';

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
    color: '#F5A623',
  },
  destructive: {
    icon: XCircle,
    color: '#D0021B',
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
        zIndex: 'var(--z-modal-layer)',
        background: 'color-mix(in srgb, var(--c-glass) 15%, transparent)',
        backdropFilter: 'blur(4px)',
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <motion.div
        className="w-full max-w-sm"
        variants={modalVariants}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(event) => event.stopPropagation()}
      >
        <GlassCard
          className="overflow-hidden flex flex-col"
          style={{ width: '100%' }}
        >
          <ModalHeader title={title} onClose={onClose} />

          <div className="flex items-start gap-4 p-5">
            <div className="flex-shrink-0 mt-1">
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div
              className="flex-1 min-w-0"
              style={{
                font: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                letterSpacing: 'var(--letter-spacing-body)',
              }}
            >
              {children}
            </div>
          </div>

          <ModalFooter>
            {actions.map((action) => {
              const { id, label, variant, onClick: handleClick, autoFocus } = action;
              return (
                <GlassButton
                  key={id}
                  onClick={handleClick}
                  variant={variant}
                  autoFocus={autoFocus ?? id === resolvedAutoFocusId}
                >
                  {label}
                </GlassButton>
              );
            })}
          </ModalFooter>
        </GlassCard>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>{isOpen && modalContent}</AnimatePresence>,
    document.body
  );
}

