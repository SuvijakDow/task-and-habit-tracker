import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  isLoading?: boolean;
  tone?: 'danger' | 'warning' | 'primary';
  icon?: React.ReactNode;
  zIndexClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE_STYLES = {
  danger: {
    cardBorder: 'border-rose-100/80 shadow-[0_24px_56px_rgba(244,63,94,0.22)]',
    iconWrap: 'bg-rose-100 border-rose-200 text-rose-600',
    confirmBtn:
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-[0_8px_20px_rgba(244,63,94,0.28)]',
  },
  warning: {
    cardBorder: 'border-amber-200/80 shadow-[0_24px_56px_rgba(245,158,11,0.2)]',
    iconWrap: 'bg-amber-100 border-amber-200 text-amber-600',
    confirmBtn:
      'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-[0_8px_20px_rgba(245,158,11,0.28)]',
  },
  primary: {
    cardBorder: 'border-purple-200/80 shadow-[0_24px_56px_rgba(124,58,237,0.22)]',
    iconWrap: 'bg-purple-100 border-purple-200 text-purple-600',
    confirmBtn:
      'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-[0_8px_20px_rgba(168,85,247,0.28)]',
  },
} as const;

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loadingLabel = 'Processing...',
  isLoading = false,
  tone = 'danger',
  icon,
  zIndexClass = 'z-[9999]',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const styles = TONE_STYLES[tone];

  return createPortal(
    <div
      className={`fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-center justify-center ${zIndexClass} p-4`}
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        className={`modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border bg-white/95 backdrop-blur-none sm:backdrop-blur-xl p-5 sm:p-6 ${styles.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${styles.iconWrap}`}>
            {icon ?? <AlertTriangle className="h-6 w-6" />}
          </div>
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">{title}</h3>
        <div className="text-gray-700 text-sm text-center mb-6">{description}</div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-xl transition disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white font-semibold rounded-xl transition disabled:opacity-60 ${styles.confirmBtn}`}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
