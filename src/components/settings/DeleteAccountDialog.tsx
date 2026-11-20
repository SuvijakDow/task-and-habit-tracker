import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  usesPasswordProvider: boolean;
  deleteConfirmName: string;
  deletePassword: string;
  deleteConfirmation: string;
  error: string | null;
  isDeleting: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  isOpen,
  usesPasswordProvider,
  deleteConfirmName,
  deletePassword,
  deleteConfirmation,
  error,
  isDeleting,
  onPasswordChange,
  onConfirmationChange,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const canDelete =
    !isDeleting &&
    deleteConfirmation.trim() === deleteConfirmName &&
    (!usesPasswordProvider || deletePassword.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-md rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Delete your account?</h3>
            <p className="mt-1 text-sm text-gray-600">
              This cannot be undone. All of your stored data will be permanently removed.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {usesPasswordProvider && (
            <div>
              <label htmlFor="delete-password" className="mb-1 block text-sm font-semibold text-gray-700">
                Password
              </label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => onPasswordChange(e.target.value)}
                disabled={isDeleting}
                className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
                autoComplete="current-password"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="delete-confirmation"
              className="mb-1 block text-sm font-semibold text-gray-700"
            >
              Type <span className="font-bold text-rose-600">{deleteConfirmName}</span> to confirm
            </label>
            <input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => onConfirmationChange(e.target.value)}
              disabled={isDeleting}
              placeholder={deleteConfirmName}
              className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
