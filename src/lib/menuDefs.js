/** Menu definitions shared by the menu bar and the right-click menu. */
import { useStore } from "../store/useStore";
import { FONT_FAMILIES, FONT_SIZES } from "../utils/constants";
import { NUMBER_FORMATS } from "../utils/format";
import * as A from "./actions";
import { clearSaved } from "./persist";

export const COLOR_SWATCHES = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#d93025", "#e8710a", "#f5b400", "#217346", "#2f6fdc", "#9334e6",
  "#f4c7c3", "#fce8b2", "#b7e1cd", "#c9daf8", "#d9d2e9", "#fff2cc",
];

const sep = { type: "sep" };
const st = () => useStore.getState();

export function buildMenus(s) {
  const sel = s.range();
  const sh = s.sheet();
  const has = (p) => {
    const x = sh.styles[`${sel.r1},${sel.c1}`];
    return !!x?.[p];
  };
  const cur = sh.styles[`${sel.r1},${sel.c1}`] || {};
  const canUndo = s.past.length > 0;
  const canRedo = s.future.length > 0;

  const align = (ha) => ({ label: ha[0].toUpperCase() + ha.slice(1), checked: cur.ha === ha, run: () => st().setStyle({ ha: cur.ha === ha ? undefined : ha }) });
  const chart = (type, label) => ({ label, run: () => st().openDialog("chart", { type }) });

  return {
    File: [
      { label: "New", hint: "", run: A.newWorkbook },
      { label: "Open…", hint: "Ctrl+O", run: A.openFilePicker },
      sep,
      { label: "Save as Excel (.xlsx)", hint: "Ctrl+S", run: A.saveXlsx },
      {
        label: "Export / download as",
        items: [
          { label: "CSV (current sheet)", run: () => A.saveCsv(",") },
          { label: "TSV (current sheet)", run: () => A.saveCsv("\t") },
          { label: "JSON (all sheets)", run: A.saveJson },
          { label: "Encrypted file (.xpenc)…", run: () => A.saveEncrypted() },
        ],
      },
      sep,
      { label: "Print…", hint: "Ctrl+P", run: A.printSheet },
      { label: "Rename workbook…", run: () => st().openDialog("rename") },
      sep,
      { label: "Privacy & security…", run: () => st().openDialog("privacy") },
    ],
    Edit: [
      { label: "Undo", hint: "Ctrl+Z", disabled: !canUndo, run: () => st().undo() },
      { label: "Redo", hint: "Ctrl+Y", disabled: !canRedo, run: () => st().redo() },
      sep,
      { label: "Cut", hint: "Ctrl+X", run: () => A.copySelection(true) },
      { label: "Copy", hint: "Ctrl+C", run: () => A.copySelection(false) },
      { label: "Paste", hint: "Ctrl+V", run: A.pasteFromClipboard },
      { label: "Paste values only", disabled: !s.clipboard, run: () => st().paste({ valuesOnly: true }) },
      sep,
      {
        label: "Clear",
        items: [
          { label: "Contents", hint: "Del", run: () => st().clearContents() },
          { label: "Formats", run: () => st().clearFormats() },
          { label: "All", run: () => st().clearAll() },
        ],
      },
      { label: "Fill down", hint: "Ctrl+D", run: () => st().fill("down") },
      { label: "Fill right", hint: "Ctrl+R", run: () => st().fill("right") },
      sep,
      { label: "Find…", hint: "Ctrl+F", run: () => st().openDialog("find", { replace: false }) },
      { label: "Find and replace…", hint: "Ctrl+H", run: () => st().openDialog("find", { replace: true }) },
      { label: "Select all", hint: "Ctrl+A", run: () => st().selectAll() },
    ],
    View: [
      { label: "Gridlines", checked: s.view.gridlines, run: () => st().setView({ gridlines: !s.view.gridlines }) },
      { label: "Formula bar", checked: s.view.formulaBar, run: () => st().setView({ formulaBar: !s.view.formulaBar }) },
      { label: "Row & column headings", checked: s.view.headings, run: () => st().setView({ headings: !s.view.headings }) },
      sep,
      { label: "Reset column widths & row heights", run: () => st().resetSizes() },
      { label: "Unhide all rows", run: () => st().unhideAllRows() },
    ],
    Insert: [
      { label: "Row above", run: () => st().insertRows(false) },
      { label: "Row below", run: () => st().insertRows(true) },
      { label: "Column left", run: () => st().insertCols(false) },
      { label: "Column right", run: () => st().insertCols(true) },
      sep,
      { label: "Function…", run: () => st().openDialog("functions") },
      {
        label: "AutoSum",
        items: ["SUM", "AVERAGE", "COUNT", "MAX", "MIN"].map((f) => ({ label: f[0] + f.slice(1).toLowerCase(), run: () => A.autoSum(f) })),
      },
      sep,
      { label: "Chart", items: [chart("bar", "Column / bar"), chart("line", "Line"), chart("area", "Area"), chart("pie", "Pie")] },
      { label: "Pivot table…", run: () => st().openPivot() },
      { label: "New sheet", run: () => st().addSheet() },
    ],
    Format: [
      { label: "Font", items: FONT_FAMILIES.map((f) => ({ label: f, checked: (cur.ff || "Calibri") === f, run: () => st().setStyle({ ff: f === "Calibri" ? undefined : f }) })) },
      { label: "Font size", items: FONT_SIZES.map((n) => ({ label: String(n), checked: (cur.fs || 11) === n, run: () => st().setStyle({ fs: n === 11 ? undefined : n }) })) },
      sep,
      { label: "Bold", hint: "Ctrl+B", checked: has("b"), run: () => st().toggleStyle("b") },
      { label: "Italic", hint: "Ctrl+I", checked: has("i"), run: () => st().toggleStyle("i") },
      { label: "Underline", hint: "Ctrl+U", checked: has("u"), run: () => st().toggleStyle("u") },
      { label: "Strikethrough", checked: has("s"), run: () => st().toggleStyle("s") },
      { label: "Text color", swatches: (c) => st().setStyle({ color: c || undefined }) },
      { label: "Fill color", swatches: (c) => st().setStyle({ bg: c || undefined }) },
      sep,
      { label: "Number format", items: [...NUMBER_FORMATS.map((f) => ({ label: f.label, hint: f.example, checked: (cur.nf || "general") === f.id, run: () => st().setNumberFormat(f.id) })), sep, { label: "More options…", hint: "Ctrl+1", run: () => st().openDialog("numberFormat") }] },
      { label: "Align", items: [align("left"), align("center"), align("right")] },
      { label: "Wrap text", checked: has("wrap"), run: () => st().toggleStyle("wrap") },
      {
        label: "Borders",
        items: [["all", "All borders"], ["outline", "Outside borders"], ["bottom", "Bottom border"], ["top", "Top border"], ["none", "No border"]].map(([m, l]) => ({ label: l, run: () => st().setBorders(m) })),
      },
      sep,
      { label: "Column width…", run: () => st().openDialog("size", { kind: "col" }) },
      { label: "Row height…", run: () => st().openDialog("size", { kind: "row" }) },
      { label: "Auto-fit column width", run: () => st().autoFitColumn(sel.c1) },
      { label: "Hide rows", run: () => st().hideRows(true) },
      sep,
      { label: "Conditional formatting…", run: () => st().openDialog("cf") },
      { label: "Clear formatting", run: () => st().clearFormats() },
    ],
    Data: [
      { label: "Sort A → Z", run: () => st().sortSelection(true) },
      { label: "Sort Z → A", run: () => st().sortSelection(false) },
      { label: "Remove duplicates", run: () => st().removeDuplicates() },
      { label: "Trim extra spaces", run: () => st().trimSelection() },
      sep,
      { label: "Data validation…", run: () => st().openDialog("validation") },
      { label: "Conditional formatting…", run: () => st().openDialog("cf") },
      sep,
      { label: "Pivot table…", run: () => st().openPivot() },
      { label: "Create chart…", run: () => st().openDialog("chart") },
    ],
    Tools: [
      { label: "Insert function…", run: () => st().openDialog("functions") },
      { label: "Find and replace…", hint: "Ctrl+H", run: () => st().openDialog("find", { replace: true }) },
      sep,
      { label: "Encrypt this workbook (password)…", run: () => st().openDialog("privacy") },
      { label: "Clear data saved in this browser", run: () => { if (window.confirm("Delete the workbook autosaved in this browser?")) { clearSaved(); st().toast("Saved browser data cleared."); } } },
      { label: "Cookie settings…", run: () => window.dispatchEvent(new CustomEvent("xp-open-cookie-settings")) },
    ],
    Help: [
      { label: "Keyboard shortcuts", run: () => st().openDialog("shortcuts") },
      { label: "Function reference", run: () => window.open("/about", "_blank", "noopener") },
      { label: "Privacy policy", run: () => window.open("/privacy", "_blank", "noopener") },
      { label: "Terms of service", run: () => window.open("/terms", "_blank", "noopener") },
    ],
  };
}

