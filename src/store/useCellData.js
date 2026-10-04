import { useCallback } from "react";
import { useStore } from "./useStore";
import { evaluateFormula } from "../utils";

/**
 * Hook that reads/writes cell data and auto-evaluates formulas.
 * Call inside a component that renders the spreadsheet.
 */
export function useCellData() {
  const sheets = useStore((s) => s.sheets);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const setCell = useStore((s) => s.setCell);
  const activeCell = useStore((s) => s.activeCell);

  const sheet = sheets.find((s) => s.id === activeSheetId);

  /**
   * Write a raw value to a cell.
   * If it starts with "=", evaluate the formula against the current grid
   * and store the result; store the formula string separately for display.
   */
  const writeCell = useCallback(
    (row, col, rawValue) => {
      if (rawValue.startsWith("=")) {
        try {
          const result = evaluateFormula(rawValue, sheet.grid);
          setCell(row, col, String(result));
        } catch {
          setCell(row, col, "#ERROR");
        }
      } else {
        setCell(row, col, rawValue);
      }
    },
    [sheet, setCell]
  );

  /**
   * Read the display value of a cell.
   * If the stored value looks like a formula result, return it.
   */
  const readCell = useCallback(
    (row, col) => sheet.grid[row]?.[col] ?? "",
    [sheet]
  );

  return {
    grid: sheet.grid,
    activeCell,
    writeCell,
    readCell,
  };
}   