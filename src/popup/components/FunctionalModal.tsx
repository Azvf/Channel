import React from 'react';
import { ModalHeader } from './ModalHeader';
import { Modal, ModalProps } from './ui/modal';

export interface FunctionalModalProps extends Omit<ModalProps, 'children'> {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  contentRef?: React.Ref<HTMLDivElement>;
  showHeader?: boolean;
}

export function FunctionalModal({
  title,
  children,
  footer,
  contentClassName,
  contentStyle,
  contentRef,
  showHeader = true,
  glassCardClassName,
  glassCardStyle,
  ...baseModalProps
}: FunctionalModalProps) {
  const combinedGlassCardClassName = [
    'flex flex-col min-h-0 overflow-hidden',
    '[&>.liquidGlass-content]:flex [&>.liquidGlass-content]:flex-col [&>.liquidGlass-content]:h-full [&>.liquidGlass-content]:max-h-full [&>.liquidGlass-content]:overflow-hidden',
    glassCardClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Modal
      {...baseModalProps}
      glassCardClassName={combinedGlassCardClassName}
      glassCardStyle={{
        width: '100%',
        height: 'auto',
        maxHeight: '100%',
        ...glassCardStyle,
      }}
    >
      {/* Header: 固定高度 (flex-shrink-0 防止被压缩) */}
      {showHeader && (
        <div className="flex-shrink-0">
          <ModalHeader title={title} onClose={baseModalProps.onClose} />
        </div>
      )}

      {/* Content: 弹性区域 (flex-1)，负责滚动 (overflow-y-auto) */}
      <div
        ref={contentRef}
        className={`flex-1 overflow-y-auto min-h-0 ${contentClassName || ''}`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--sb-thumb-idle) transparent',
          ...contentStyle,
        }}
      >
        {children}
      </div>

      {/* Footer: 固定高度 */}
      {footer && <div className="flex-shrink-0">{footer}</div>}
    </Modal>
  );
}

