import { X } from "lucide-react";
import { useStore } from "../../store";

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="xs-toasts" aria-live="polite" role="status" data-print-hide>
      {toasts.map((t) => (
        <div key={t.id} className={`xs-toast ${t.kind}`}>
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}
