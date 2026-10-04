import { useRef, useCallback } from "react";

/**
 * Tracks mouse position relative to an element for the
 * radial-gradient glow effect on `.glow-card`.
 *
 * Returns a ref and an onMouseMove handler to spread onto the element.
 *
 * Usage:
 *   const { ref, onMouseMove } = useMousePosition();
 *   <div ref={ref} onMouseMove={onMouseMove} className="glow-card">…</div>
 */
export function useMousePosition() {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mouse-x", "50%");
    el.style.setProperty("--mouse-y", "50%");
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}   