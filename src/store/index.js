import { useMemo } from "react";
import { useStore } from "./useStore";
import { createEvaluator } from "../utils/formulaEngine";

export { useStore };

/** Active sheet object (re-renders only when that sheet changes). */
export const useSheet = () => useStore((s) => s.sheets.find((x) => x.id === s.activeSheetId) || s.sheets[0]);

/** Formula evaluator over all sheets; recomputed lazily when any sheet changes. */
export function useEvaluator() {
  const sheets = useStore((s) => s.sheets);
  return useMemo(() => createEvaluator(sheets), [sheets]);
}
