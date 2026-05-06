import { useToast } from '../context/ToastContext';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const variantStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-white text-slate-900',
};

const variantIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: Info,
  info: Info,
};

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = variantIcons[toast.variant] || Info;

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl transition-all duration-300 ${variantStyles[toast.variant] || variantStyles.info}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-5">{toast.title}</p>
                {toast.description && <p className="mt-1 text-sm leading-5 opacity-90">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 transition hover:bg-black/5"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
