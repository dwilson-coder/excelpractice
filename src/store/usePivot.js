import { useCallback } from "react";
import { useStore } from "./useStore";
import { buildPivot, getUniqueValues } from "../utils";

/**
 * Hook for the pivot table panel: config, build, results.
 */
export function usePivot() {
  const pivot = useStore((s) => s.pivot);
  const setPivotConfig = useStore((s) => s.setPivotConfig);
  const setPivotResults = useStore((s) => s.setPivotResults);
  const openPivot = useStore((s) => s.openPivot);
  const closePivot = useStore((s) => s.closePivot);

  /**
   * Build the pivot from the active sheet's grid.
   * Assumes row 0 is the header row.
   */
  const build = useCallback(
    (data) => {
      const results = buildPivot(data, pivot.config);
      setPivotResults(results);
    },
    [pivot.config, setPivotResults]
  );

  /**
   * Get unique values for a given column name (for dropdowns).
   */
  const getFields = useCallback(
    (data) => {
      if (!data?.length) return [];
      return Object.keys(data[0]);
    },
    []
  );

  const getUnique = useCallback(
    (data, field) => getUniqueValues(data, field),
    []
  );

  return {
    ...pivot,
    openPivot,
    closePivot,
    setPivotConfig,
    build,
    getFields,
    getUnique,
  };
}   