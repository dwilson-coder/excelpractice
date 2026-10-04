import { useEffect, useCallback } from "react";

/**
 * Global keyboard shortcut hook for the spreadsheet.
 * Binds arrow-key navigation and F2/Enter to start editing.
 *
 * @param {Object} handlers
 * @param {Function} handlers.onArrow - (direction: "up"|"down"|"left"|"right") => void
 * @param {Function} handlers.onEdit  - () => void  (F2 or Enter)
 * @param {Function} handlers.onEscape - () => void (cancel edit)
 * @param {boolean}  enabled          - disable when an input is focused
 */
export function useKeyboard({ onArrow, onEdit, onEscape, enabled = true }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Don't intercept when typing in an input
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          onArrow?.("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          onArrow?.("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          onArrow?.("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          onArrow?.("right");
          break;
        case "Enter":
        case "F2":
          e.preventDefault();
          onEdit?.();
          break;
        case "Escape":
          onEscape?.();
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          onArrow?.("delete");
          break;
        default:
          // Start typing → enter edit mode with the typed character
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onEdit?.(e.key);
          }
          break;
      }
    },
    [enabled, onArrow, onEdit, onEscape]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}   