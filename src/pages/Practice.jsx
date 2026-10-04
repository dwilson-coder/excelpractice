import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  Sigma,
  Table2,
  Filter,
  ArrowDownAZ,
  ArrowUpAZ,
  Plus,
  Trash2,
  Settings,
} from "lucide-react";
import { useCellData } from "../store/useCellData";
import { useActiveCell } from "../store/useActiveCell";
import { useSheet } from "../store/useSheet";
import { usePivot } from "../store/usePivot";
import { useStore } from "../store/useStore";
import { toCellRef } from "../utils";
import Ribbon from "../components/Ribbon/Ribbon";
import SheetTabs from "../components/SheetTabs/SheetTabs";
import PivotPanel from "../components/PivotTable/PivotConfig";

const RIBBON_TABS = [
  { id: "Home", icon: null },
  { id: "Formulas", icon: Sigma },
  { id: "Data", icon: Table2 },
];

const RIBBON_BUTTONS = {
  Home: [
    { icon: Bold, label: "Bold", action: "bold" },
    { icon: Italic, label: "Italic", action: "italic" },
    { icon: Underline, label: "Underline", action: "underline" },
    { icon: Filter, label: "Filter", action: "filter" },
    { icon: ArrowDownAZ, label: "Sort A-Z", action: "sortAsc" },
    { icon: ArrowUpAZ, label: "Sort Z-A", action: "sortDesc" },
  ],
  Formulas: [
    { icon: Sigma, label: "Sum", action: "insertSum" },
    { icon: Table2, label: "VLOOKUP", action: "insertVlookup" },
    { icon: Table2, label: "XLOOKUP", action: "insertXlookup" },
    { icon: Settings, label: "Pivot", action: "openPivot" },
  ],
  Data: [
    { icon: Plus, label: "Add Sheet", action: "addSheet" },
    { icon: Trash2, label: "Clear", action: "clearCell" },
  ],
};

