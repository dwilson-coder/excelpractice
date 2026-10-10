import { useEffect, useState } from "react";
import { useStore } from "../../store";
import { contextItems } from "../../lib/menuDefs";
import { focusGrid } from "../../lib/actions";
import { MenuList } from "./MenuBar";

export default function ContextMenu() {
  const [at, setAt] = useState(null);
  useEffect(() => {
    const show = (e) => setAt(e.detail);
    const hide = (e) => !e.target.closest?.(".xs-ctx") && setAt(null);
    const esc = (e) => e.key === "Escape" && setAt(null);
    window.addEventListener("xs-context-menu", show);
    window.addEventListener("mousedown", hide);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", hide);
    return () => (window.removeEventListener("xs-context-menu", show), window.removeEventListener("mousedown", hide), window.removeEventListener("keydown", esc), window.removeEventListener("resize", hide));
  }, []);
  if (!at) return null;
  const items = contextItems(useStore.getState(), at.kind);
  const left = Math.min(at.x, window.innerWidth - 240);
  const top = Math.min(at.y, window.innerHeight - items.length * 30 - 16);
  return (
    <div className="xs-ctx" style={{ left, top }}>
      <MenuList items={items} onDone={() => (setAt(null), setTimeout(focusGrid, 0))} />
    </div>
  );
}
