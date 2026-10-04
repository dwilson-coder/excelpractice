import { create } from "zustand";

// ─── Helpers ─────────────────────────────────────────────────────────
const ROWS = 50;
const COLS = 26; // A–Z

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

let sheetIdCounter = 1;

function createSheet(name) {
  return {
    id: sheetIdCounter++,
    name,
    grid: createEmptyGrid(),
  };
}

// ─── Store ───────────────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // ── State ──
  sheets: [createSheet("Sheet1")],
  activeSheetId: 1,
  activeCell: { row: 0, col: 0 },
  editingCell: null, // { row, col } | null
  formulaBarValue: "",
  activeRibbonTab: "Home",
  pivot: {
    isOpen: false,
    config: { rows: "", columns: "", values: "", agg: "SUM" },
    results: null, // { headers, rows, grandRow }
  },

  // ── Sheet Actions ──
  addSheet: () => {
    const name = `Sheet${get().sheets.length + 1}`;
    const sheet = createSheet(name);
    set((s) => ({
      sheets: [...s.sheets, sheet],
      activeSheetId: sheet.id,
      activeCell: { row: 0, col: 0 },
      formulaBarValue: "",
    }));
  },

  removeSheet: (id) => {
    const { sheets, activeSheetId } = get();
    if (sheets.length <= 1) return; // can't remove last sheet
    const filtered = sheets.filter((s) => s.id !== id);
    set({
      sheets: filtered,
      activeSheetId:
        activeSheetId === id ? filtered[0].id : activeSheetId,
    });
  },

  renameSheet: (id, name) => {
    set((s) => ({
      sheets: s.sheets.map((sh) =>
        sh.id === id ? { ...sh, name } : sh
      ),
    }));
  },

  switchSheet: (id) => {
    set({
      activeSheetId: id,
      activeCell: { row: 0, col: 0 },
      formulaBarValue: "",
      editingCell: null,
    });
  },

  // ── Cell Actions ──
  setActiveCell: (row, col) => {
    const { sheets, activeSheetId } = get();
    const sheet = sheets.find((s) => s.id === activeSheetId);
    set({
      activeCell: { row, col },
      formulaBarValue: sheet.grid[row]?.[col] || "",
    });
  },

  setCell: (row, col, value) => {
    set((s) => ({
      sheets: s.sheets.map((sh) => {
        if (sh.id !== s.activeSheetId) return sh;
        const grid = sh.grid.map((r) => [...r]);
        grid[row][col] = value;
        return { ...sh, grid };
      }),
      formulaBarValue: value,
    }));
  },

  setEditingCell: (row, col) => {
    set({ editingCell: row !== null ? { row, col } : null });
  },

  setFormulaBarValue: (value) => {
    set({ formulaBarValue: value });
  },

  // ── Ribbon ──
  setActiveRibbonTab: (tab) => {
    set({ activeRibbonTab: tab });
  },

  // ── Pivot Table ──
  openPivot: () => {
    set((s) => ({ pivot: { ...s.pivot, isOpen: true } }));
  },

  closePivot: () => {
    set((s) => ({ pivot: { ...s.pivot, isOpen: false, results: null } }));
  },

  setPivotConfig: (partial) => {
    set((s) => ({
      pivot: { ...s.pivot, config: { ...s.pivot.config, ...partial } },
    }));
  },

  setPivotResults: (results) => {
    set((s) => ({ pivot: { ...s.pivot, results } }));
  },

  // ── Derived (computed on the fly) ──
  getActiveSheet: () => {
    const { sheets, activeSheetId } = get();
    return sheets.find((s) => s.id === activeSheetId);
  },
}));   