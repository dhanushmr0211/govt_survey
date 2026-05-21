import React from 'react';
import { useToastStore } from '../../store/toastStore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none p-4 md:p-0">
      {toasts.map((toast) => {
        let bgColor = 'bg-white';
        let borderColor = 'border-slate-200';
        let textColor = 'text-slate-800';
        let Icon = Info;
        let iconColor = 'text-blue-500';

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50';
          borderColor = 'border-emerald-200/80';
          textColor = 'text-emerald-900';
          iconColor = 'text-emerald-600';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50';
          borderColor = 'border-rose-200/80';
          textColor = 'text-rose-900';
          iconColor = 'text-rose-600';
          Icon = AlertTriangle;
        } else if (toast.type === 'warning') {
          bgColor = 'bg-amber-50';
          borderColor = 'border-amber-200/80';
          textColor = 'text-amber-900';
          iconColor = 'text-amber-600';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg border ${bgColor} ${borderColor} ${textColor} shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 animate-toast-in`}
            style={{
              animation: 'toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColor} mt-0.5`} />
            <div className="flex-1 text-sm font-medium leading-5">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-0.5 hover:bg-slate-100/55 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toast-in {
          from {
            transform: translateY(-12px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
