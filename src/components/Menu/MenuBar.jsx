import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useStore } from "../../store";
import { buildMenus, COLOR_SWATCHES } from "../../lib/menuDefs";
import { focusGrid } from "../../lib/actions";

const stop = (e) => e.preventDefault(); // keep focus (and any cell edit) where it is

export function MenuList({ items, onDone, className = "" }) {
  const [sub, setSub] = useState(null);
  return (
    <div className={`xs-menu ${className}`} role="menu" onMouseDown={stop}>
      {items.map((it, i) => {
        if (it.type === "sep") return <div key={i} className="xs-menu-sep" role="separator" />;
        const hasSub = it.items || it.swatches;
        return (
          <div key={i} className="xs-menu-row" onMouseEnter={() => setSub(hasSub ? i : null)}>
            <button
              role="menuitem"
              className="xs-menu-item"
              disabled={it.disabled}
              onClick={() => {
                if (hasSub) return setSub(i);
                it.run?.();
                onDone?.();
              }}
            >
              <span className="xs-menu-check">{it.checked && <Check size={12} />}</span>
              <span className="xs-menu-label">{it.label}</span>
              {it.hint && <span className="xs-menu-hint">{it.hint}</span>}
              {hasSub && <ChevronRight size={12} className="xs-menu-arrow" />}
            </button>
            {sub === i && it.items && <MenuList items={it.items} onDone={onDone} className="xs-sub" />}
            {sub === i && it.swatches && (
              <div className="xs-menu xs-sub xs-swatches" onMouseDown={stop}>
                {COLOR_SWATCHES.map((c) => (
                  <button key={c} className="xs-swatch" style={{ background: c }} title={c} aria-label={c} onClick={() => (it.swatches(c), onDone?.())} />
                ))}
                <button className="xs-swatch-none" onClick={() => (it.swatches(null), onDone?.())}>Automatic / none</button>
                <label className="xs-swatch-custom">
                  Custom…
                  <input type="color" onChange={(e) => it.swatches(e.target.value)} onBlur={onDone} />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MenuBar() {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  // Re-render when anything the menu reflects changes
  const snapshot = useStore();
  const menus = buildMenus(snapshot);

  useEffect(() => {
    if (!open) return;
    const away = (e) => !ref.current?.contains(e.target) && setOpen(null);
    const esc = (e) => e.key === "Escape" && (setOpen(null), focusGrid());
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => (window.removeEventListener("mousedown", away), window.removeEventListener("keydown", esc));
  }, [open]);

  const done = () => {
    setOpen(null);
    setTimeout(focusGrid, 0);
  };

  return (
    <div className="xs-menubar" ref={ref} role="menubar" data-print-hide>
      {Object.entries(menus).map(([name, items]) => (
        <div key={name} className="xs-menubar-slot">
          <button className={`xs-menubar-btn${open === name ? " open" : ""}`} role="menuitem" aria-haspopup="true" aria-expanded={open === name} onMouseDown={stop} onClick={() => setOpen(open === name ? null : name)} onMouseEnter={() => open && setOpen(name)}>
            {name}
          </button>
          {open === name && <MenuList items={items} onDone={done} className="xs-drop" />}
        </div>
      ))}
    </div>
  );
}
