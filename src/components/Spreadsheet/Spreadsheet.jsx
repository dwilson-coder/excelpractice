import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useCellData } from "../../store/useCellData";
import { useActiveCell } from "../../store/useActiveCell";
import { useKeyboard } from "../../hooks/useKeyboard";
import { toCellRef } from "../../utils";
import ColumnHeader from "./ColumnHeader";
import RowHeader from "./RowHeader";
import Cell from "./Cell";
import FormulaBar from "./FormulaBar";

const ROWS = 50;
const COLS = 26;

/**
 * Main spreadsheet grid: column headers, row headers, cells,
 * keyboard navigation, and formula bar.
 */
export default function Spreadsheet() {
  const { grid, writeCell } = useCellData();
  const { activeCell, cellRef, select, startEdit, stopEdit, editingCell } =
    useActiveCell();
  const containerRef = useRef(null);

  // ── Keyboard navigation ──
  useKeyboard({
    onArrow: (dir) => {
      const map = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
      if (map[dir]) {
        const [dr, dc] = map[dir];
        const nr = Math.max(0, Math.min(ROWS - 1, activeCell.row + dr));
        const nc = Math.max(0, Math.min(COLS - 1, activeCell.col + dc));
        select(nr, nc);
      }
    },
    onEdit: (char) => {
      startEdit(activeCell.row, activeCell.col, char);
    },
    onEscape: stopEdit,
    enabled: !editingCell,
  });

  // ── Scroll active cell into view ──
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-cell="${activeCell.row}-${activeCell.col}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeCell]);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* ── Formula Bar ── */}
      <FormulaBar
        cellRef={cellRef}
        value={grid[activeCell.row]?.[activeCell.col] || ""}
        onChange={(val) => writeCell(activeCell.row, activeCell.col, val)}
      />

      {/* ── Grid ── */}
      <div className="flex-1 overflow-auto relative">
        <table className="border-collapse select-none">
          {/* ── Column Headers ── */}
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Corner cell */}
              <th className="cell bg-gray-200 border border-gray-300 w-12 min-w-[3rem] sticky left-0 z-30" />
              <ColumnHeader
                cols={COLS}
                activeCol={activeCell.col}
                onSelect={(c) => select(0, c)}
              />
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <RowHeader
                  row={r}
                  active={activeCell.row === r}
                  onSelect={() => select(r, activeCell.col)}
                />
                {Array.from({ length: COLS }, (_, c) => (
                  <Cell
                    key={c}
                    row={r}
                    col={c}
                    value={grid[r]?.[c] || ""}
                    isActive={activeCell.row === r && activeCell.col === c}
                    isEditing={editingCell?.row === r && editingCell?.col === c}
                    onSelect={() => select(r, c)}
                    onEdit={(char) => startEdit(r, c, char)}
                    onCommit={(val) => writeCell(r, c, val)}
                    onCancel={stopEdit}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}   