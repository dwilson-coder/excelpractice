import { create } from "zustand";
import { ROWS, COLS, MIN_COL_WIDTH, MIN_ROW_HEIGHT } from "../utils/constants";
import { createEvaluator, shiftFormula, parseRangeRef, rangeToA1, isError } from "../utils/formulaEngine";
import { formatValue } from "../utils/format";
import { buildPivot } from "../utils/pivot";
import { createSheet, createWorkbook, normalizeWorkbook, uniqueSheetName, newId, key } from "../lib/model";
import * as ops from "../lib/ops";
import { validate } from "../lib/rules";
import { loadSettings, saveSettings } from "../lib/persist";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const snap = (s) => ({ sheets: s.sheets, activeSheetId: s.activeSheetId });
const active = (s) => s.sheets.find((x) => x.id === s.activeSheetId) || s.sheets[0];
const hist = (s, extra) => ({ past: [...s.past.slice(-199), snap(s)], future: [], dirty: true, ...extra });
const selRange = (s) => ops.normRange(s.anchor, s.focus);
const isF = (v) => typeof v === "string" && v[0] === "=";
let toastId = 1;
let pendingSnap = null;

const initial = createWorkbook();

export const useStore = create((set, get) => ({
  title: "Untitled workbook",
  sheets: initial.sheets,
  activeSheetId: initial.activeSheetId,
  past: [],
  future: [],
  dirty: false,
  anchor: { r: 0, c: 0 },
  focus: { r: 0, c: 0 },
  editing: null, // { r, c, value, mode:'enter'|'edit', source:'cell'|'bar', caret, point:{start,len}|null }
  clipboard: null, // { snap, rng, sheetId, cut }
  dialog: null, // { name, props }
  toasts: [],
  view: { gridlines: true, formulaBar: true, headings: true, ...loadSettings() },
  pivot: { open: false, config: { rows: "", columns: "", values: "", agg: "SUM" }, results: null },
  password: null, // in-memory only; never persisted
  autosaved: "none", // none | plain | enc | off | paused
  findHits: [],
  findIndex: -1,

  // ── Derived helpers ────────────────────────────────────────────────
  sheet: () => active(get()),
  range: () => selRange(get()),

  // ── UI ─────────────────────────────────────────────────────────────
  toast: (message, kind = "info") => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === "error" ? 6000 : 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openDialog: (name, props = {}) => set({ dialog: { name, props } }),
  closeDialog: () => {
    set({ dialog: null });
    setTimeout(() => document.querySelector(".xs-scroll")?.focus({ preventScroll: true }), 0);
  },
  setView: (patch) => {
    set((s) => ({ view: { ...s.view, ...patch } }));
    saveSettings(get().view);
  },
  setTitle: (title) => set({ title, dirty: true }),
  setPassword: (password) => set({ password: password || null }),

  // ── History ────────────────────────────────────────────────────────
  mutate: (fn) =>
    set((s) => {
      const sh = active(s);
      const next = fn(sh, s);
      if (!next || next === sh) return {};
      return hist(s, { sheets: s.sheets.map((x) => (x.id === sh.id ? next : x)) });
    }),
  mutateSheets: (fn, extra = {}) =>
    set((s) => {
      const res = fn(s.sheets, s);
      if (!res) return {};
      return hist(s, { sheets: res.sheets, activeSheetId: res.activeSheetId ?? s.activeSheetId, ...extra });
    }),
  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const prev = s.past[s.past.length - 1];
      const activeSheetId = prev.sheets.some((x) => x.id === prev.activeSheetId) ? prev.activeSheetId : prev.sheets[0].id;
      return { sheets: prev.sheets, activeSheetId, past: s.past.slice(0, -1), future: [snap(s), ...s.future], editing: null, dirty: true };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const next = s.future[0];
      return { sheets: next.sheets, activeSheetId: next.activeSheetId, past: [...s.past, snap(s)], future: s.future.slice(1), editing: null, dirty: true };
    }),
  beginTransient: () => {
    pendingSnap = snap(get());
  },
  patchSheetLive: (fn) => set((s) => ({ sheets: s.sheets.map((x) => (x.id === s.activeSheetId ? fn(x) : x)) })),
  endTransient: () => {
    const prev = pendingSnap;
    pendingSnap = null;
    if (!prev) return;
    set((s) => (prev.sheets === s.sheets ? {} : { past: [...s.past.slice(-199), prev], future: [], dirty: true }));
  },
  replaceWorkbook: (wb, title) => {
    const n = normalizeWorkbook(wb);
    set({ ...n, title: title || "Untitled workbook", past: [], future: [], dirty: false, anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 }, editing: null, clipboard: null, findHits: [], findIndex: -1, pivot: { ...get().pivot, results: null } });
  },
  markSaved: () => set({ dirty: false }),

  // ── Sheets ─────────────────────────────────────────────────────────
  switchSheet: (id) => set((s) => (s.sheets.some((x) => x.id === id) ? { activeSheetId: id, editing: null, anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 }, findHits: [], findIndex: -1, pivot: { ...s.pivot, results: null } } : {})),
  addSheet: () => {
    const sh = createSheet(uniqueSheetName(get().sheets));
    get().mutateSheets((sheets) => ({ sheets: [...sheets, sh], activeSheetId: sh.id }), { editing: null, anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 } });
  },
  duplicateSheet: (id) => {
    const src = get().sheets.find((x) => x.id === id);
    if (!src) return;
    const copy = { ...JSON.parse(JSON.stringify(src)), id: newId(), name: uniqueSheetName(get().sheets, src.name + " ") };
    copy.charts = copy.charts.map((c) => ({ ...c, id: newId() }));
    get().mutateSheets((sheets) => ({ sheets: [...sheets, copy], activeSheetId: copy.id }), { editing: null });
  },
  removeSheet: (id) => {
    if (get().sheets.length <= 1) return get().toast("A workbook needs at least one sheet.", "error");
    get().mutateSheets((sheets, s) => {
      const out = sheets.filter((x) => x.id !== id);
      return { sheets: out, activeSheetId: s.activeSheetId === id ? out[0].id : s.activeSheetId };
    }, { editing: null });
  },
  renameSheet: (id, name) => {
    const clean = name.trim().replace(/[\\/?*[\]:]/g, "");
    const { sheets } = get();
    const old = sheets.find((x) => x.id === id);
    if (!old || !clean || clean === old.name) return;
    if (sheets.some((x) => x.id !== id && x.name.toLowerCase() === clean.toLowerCase())) return get().toast(`A sheet named "${clean}" already exists.`, "error");
    const esc = old.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^A-Za-z0-9_'])('${esc.replace(/'/g, "''")}'|${esc})!`, "gi");
    const quoted = /^[A-Za-z_][A-Za-z0-9_]*$/.test(clean) ? clean : `'${clean.replace(/'/g, "''")}'`;
    get().mutateSheets((list) => ({
      sheets: list.map((x) => {
        const cells = {};
        for (const [k, v] of Object.entries(x.cells)) cells[k] = isF(v) ? v.replace(re, (_, p) => `${p}${quoted}!`) : v;
        return x.id === id ? { ...x, name: clean, cells } : { ...x, cells };
      }),
    }));
  },
  moveSheet: (id, dir) =>
    get().mutateSheets((sheets) => {
      const i = sheets.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sheets.length) return null;
      const out = [...sheets];
      [out[i], out[j]] = [out[j], out[i]];
      return { sheets: out };
    }),

  // ── Selection ──────────────────────────────────────────────────────
  select: (r, c, { extend = false } = {}) =>
    set((s) => {
      const p = { r: clamp(r, 0, ROWS - 1), c: clamp(c, 0, COLS - 1) };
      return extend ? { focus: p } : { anchor: p, focus: p };
    }),
  selectRange: (a, b) => set({ anchor: a, focus: b }),
  selectRow: (r, extend) => set((s) => ({ anchor: extend ? { r: s.anchor.r, c: 0 } : { r, c: 0 }, focus: { r, c: COLS - 1 } })),
  selectCol: (c, extend) => set((s) => ({ anchor: extend ? { r: 0, c: s.anchor.c } : { r: 0, c }, focus: { r: ROWS - 1, c } })),
  selectAll: () => set({ anchor: { r: 0, c: 0 }, focus: { r: ROWS - 1, c: COLS - 1 } }),
  moveActive: (dr, dc, { extend = false, jump = false } = {}) =>
    set((s) => {
      const from = extend ? s.focus : s.anchor;
      let { r, c } = from;
      if (jump) {
        const sh = active(s);
        const has = (rr, cc) => (sh.cells[key(rr, cc)] ?? "") !== "";
        const inb = (rr, cc) => rr >= 0 && cc >= 0 && rr < ROWS && cc < COLS;
        let nr = r + dr;
        let nc = c + dc;
        if (inb(nr, nc) && has(r, c) && has(nr, nc)) {
          while (inb(nr + dr, nc + dc) && has(nr + dr, nc + dc)) {
            nr += dr;
            nc += dc;
          }
        } else {
          while (inb(nr, nc) && !has(nr, nc)) {
            nr += dr;
            nc += dc;
          }
          if (!inb(nr, nc)) {
            nr = clamp(nr, 0, ROWS - 1);
            nc = clamp(nc, 0, COLS - 1);
          }
        }
        r = nr;
        c = nc;
      } else {
        r += dr;
        c += dc;
      }
      const p = { r: clamp(r, 0, ROWS - 1), c: clamp(c, 0, COLS - 1) };
      return extend ? { focus: p } : { anchor: p, focus: p };
    }),

  // ── Editing ────────────────────────────────────────────────────────
  startEdit: (r, c, { initial: ini, mode, source = "cell" } = {}) => {
    const s = get();
    const raw = active(s).cells[key(r, c)] ?? "";
    const value = ini !== undefined ? ini : String(raw);
    set({ editing: { r, c, value, mode: mode || (ini !== undefined ? "enter" : "edit"), source, caret: value.length, point: null } });
  },
  setEditValue: (value, caret) => set((s) => (s.editing ? { editing: { ...s.editing, value, caret: caret ?? value.length, point: null } } : {})),
  setEditCaret: (caret) => set((s) => (s.editing ? { editing: { ...s.editing, caret } } : {})),
  setEditMode: (mode) => set((s) => (s.editing ? { editing: { ...s.editing, mode } } : {})),
  setEditSource: (source) => set((s) => (s.editing && s.editing.source !== source ? { editing: { ...s.editing, source } } : {})),
  cancelEdit: () => set({ editing: null }),
  writeCell: (r, c, raw) => {
    const err = validate(active(get()), r, c, raw);
    if (err) {
      get().toast(err, "error");
      return err;
    }
    get().mutate((sh) => ops.setCells(sh, [[r, c, raw]]));
    return null;
  },
  commitEdit: ({ dr = 0, dc = 0 } = {}) => {
    const e = get().editing;
    if (!e) return null;
    const err = get().writeCell(e.r, e.c, e.value);
    if (err) return err;
    set({ editing: null });
    if (dr || dc) {
      set({ anchor: { r: e.r, c: e.c }, focus: { r: e.r, c: e.c } });
      get().moveActive(dr, dc);
    }
    return null;
  },
  /** Run the formula bar text and put the result into a user-chosen cell or range. */
  writeToTarget: (text, target) => {
    const rng = parseRangeRef(String(target || "").trim().replace(/\$/g, ""));
    if (!rng || rng.r1 < 0 || rng.c1 < 0 || rng.r2 >= ROWS || rng.c2 >= COLS) {
      get().toast(`"${target}" isn't a valid cell on this sheet (A1:Z${ROWS}).`, "error");
      return false;
    }
    let raw = text.trim();
    if (!raw) return false;
    if (!isF(raw) && Number.isNaN(Number(raw))) raw = "=" + raw;
    const entries = [];
    for (let r = rng.r1; r <= rng.r2; r++) for (let c = rng.c1; c <= rng.c2; c++) entries.push([r, c, isF(raw) ? shiftFormula(raw, r - rng.r1, c - rng.c1) : raw]);
    for (const [r, c, v] of entries) {
      const err = validate(active(get()), r, c, v);
      if (err) return get().toast(err, "error"), false;
    }
    get().mutate((sh) => ops.setCells(sh, entries));
    set({ anchor: { r: rng.r1, c: rng.c1 }, focus: { r: rng.r2, c: rng.c2 }, editing: null });
    return true;
  },
  /** True when clicking a cell should insert a reference into the formula being edited. */
  canPoint: () => {
    const e = get().editing;
    if (!e || e.value[0] !== "=") return false;
    if (e.point) return true;
    return /[=(,+\-*/^&<>;:]\s*$/.test(e.value.slice(0, e.caret ?? e.value.length));
  },
  pointRef: (a, b) => {
    const e = get().editing;
    if (!e) return;
    const rng = ops.normRange(a, b || a);
    const text = rng.r1 === rng.r2 && rng.c1 === rng.c2 ? rangeToA1(rng).split(":")[0] : rangeToA1(rng);
    const caret = e.caret ?? e.value.length;
    const start = e.point ? e.point.start : caret;
    const end = e.point ? e.point.start + e.point.len : caret;
    const value = e.value.slice(0, start) + text + e.value.slice(end);
    set({ editing: { ...e, value, caret: start + text.length, point: { start, len: text.length, rng } } });
  },

  // ── Cell content / formatting ──────────────────────────────────────
  clearContents: () => {
    const rng = selRange(get());
    get().mutate((sh) => ops.clearRange(sh, rng));
  },
  clearFormats: () => {
    const rng = selRange(get());
    get().mutate((sh) => ops.clearRange(sh, rng, { values: false, formats: true }));
  },
  clearAll: () => {
    const rng = selRange(get());
    get().mutate((sh) => ops.clearRange(sh, rng, { values: true, formats: true }));
  },
  setStyle: (patch) => {
    const rng = selRange(get());
    get().mutate((sh) => ops.styleRange(sh, rng, patch));
  },
  toggleStyle: (prop) => {
    const s = get();
    const rng = selRange(s);
    const on = ops.allHave(active(s), rng, prop);
    s.mutate((sh) => ops.styleRange(sh, rng, { [prop]: on ? false : true }));
  },
  setNumberFormat: (nf) => get().setStyle({ nf: nf === "general" ? undefined : nf, dec: undefined }),
  changeDecimals: (delta) => {
    const s = get();
    const rng = selRange(s);
    const st = active(s).styles[key(rng.r1, rng.c1)];
    const cur = st?.dec ?? (!st?.nf || ["general", "text", "date"].includes(st.nf) ? 0 : 2);
    s.setStyle({ dec: clamp(cur + delta, 0, 10), nf: st?.nf });
  },
  setBorders: (mode) => {
    const rng = selRange(get());
    get().mutate((sh) => ops.applyBorders(sh, rng, mode));
  },

  // ── Clipboard ──────────────────────────────────────────────────────
  setClipboard: (clipboard) => set({ clipboard }),
  captureClipboard: (cut) => {
    const s = get();
    const sh = active(s);
    const rng = selRange(s);
    const snapshot = ops.readRange(sh, rng);
    const ev = createEvaluator(s.sheets);
    snapshot.rows.forEach((row, i) => row.forEach((cell, j) => (cell.computed = ev.value(sh.id, rng.r1 + i, rng.c1 + j))));
    const clip = { snap: snapshot, rng, sheetId: sh.id, cut: !!cut };
    set({ clipboard: clip });
    return clip;
  },
  paste: ({ valuesOnly = false } = {}) => {
    const s = get();
    const clip = s.clipboard;
    if (!clip) return false;
    const sel = selRange(s);
    const h = clip.snap.rows.length;
    const w = clip.snap.rows[0]?.length || 1;
    const fillSel = h === 1 && w === 1 && (sel.r2 > sel.r1 || sel.c2 > sel.c1);
    s.mutate((sh) => {
      let out = sh;
      if (fillSel) {
        for (let r = sel.r1; r <= sel.r2; r++) for (let c = sel.c1; c <= sel.c2; c++) out = ops.pasteSnapshot(out, clip.snap, r, c, { valuesOnly });
      } else out = ops.pasteSnapshot(out, clip.snap, sel.r1, sel.c1, { valuesOnly });
      if (clip.cut && clip.sheetId === sh.id) {
        const src = clip.rng;
        const dest = { r1: sel.r1, c1: sel.c1, r2: sel.r1 + h - 1, c2: sel.c1 + w - 1 };
        for (let r = src.r1; r <= src.r2; r++)
          for (let c = src.c1; c <= src.c2; c++) if (!ops.inRange(dest, r, c)) out = ops.clearRange(out, { r1: r, c1: c, r2: r, c2: c }, { values: true, formats: !valuesOnly });
      }
      return out;
    });
    const r2 = fillSel ? sel.r2 : Math.min(ROWS - 1, sel.r1 + h - 1);
    const c2 = fillSel ? sel.c2 : Math.min(COLS - 1, sel.c1 + w - 1);
    set({ anchor: { r: sel.r1, c: sel.c1 }, focus: { r: r2, c: c2 }, clipboard: clip.cut ? null : clip });
    return true;
  },
  pasteGrid: (rows) => {
    const sel = selRange(get());
    const entries = [];
    rows.forEach((row, i) => row.forEach((v, j) => sel.r1 + i < ROWS && sel.c1 + j < COLS && entries.push([sel.r1 + i, sel.c1 + j, v])));
    get().mutate((sh) => ops.setCells(sh, entries));
    set({ anchor: { r: sel.r1, c: sel.c1 }, focus: { r: Math.min(ROWS - 1, sel.r1 + rows.length - 1), c: Math.min(COLS - 1, sel.c1 + (rows[0]?.length || 1) - 1) } });
  },
  fill: (dir) => {
    const s = get();
    const rng = selRange(s);
    if (dir === "down" && rng.r1 === rng.r2 && rng.r1 > 0) return s.mutate((sh) => ops.fillRange(sh, { ...rng, r1: rng.r1 - 1 }, "down"));
    if (dir === "right" && rng.c1 === rng.c2 && rng.c1 > 0) return s.mutate((sh) => ops.fillRange(sh, { ...rng, c1: rng.c1 - 1 }, "right"));
    s.mutate((sh) => ops.fillRange(sh, rng, dir));
  },

  // ── Structure ──────────────────────────────────────────────────────
  insertRows: (below = false) => {
    const rng = selRange(get());
    const n = rng.r2 - rng.r1 + 1;
    get().mutate((sh) => ops.insertLines(sh, "row", below ? rng.r2 + 1 : rng.r1, n));
  },
  insertCols: (right = false) => {
    const rng = selRange(get());
    const n = rng.c2 - rng.c1 + 1;
    get().mutate((sh) => ops.insertLines(sh, "col", right ? rng.c2 + 1 : rng.c1, n));
  },
  deleteRows: () => {
    const rng = selRange(get());
    get().mutate((sh) => ops.deleteLines(sh, "row", rng.r1, rng.r2 - rng.r1 + 1));
  },
  deleteCols: () => {
    const rng = selRange(get());
    get().mutate((sh) => ops.deleteLines(sh, "col", rng.c1, rng.c2 - rng.c1 + 1));
  },
  hideRows: (hide = true) => {
    const rng = selRange(get());
    get().mutate((sh) => {
      const hiddenRows = { ...sh.hiddenRows };
      for (let r = rng.r1; r <= rng.r2; r++) hide ? (hiddenRows[r] = true) : delete hiddenRows[r];
      return { ...sh, hiddenRows };
    });
  },
  unhideAllRows: () => get().mutate((sh) => (Object.keys(sh.hiddenRows).length ? { ...sh, hiddenRows: {} } : sh)),
  setColWidth: (c, w) => get().patchSheetLive((sh) => ({ ...sh, colWidths: { ...sh.colWidths, [c]: Math.max(MIN_COL_WIDTH, Math.round(w)) } })),
  setRowHeight: (r, h) => get().patchSheetLive((sh) => ({ ...sh, rowHeights: { ...sh.rowHeights, [r]: Math.max(MIN_ROW_HEIGHT, Math.round(h)) } })),
  /** Dialog / menu sizing: applies to every selected column and/or row (undoable). */
  sizeSelection: ({ width, height }) => {
    const rng = selRange(get());
    get().mutate((sh) => {
      const colWidths = { ...sh.colWidths };
      const rowHeights = { ...sh.rowHeights };
      if (width) for (let c = rng.c1; c <= rng.c2; c++) colWidths[c] = Math.max(MIN_COL_WIDTH, Math.round(width));
      if (height) for (let r = rng.r1; r <= rng.r2; r++) rowHeights[r] = Math.max(MIN_ROW_HEIGHT, Math.round(height));
      return { ...sh, colWidths, rowHeights };
    });
  },
  resetSizes: () => get().mutate((sh) => ({ ...sh, colWidths: {}, rowHeights: {} })),
  autoFitColumn: (c) => {
    const s = get();
    const sh = active(s);
    const ev = createEvaluator(s.sheets);
    let max = 0;
    for (let r = 0; r < ROWS; r++) {
      const text = formatValue(ev.value(sh.id, r, c), sh.styles[key(r, c)]);
      const st = sh.styles[key(r, c)];
      max = Math.max(max, text.length * ((st?.fs || 11) * 0.62) + (st?.b ? 6 : 0));
    }
    s.mutate((x) => ({ ...x, colWidths: { ...x.colWidths, [c]: Math.max(MIN_COL_WIDTH + 20, Math.min(600, Math.round(max + 18))) } }));
  },

  // ── Data ───────────────────────────────────────────────────────────
  sortSelection: (ascending = true, hasHeader) => {
    const s = get();
    const sh = active(s);
    let rng = selRange(s);
    if (rng.r1 === rng.r2 && rng.c1 === rng.c2) rng = ops.currentRegion(sh, rng.r1, rng.c1);
    const col = clamp(s.anchor.c, rng.c1, rng.c2);
    s.mutate((x) => ops.sortRange(x, rng, col, ascending, hasHeader));
    set({ anchor: { r: rng.r1, c: rng.c1 }, focus: { r: rng.r2, c: rng.c2 } });
  },
  removeDuplicates: () => {
    const s = get();
    let rng = selRange(s);
    if (rng.r1 === rng.r2 && rng.c1 === rng.c2) rng = ops.currentRegion(active(s), rng.r1, rng.c1);
    const { sheet: out, removed } = ops.removeDuplicateRows(active(s), rng);
    if (!removed) return s.toast("No duplicate rows found (first row is treated as the header).");
    s.mutate(() => out);
    s.toast(`Removed ${removed} duplicate row${removed === 1 ? "" : "s"}.`);
  },
  trimSelection: () => {
    const s = get();
    const rng = selRange(s);
    s.mutate((sh) => {
      const entries = [];
      for (let r = rng.r1; r <= rng.r2; r++)
        for (let c = rng.c1; c <= rng.c2; c++) {
          const v = sh.cells[key(r, c)];
          if (typeof v === "string" && !isF(v) && v !== v.trim().replace(/\s+/g, " ")) entries.push([r, c, v.trim().replace(/\s+/g, " ")]);
        }
      return entries.length ? ops.setCells(sh, entries) : sh;
    });
  },
  addValidation: (rule) => get().mutate((sh) => ({ ...sh, validations: [...sh.validations, { id: newId(), ...rule }] })),
  removeValidation: (id) => get().mutate((sh) => ({ ...sh, validations: sh.validations.filter((v) => v.id !== id) })),
  addCf: (rule) => get().mutate((sh) => ({ ...sh, cf: [...sh.cf, { id: newId(), ...rule }] })),
  removeCf: (id) => get().mutate((sh) => ({ ...sh, cf: sh.cf.filter((v) => v.id !== id) })),

  // ── Charts ─────────────────────────────────────────────────────────
  addChart: (chart) => {
    const id = newId();
    const n = get().sheet().charts.length;
    get().mutate((sh) => ({ ...sh, charts: [...sh.charts, { id, type: "bar", title: "", headers: true, x: 180 + n * 24, y: 70 + n * 24, w: 420, h: 280, ...chart }] }));
    return id;
  },
  updateChart: (id, patch, live = false) => {
    const fn = (sh) => ({ ...sh, charts: sh.charts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    live ? get().patchSheetLive(fn) : get().mutate(fn);
  },
  removeChart: (id) => get().mutate((sh) => ({ ...sh, charts: sh.charts.filter((c) => c.id !== id) })),

  // ── Find / replace ─────────────────────────────────────────────────
  runFind: (text, opts) => {
    const s = get();
    const hits = ops.findAll(active(s), createEvaluator(s.sheets), text, opts);
    set({ findHits: hits, findIndex: hits.length ? 0 : -1 });
    if (hits.length) set({ anchor: hits[0], focus: hits[0] });
    return hits.length;
  },
  stepFind: (dir = 1) => {
    const { findHits, findIndex } = get();
    if (!findHits.length) return;
    const i = (findIndex + dir + findHits.length) % findHits.length;
    set({ findIndex: i, anchor: findHits[i], focus: findHits[i] });
  },
  replaceCurrent: (text, repl, opts = {}) => {
    const s = get();
    const hit = s.findHits[s.findIndex];
    if (!hit) return;
    const raw = String(active(s).cells[key(hit.r, hit.c)] ?? "");
    const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), opts.matchCase ? "" : "i");
    s.mutate((sh) => ops.setCells(sh, [[hit.r, hit.c, raw.replace(re, () => repl)]]));
    s.runFind(text, opts);
  },
  replaceAll: (text, repl, opts = {}) => {
    const s = get();
    const hits = ops.findAll(active(s), createEvaluator(s.sheets), text, { ...opts, inFormulas: true });
    if (!hits.length) return 0;
    const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), opts.matchCase ? "g" : "gi");
    s.mutate((sh) => ops.setCells(sh, hits.map(({ r, c }) => [r, c, String(sh.cells[key(r, c)]).replace(re, () => repl)])));
    set({ findHits: [], findIndex: -1 });
    return hits.length;
  },
  clearFind: () => set({ findHits: [], findIndex: -1 }),

  // ── Pivot ──────────────────────────────────────────────────────────
  /** Source = the selection, or the data region around the active cell. First row = field names. */
  pivotSource: () => {
    const s = get();
    const sh = active(s);
    let rng = selRange(s);
    if (rng.r1 === rng.r2 && rng.c1 === rng.c2) rng = ops.currentRegion(sh, rng.r1, rng.c1);
    const ev = createEvaluator(s.sheets);
    const headers = [];
    const seen = new Set();
    for (let c = rng.c1; c <= rng.c2; c++) {
      let h = String(ev.value(sh.id, rng.r1, c) ?? "").trim() || `Column ${c - rng.c1 + 1}`;
      while (seen.has(h)) h += "_";
      seen.add(h);
      headers.push(h);
    }
    const data = [];
    for (let r = rng.r1 + 1; r <= rng.r2; r++) {
      const row = {};
      let any = false;
      headers.forEach((h, i) => {
        const v = ev.value(sh.id, r, rng.c1 + i);
        if (v !== null) any = true;
        row[h] = isError(v) ? "" : v;
      });
      if (any) data.push(row);
    }
    return { rng, headers, data };
  },
  openPivot: () => set((s) => ({ pivot: { ...s.pivot, open: true, results: null } })),
  closePivot: () => set((s) => ({ pivot: { ...s.pivot, open: false } })),
  setPivot: (patch) => set((s) => ({ pivot: { ...s.pivot, config: { ...s.pivot.config, ...patch } } })),
  resetPivot: () => set((s) => ({ pivot: { ...s.pivot, config: { rows: "", columns: "", values: "", agg: "SUM" }, results: null } })),
  buildPivot: () => {
    const s = get();
    const { data } = s.pivotSource();
    const { rows, values } = s.pivot.config;
    if (!rows || !values) return null;
    const results = buildPivot(data, s.pivot.config);
    set({ pivot: { ...s.pivot, results } });
    return results;
  },
  insertPivotSheet: () => {
    const s = get();
    const res = s.pivot.results;
    if (!res) return;
    const sh = createSheet(uniqueSheetName(s.sheets, "Pivot"));
    const all = [res.headers.map((h, i) => (i === 0 ? s.pivot.config.rows : h)), ...res.rows, res.grandRow];
    all.forEach((row, r) => row.forEach((v, c) => r < ROWS && c < COLS && v !== "" && (sh.cells[key(r, c)] = String(v))));
    for (let c = 0; c < Math.min(COLS, res.headers.length); c++) sh.styles[key(0, c)] = { b: true, bg: "#e8f5ee" };
    for (let c = 0; c < Math.min(COLS, res.headers.length); c++) sh.styles[key(all.length - 1, c)] = { b: true, bd: { t: true } };
    sh.colWidths[0] = 140;
    s.mutateSheets((list) => ({ sheets: [...list, sh], activeSheetId: sh.id }), { editing: null, anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 } });
    s.toast(`Pivot table added as "${sh.name}".`);
  },
}));

