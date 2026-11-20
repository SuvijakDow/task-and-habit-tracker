import { useCallback, useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

let toastIdCounter = 0;
let globalAddToast: ((message: string, type: ToastMessage['type']) => void) | null = null;

/**
 * Show a toast notification from anywhere in the app.
 * The ToastContainer must be mounted for this to work.
 */
export function showToast(message: string, type: ToastMessage['type'] = 'error') {
  if (globalAddToast) {
    globalAddToast(message, type);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    globalAddToast = (message: string, type: ToastMessage['type']) => {
      const id = `toast-${++toastIdCounter}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    };

    return () => {
      globalAddToast = null;
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2.5 items-center pointer-events-none px-4 w-full sm:w-auto max-w-[calc(100vw-1rem)] sm:max-w-[min(92vw,760px)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 240);
    }, 3600);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const styleClasses =
    toast.type === 'error'
      ? 'bg-rose-600/95 border-rose-400/50 shadow-rose-950/25'
      : toast.type === 'success'
        ? 'bg-emerald-600/95 border-emerald-400/50 shadow-emerald-950/25'
        : 'bg-purple-700/95 border-purple-400/50 shadow-purple-950/25';

  const icon =
    toast.type === 'error' ? (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : toast.type === 'success' ? (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-white text-xs sm:text-sm font-semibold shadow-xl ${styleClasses} w-full sm:w-auto sm:min-w-[260px] max-w-full transition-[transform,opacity] duration-250 ease-out will-change-transform ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-95'
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 shrink-0">
        {icon}
      </span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 240);
        }}
        className="ml-1 p-1 rounded-full text-white/75 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
