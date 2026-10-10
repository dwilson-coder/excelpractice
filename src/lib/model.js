/**
 * Workbook data model (plain JSON → trivially undo-able, savable and encryptable).
 * sheet = { id, name, cells:{"r,c":raw}, styles:{"r,c":{b,i,u,s,ff,fs,color,bg,ha,wrap,nf,dec,bd}},
 *           colWidths, rowHeights, hiddenRows, validations[], cf[], charts[] }
 */
import { ROWS, COLS } from "../utils/constants";

let idCounter = 1;
export const newId = () => `${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function createSheet(name) {
  return { id: newId(), name, cells: {}, styles: {}, colWidths: {}, rowHeights: {}, hiddenRows: {}, validations: [], cf: [], charts: [] };
}

export function createWorkbook() {
  const sheet = createSheet("Sheet1");
  return { sheets: [sheet], activeSheetId: sheet.id };
}

export const key = (r, c) => `${r},${c}`;
export const unkey = (k) => k.split(",").map(Number);

export function normalizeSheet(s) {
  const base = createSheet(s?.name || "Sheet");
  return { ...base, ...s, id: s?.id ?? base.id };
}

export function normalizeWorkbook(wb) {
  const sheets = (wb?.sheets?.length ? wb.sheets : [createSheet("Sheet1")]).map(normalizeSheet);
  const active = sheets.find((s) => s.id === wb?.activeSheetId) ? wb.activeSheetId : sheets[0].id;
  return { sheets, activeSheetId: active };
}

/** Highest used row/col (0-based inclusive) or null when empty. */
export function usedRange(sheet) {
  let r2 = -1;
  let c2 = -1;
  for (const k of Object.keys(sheet.cells)) {
    if (sheet.cells[k] === "" || sheet.cells[k] == null) continue;
    const [r, c] = unkey(k);
    if (r > r2) r2 = r;
    if (c > c2) c2 = c;
  }
  return r2 < 0 ? null : { r1: 0, c1: 0, r2: Math.min(r2, ROWS - 1), c2: Math.min(c2, COLS - 1) };
}

export function uniqueSheetName(sheets, base = "Sheet") {
  const names = new Set(sheets.map((s) => s.name.toLowerCase()));
  let n = sheets.length + 1;
  while (names.has(`${base}${n}`.toLowerCase())) n++;
  return `${base}${n}`;
}
