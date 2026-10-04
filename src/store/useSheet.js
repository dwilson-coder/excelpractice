import { useStore } from "./useStore";

/**
 * Hook for managing sheets: list, switch, add, remove, rename.
 */
export function useSheet() {
  const sheets = useStore((s) => s.sheets);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const addSheet = useStore((s) => s.addSheet);
  const removeSheet = useStore((s) => s.removeSheet);
  const renameSheet = useStore((s) => s.renameSheet);
  const switchSheet = useStore((s) => s.switchSheet);

  const activeSheet = sheets.find((s) => s.id === activeSheetId);

  return {
    sheets,
    activeSheet,
    activeSheetId,
    addSheet,
    removeSheet,
    renameSheet,
    switchSheet,
  };
}   