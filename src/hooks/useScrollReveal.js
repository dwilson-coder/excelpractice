import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver-based scroll reveal.
 * Returns a ref to attach to the target element and a boolean
 * indicating whether it has entered the viewport.
 *
 * @param {number} threshold - Intersection ratio (0–1), default 0.15
 * @param {number} rootMargin - CSS margin string, default "0px 0px -40px 0px"
 * @param {boolean} once - If true, stays visible after first trigger (default true)
 */
export function useScrollReveal(threshold = 0.15, rootMargin = "0px 0px -40px 0px", once = true) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}   