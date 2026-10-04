import { useCallback } from "react";
import { useStore } from "./useStore";
import { toCellRef } from "../utils";

/**
 * Tracks and manipulates the currently selected cell.
 */
export function useActiveCell() {
  const activeCell = useStore((s) => s.activeCell);
  const setActiveCell = useStore((s) => s.setActiveCell);
  const setEditingCell = useStore((s) => s.setEditingCell);
  const editingCell = useStore((s) => s.editingCell);

  const move = useCallback(
    (dr, dc) => {
      const { row, col } = activeCell;
      const newRow = Math.max(0, Math.min(49, row + dr));
      const newCol = Math.max(0, Math.min(25, col + dc));
      setActiveCell(newRow, newCol);
    },
    [activeCell, setActiveCell]
  );

  const select = useCallback(
    (row, col) => {
      setActiveCell(row, col);
    },
    [setActiveCell]
  );

  const startEdit = useCallback(
    (row, col) => {
      setEditingCell(row, col);
    },
    [setEditingCell]
  );

  const stopEdit = useCallback(() => {
    setEditingCell(null, null);
  }, [setEditingCell]);

  return {
    activeCell,
    cellRef: toCellRef(activeCell.row, activeCell.col),
    editingCell,
    move,
    select,
    startEdit,
    stopEdit,
  };
}   