export function contextItems(s, kind) {
  const base = [
    { label: "Cut", hint: "Ctrl+X", run: () => A.copySelection(true) },
    { label: "Copy", hint: "Ctrl+C", run: () => A.copySelection(false) },
    { label: "Paste", hint: "Ctrl+V", run: A.pasteFromClipboard },
    { label: "Paste values only", disabled: !s.clipboard, run: () => st().paste({ valuesOnly: true }) },
    sep,
  ];
  if (kind === "col")
    return [...base, { label: "Insert column left", run: () => st().insertCols(false) }, { label: "Insert column right", run: () => st().insertCols(true) }, { label: "Delete column(s)", run: () => st().deleteCols() }, { label: "Column width…", run: () => st().openDialog("size", { kind: "col" }) }, { label: "Auto-fit width", run: () => st().autoFitColumn(s.range().c1) }, sep, { label: "Clear contents", run: () => st().clearContents() }];
  if (kind === "row")
    return [...base, { label: "Insert row above", run: () => st().insertRows(false) }, { label: "Insert row below", run: () => st().insertRows(true) }, { label: "Delete row(s)", run: () => st().deleteRows() }, { label: "Row height…", run: () => st().openDialog("size", { kind: "row" }) }, { label: "Hide row(s)", run: () => st().hideRows(true) }, { label: "Unhide all rows", run: () => st().unhideAllRows() }, sep, { label: "Clear contents", run: () => st().clearContents() }];
  return [
    ...base,
    { label: "Insert row above", run: () => st().insertRows(false) },
    { label: "Insert column left", run: () => st().insertCols(false) },
    { label: "Delete row(s)", run: () => st().deleteRows() },
    { label: "Delete column(s)", run: () => st().deleteCols() },
    sep,
    { label: "Clear contents", hint: "Del", run: () => st().clearContents() },
    { label: "Sort A → Z", run: () => st().sortSelection(true) },
    { label: "Sort Z → A", run: () => st().sortSelection(false) },
    sep,
    { label: "Format cells…", hint: "Ctrl+1", run: () => st().openDialog("numberFormat") },
    { label: "Data validation…", run: () => st().openDialog("validation") },
    { label: "Create chart…", run: () => st().openDialog("chart") },
  ];
}
