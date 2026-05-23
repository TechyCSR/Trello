import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Toast, useToastStore } from "@/store/useToastStore";

const TONE_STYLES: Record<Toast["tone"], { icon: typeof AlertCircle; accent: string; ring: string; iconWrap: string }> = {
  error: {
    icon: AlertCircle,
    accent: "from-rose-500/30 via-rose-500/10 to-rose-500/5",
    ring: "ring-rose-400/40 shadow-[0_18px_40px_-12px_rgba(244,63,94,0.55)]",
    iconWrap: "bg-rose-500/20 text-rose-200",
  },
  success: {
    icon: CheckCircle2,
    accent: "from-emerald-500/30 via-emerald-500/10 to-emerald-500/5",
    ring: "ring-emerald-400/40 shadow-[0_18px_40px_-12px_rgba(16,185,129,0.55)]",
    iconWrap: "bg-emerald-500/20 text-emerald-200",
  },
  info: {
    icon: Info,
    accent: "from-sky-500/30 via-sky-500/10 to-sky-500/5",
    ring: "ring-sky-400/40 shadow-[0_18px_40px_-12px_rgba(14,165,233,0.55)]",
    iconWrap: "bg-sky-500/20 text-sky-200",
  },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismissToast);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setClosing(true);
    window.setTimeout(() => dismiss(toast.id), 200);
  };

  const { icon: Icon, accent, ring, iconWrap } = TONE_STYLES[toast.tone];

  return (
    <div
      role="status"
      className={`group pointer-events-auto relative overflow-hidden rounded-xl border border-white/10 bg-[#1a1c22]/95 px-3 py-3 text-slate-100 backdrop-blur-xl ring-1 ${ring} transition-all duration-300 ease-out ${
        visible && !closing ? "translate-y-0 opacity-100 scale-100" : "translate-y-3 opacity-0 scale-[0.97]"
      }`}
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} aria-hidden />
      <div className="relative flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconWrap}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 pt-0.5">
          <div className="text-sm font-semibold leading-tight">{toast.title}</div>
          {toast.description && <div className="mt-1 text-xs text-slate-300/90">{toast.description}</div>}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {toast.duration > 0 && (
        <div className="relative mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-white/40"
            style={{ animation: `toast-progress ${toast.duration}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
