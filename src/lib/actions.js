/** UI-level actions shared by the menu bar, toolbar, context menu and keyboard shortcuts. */
import { useStore } from "../store/useStore";
import { createEvaluator, colToLetters, rangeToA1 } from "../utils/formulaEngine";
import { formatValue } from "../utils/format";
import { parseDelimited, toDelimited, sniffDelimiter } from "../utils/csv";
import { createWorkbook, key } from "./model";
import * as files from "./files";
import { hasConsent } from "./consent";

const st = () => useStore.getState();

export const focusGrid = () => document.querySelector(".xs-scroll")?.focus({ preventScroll: true });

export function confirmDiscard() {
  const s = st();
  return !s.dirty || window.confirm("You have unsaved changes. Discard them and continue?");
}

export function newWorkbook() {
  if (!confirmDiscard()) return;
  st().replaceWorkbook(createWorkbook(), "Untitled workbook");
}

/** Opens a native file picker. Accepts xlsx / csv / tsv / json / .xpenc. */
export function openFilePicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx,.xlsm,.csv,.tsv,.txt,.json,.xpenc";
  input.onchange = () => input.files?.[0] && openFile(input.files[0]);
  input.click();
}

export async function openFile(file, password) {
  const s = st();
  if (files.needsPassword(file.name) && !password) return s.openDialog("password", { mode: "open", file });
  try {
    const { workbook, warnings, title } = await files.readFile(file, password);
    if (!confirmDiscard()) return;
    s.replaceWorkbook(workbook, title);
    if (password) s.setPassword(password);
    s.toast(`Opened ${file.name}`);
    warnings.slice(0, 4).forEach((w) => s.toast(w, "warn"));
  } catch (e) {
    const wrong = /decrypt|password|operation/i.test(String(e?.message)) || e?.name === "OperationError";
    s.toast(wrong ? "Wrong password, or the file is damaged." : e.message || "Couldn't open that file.", "error");
  }
}

const doc = () => {
  const s = st();
  return { title: s.title, sheets: s.sheets, activeSheetId: s.activeSheetId };
};

export async function saveXlsx() {
  try {
    await files.exportXlsx(doc(), st().title);
    st().markSaved();
  } catch (e) {
    st().toast("Export failed: " + e.message, "error");
  }
}
export const saveCsv = (delimiter = ",") => files.exportCsv(st().sheet(), st().title, delimiter);
export const saveJson = () => files.exportJson(doc(), st().title);
export async function saveEncrypted(password) {
  const pw = password || st().password;
  if (!pw) return st().openDialog("password", { mode: "export" });
  await files.exportEncrypted(doc(), st().title, pw);
  st().toast("Encrypted file saved. Keep the password safe — it can't be recovered.");
}

export function printSheet() {
  st().closeDialog();
  setTimeout(() => window.print(), 50);
}

// ── Clipboard ────────────────────────────────────────────────────────
function selectionText() {
  const s = st();
  const sh = s.sheet();
  const rng = s.range();
  const ev = createEvaluator(s.sheets);
  const rows = [];
  for (let r = rng.r1; r <= rng.r2; r++) {
    const row = [];
    for (let c = rng.c1; c <= rng.c2; c++) row.push(formatValue(ev.value(sh.id, r, c), sh.styles[key(r, c)]));
    rows.push(row);
  }
  return toDelimited(rows, "\t");
}

/** Pass the native clipboard event when there is one (no permission prompt); otherwise uses the async API. */
export function copySelection(cut = false, e) {
  const s = st();
  s.captureClipboard(cut);
  const text = selectionText();
  if (e?.clipboardData) {
    e.clipboardData.setData("text/plain", text);
    e.preventDefault();
  } else navigator.clipboard?.writeText(text).catch(() => s.toast("Couldn't reach the system clipboard; paste inside this sheet still works.", "warn"));
}

export function pasteText(text) {
  const s = st();
  const clip = s.clipboard;
  if (clip) {
    // Our own copy still matches the system clipboard → keep formulas and formatting.
    const same = !text || text.replace(/\r?\n$/, "") === selectionTextFor(clip).replace(/\r?\n$/, "");
    if (same) return s.paste();
  }
  if (!text) return;
  s.pasteGrid(parseDelimited(text.replace(/\r\n/g, "\n").replace(/\n$/, ""), text.includes("\t") ? "\t" : sniffDelimiter(text)));
}

function selectionTextFor(clip) {
  const s = st();
  const sh = s.sheets.find((x) => x.id === clip.sheetId);
  if (!sh) return "";
  const ev = createEvaluator(s.sheets);
  const rows = [];
  for (let r = clip.rng.r1; r <= clip.rng.r2; r++) {
    const row = [];
    for (let c = clip.rng.c1; c <= clip.rng.c2; c++) row.push(formatValue(ev.value(sh.id, r, c), sh.styles[key(r, c)]));
    rows.push(row);
  }
  return toDelimited(rows, "\t");
}

export async function pasteFromClipboard() {
  try {
    pasteText(await navigator.clipboard.readText());
  } catch {
    if (st().clipboard) st().paste();
    else st().toast("Your browser blocked clipboard access — press Ctrl+V instead.", "warn");
  }
}

/** Σ — insert a function over the cells above (or left of) the active cell, or wrap the selection. */
export function autoSum(fn = "SUM") {
  const s = st();
  const sh = s.sheet();
  const rng = s.range();
  const multi = rng.r2 > rng.r1 || rng.c2 > rng.c1;
  const has = (r, c) => (sh.cells[key(r, c)] ?? "") !== "";
  if (multi) {
    // Put the result just below the selection (or right of it for a single row)
    const single = rng.r1 === rng.r2;
    const r = single ? rng.r1 : Math.min(rng.r2 + 1, 99);
    const c = single ? Math.min(rng.c2 + 1, 25) : rng.c1;
    s.writeToTarget(`=${fn}(${rangeToA1(rng)})`, `${colToLetters(c)}${r + 1}`);
    return;
  }
  const { r, c } = rng ? { r: rng.r1, c: rng.c1 } : s.anchor;
  let r1 = r - 1;
  while (r1 >= 0 && has(r1, c)) r1--;
  if (r1 < r - 1) return s.writeToTarget(`=${fn}(${colToLetters(c)}${r1 + 2}:${colToLetters(c)}${r})`, `${colToLetters(c)}${r + 1}`);
  let c1 = c - 1;
  while (c1 >= 0 && has(r, c1)) c1--;
  if (c1 < c - 1) return s.writeToTarget(`=${fn}(${colToLetters(c1 + 1)}${r + 1}:${colToLetters(c - 1)}${r + 1})`, `${colToLetters(c)}${r + 1}`);
  s.startEdit(r, c, { initial: `=${fn}(`, mode: "edit" });
}

export const isAutosaveAllowed = () => hasConsent("functional");
