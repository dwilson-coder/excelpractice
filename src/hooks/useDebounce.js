import { useState, useEffect } from "react";

/**
 * Returns a debounced version of a changing value.
 * Useful for formula-bar live preview or search inputs.
 *
 * @param {*} value - the value to debounce
 * @param {number} delay - ms to wait (default 300)
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}   