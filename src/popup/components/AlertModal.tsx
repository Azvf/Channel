import React, { useMemo } from 'react';
import { FunctionalModal } from './FunctionalModal';
import { ModalFooter } from './ModalFooter';
import { Button } from './ui/buttons';
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
    color: 'var(--color-action)',
  },
  warning: {
    icon: AlertTriangle,
    /* [Refactor] #F5A623 -> var(--color-warning)，使用语义化 Token */
    color: 'var(--color-warning)',
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
  const { icon: Icon, color } = intentMap[intent];

  const resolvedAutoFocusId = useMemo(() => {
    const explicit = actions.find((action) => action.autoFocus);
    if (explicit) {
      return explicit.id;
    }
    const primary = actions.find((action) => action.variant === 'primary');
    return primary?.id;
  }, [actions]);

  const footer = (
    <ModalFooter>
      {actions.map((action) => {
        const { id, label, variant, onClick: handleClick, autoFocus } = action;
        // Map 'default' to 'secondary' for Button
        const buttonVariant = variant === 'default' ? 'secondary' : variant;
        return (
          <Button
            key={id}
            onClick={handleClick}
            variant={buttonVariant}
            autoFocus={autoFocus ?? id === resolvedAutoFocusId}
          >
            {label}
          </Button>
        );
      })}
    </ModalFooter>
  );

  return (
    <FunctionalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="var(--modal-max-width)"
      contentStyle={{
        padding: 'var(--space-5)',
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
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {children}
        </div>
      </div>
    </FunctionalModal>
  );
}