export default function Practice() {
  const { grid, writeCell } = useCellData();
  const { activeCell, cellRef, select, startEdit, editingCell, stopEdit } =
    useActiveCell();
  const { sheets, activeSheetId, addSheet, switchSheet, removeSheet } =
    useSheet();
  const { isOpen: pivotOpen, openPivot, closePivot } = usePivot();
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef(null);

  const activeRibbonTab = useStore((s) => s.activeRibbonTab);
  const setActiveRibbonTab = useStore((s) => s.setActiveRibbonTab);
  const setCell = useStore((s) => s.setCell);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e) => {
      if (editingCell) return; // let input handle keys while editing

      const moves = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };

      if (moves[e.key]) {
        e.preventDefault();
        const [dr, dc] = moves[e.key];
        const nr = Math.max(0, Math.min(49, activeCell.row + dr));
        const nc = Math.max(0, Math.min(25, activeCell.col + dc));
        select(nr, nc);
      } else if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        startEdit(activeCell.row, activeCell.col);
      }
    },
    [activeCell, select, startEdit, editingCell]
  );

  // ── Commit edit ──
  const commitEdit = useCallback(() => {
    if (editingCell) {
      writeCell(editingCell.row, editingCell.col, editingValue);
      stopEdit();
    }
  }, [editingCell, editingValue, writeCell, stopEdit]);

  // ── Ribbon action handler ──
  const handleRibbonAction = useCallback(
    (action) => {
      switch (action) {
        case "insertSum":
          writeCell(activeCell.row, activeCell.col, `=SUM(${toCellRef(activeCell.row, activeCell.col)}:${toCellRef(activeCell.row + 10, activeCell.col)})`);
          break;
        case "insertVlookup":
          writeCell(activeCell.row, activeCell.col, `=VLOOKUP(,A1:D10,2,FALSE)`);
          break;
        case "insertXlookup":
          writeCell(activeCell.row, activeCell.col, `=XLOOKUP(,A1:A10,D1:D10,"Not Found")`);
          break;
        case "openPivot":
          openPivot();
          break;
        case "addSheet":
          addSheet();
          break;
        case "clearCell":
          setCell(activeCell.row, activeCell.col, "");
          break;
        default:
          break;
      }
    },
    [activeCell, writeCell, openPivot, addSheet, setCell]
  );

  // ── Convert grid to object array (for pivot) ──
  const gridToObjects = useCallback(() => {
    if (!grid.length || !grid[0]?.length) return [];
    const headers = grid[0].filter((h) => h !== "");
    return grid
      .slice(1)
      .filter((row) => row.some((c) => c !== ""))
      .map((row) =>
        Object.fromEntries(
          headers.map((h, i) => [h.toLowerCase(), row[i] ?? ""])
        )
      );
  }, [grid]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* ── Ribbon ── */}
      <Ribbon
        tabs={RIBBON_TABS}
        activeTab={activeRibbonTab}
        onTabChange={setActiveRibbonTab}
        buttons={RIBBON_BUTTONS[activeRibbonTab] || []}
        onAction={handleRibbonAction}
      />

      {/* ── Formula Bar ── */}
      <div className="formula-bar">
        <span className="fx">fx</span>
        <span className="text-gray-500 font-mono text-xs min-w-[3rem]">
          {cellRef}
        </span>
        <input
          key={`${activeCell.row}-${activeCell.col}`}
          defaultValue={grid[activeCell.row]?.[activeCell.col] || ""}
          placeholder="Enter a value or formula…"
          onBlur={(e) => writeCell(activeCell.row, activeCell.col, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.target.blur();
            if (e.key === "Escape") {
              e.target.value = grid[activeCell.row]?.[activeCell.col] || "";
              e.target.blur();
            }
          }}
        />
      </div>

      {/* ── Spreadsheet Grid ── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="inline-block min-w-full">
          <table className="border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Column Headers */}
            <thead>
              <tr>
                <th className="cell bg-gray-100 font-medium text-gray-500 w-12 text-center sticky left-0 z-10">
                  &nbsp;
                </th>
                {grid[0] &&
                  Array.from({ length: grid[0].length }, (_, c) => (
                    <th
                      key={c}
                      className={`cell font-medium text-gray-600 text-center cursor-pointer hover:bg-excel-green-light transition-colors ${
                        activeCell.col === c ? "bg-excel-green text-white" : ""
                      }`}
                      onClick={() => select(0, c)}
                    >
                      {toCellRef(0, c).replace(/\d/g, "")}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  {/* Row Header */}
                  <td
                    className={`cell font-medium text-gray-500 text-center cursor-pointer sticky left-0 z-10 bg-gray-100 hover:bg-excel-green-light transition-colors ${
                      activeCell.row === r ? "bg-excel-green text-white" : ""
                    }`}
                    onClick={() => select(r, 0)}
                  >
                    {r + 1}
                  </td>
                  {/* Cells */}
                  {row.map((cellVal, c) => {
                    const isActive =
                      activeCell.row === r && activeCell.col === c;
                    const isEditing =
                      editingCell?.row === r && editingCell?.col === c;

                    return (
                      <td
                        key={c}
                        className={`cell cursor-pointer ${
                          isActive ? "active" : ""
                        } ${isEditing ? "cell-editing" : ""}`}
                        onClick={() => select(r, c)}
                        onDoubleClick={() => {
                          setEditingValue(cellVal);
                          startEdit(r, c);
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") stopEdit();
                            }}
                          />
                        ) : (
                          <span className="block truncate">{cellVal}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sheet Tabs ── */}
      <SheetTabs
        sheets={sheets}
        activeSheetId={activeSheetId}
        onSwitch={switchSheet}
        onAdd={addSheet}
        onRemove={removeSheet}
      />

      {/* ── Pivot Panel (slide-over) ── */}
      <AnimatePresence>
        {pivotOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-gray-200"
          >
            <PivotPanel
              data={gridToObjects()}
              onClose={closePivot}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}   