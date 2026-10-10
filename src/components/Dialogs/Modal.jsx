import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, footer, wide = false, labelledBy = "xs-dlg-title" }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const first = ref.current?.querySelector("input:not([type=checkbox]),select,textarea,button.primary");
    (first || ref.current)?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll("button,input,select,textarea,a[href]")].filter((x) => !x.disabled);
        if (!f.length) return;
        const a = f[0];
        const z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) (e.preventDefault(), z.focus());
        else if (!e.shiftKey && document.activeElement === z) (e.preventDefault(), a.focus());
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="xs-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`xs-dialog${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref} tabIndex={-1}>
        <div className="xs-dialog-head">
          <h2 id={labelledBy}>{title}</h2>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="xs-dialog-body">{children}</div>
        {footer && <div className="xs-dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint }) => (
  <label className="xs-field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);
