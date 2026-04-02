'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  full: 'max-w-full mx-4',
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: keyof typeof sizeStyles;
  children: React.ReactNode;
  className?: string;
}

function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'w-full rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/50',
        sizeStyles[size],
        className
      )}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
    >
      <div className="flex flex-col">
        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-4 py-4 sm:px-6">{children}</div>
      </div>
    </dialog>
  );
}

export { Modal };
