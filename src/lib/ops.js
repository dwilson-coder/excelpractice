/** Pure sheet operations. Each takes a sheet and returns a new sheet (cheap undo via structural sharing). */
import { ROWS, COLS } from "../utils/constants";
import { shiftFormula, adjustForStructure, createEvaluator, isError } from "../utils/formulaEngine";
import { key, unkey } from "./model";

export const normRange = (a, b) => ({ r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) });
export const inRange = (rng, r, c) => r >= rng.r1 && r <= rng.r2 && c >= rng.c1 && c <= rng.c2;
const isF = (v) => typeof v === "string" && v[0] === "=";

export function setCells(sheet, entries) {
  const cells = { ...sheet.cells };
  for (const [r, c, raw] of entries) {
    if (raw === "" || raw == null) delete cells[key(r, c)];
    else cells[key(r, c)] = raw;
  }
  return { ...sheet, cells };
}

export function clearRange(sheet, rng, { values = true, formats = false } = {}) {
  const cells = { ...sheet.cells };
  const styles = { ...sheet.styles };
  for (let r = rng.r1; r <= rng.r2; r++)
    for (let c = rng.c1; c <= rng.c2; c++) {
      if (values) delete cells[key(r, c)];
      if (formats) delete styles[key(r, c)];
    }
  return { ...sheet, cells, styles };
}

/** Merge a style patch into every cell of a range. Falsy/undefined patch values remove the prop. */
export function styleRange(sheet, rng, patch) {
  const styles = { ...sheet.styles };
  for (let r = rng.r1; r <= rng.r2; r++)
    for (let c = rng.c1; c <= rng.c2; c++) {
      const k = key(r, c);
      const next = { ...(styles[k] || {}) };
      const p = typeof patch === "function" ? patch(next, r, c) : patch;
      for (const [pk, pv] of Object.entries(p)) {
        if (pv === undefined || pv === false || pv === null) delete next[pk];
        else next[pk] = pv;
      }
      if (Object.keys(next).length) styles[k] = next;
      else delete styles[k];
    }
  return { ...sheet, styles };
}

export function allHave(sheet, rng, prop) {
  for (let r = rng.r1; r <= rng.r2; r++)
    for (let c = rng.c1; c <= rng.c2; c++) if (!sheet.styles[key(r, c)]?.[prop]) return false;
  return true;
}

export function applyBorders(sheet, rng, mode) {
  return styleRange(sheet, rng, (cur, r, c) => {
    if (mode === "none") return { bd: undefined };
    if (mode === "all") return { bd: { t: true, r: true, b: true, l: true } };
    const bd = { ...(cur.bd || {}) };
    if (mode === "outline") {
      if (r === rng.r1) bd.t = true;
      if (r === rng.r2) bd.b = true;
      if (c === rng.c1) bd.l = true;
      if (c === rng.c2) bd.r = true;
      return { bd };
    }
    if (mode === "bottom") return { bd: { ...bd, b: true } };
    return {};
  });
}

export function readRange(sheet, rng) {
  const rows = [];
  for (let r = rng.r1; r <= rng.r2; r++) {
    const row = [];
    for (let c = rng.c1; c <= rng.c2; c++) row.push({ raw: sheet.cells[key(r, c)] ?? "", style: sheet.styles[key(r, c)] });
    rows.push(row);
  }
  return { rows, origin: { r: rng.r1, c: rng.c1 } };
}

/** Paste a snapshot at (r0,c0). Relative formula refs move with the paste. */
export function pasteSnapshot(sheet, snap, r0, c0, { valuesOnly = false, formulaAdjust = true } = {}) {
  const cells = { ...sheet.cells };
  const styles = { ...sheet.styles };
  const dr = r0 - snap.origin.r;
  const dc = c0 - snap.origin.c;
  snap.rows.forEach((row, i) =>
    row.forEach((cell, j) => {
      const r = r0 + i;
      const c = c0 + j;
      if (r >= ROWS || c >= COLS) return;
      const k = key(r, c);
      let raw = cell.raw;
      if (isF(raw) && valuesOnly) raw = cell.computed ?? "";
      else if (isF(raw) && formulaAdjust) raw = shiftFormula(raw, dr, dc);
      if (raw === "" || raw == null) delete cells[k];
      else cells[k] = typeof raw === "boolean" ? String(raw).toUpperCase() : typeof raw === "number" ? String(raw) : raw;
      if (!valuesOnly) {
        if (cell.style) styles[k] = { ...cell.style };
        else delete styles[k];
      }
    })
  );
  return { ...sheet, cells, styles };
}

/** Fill the first row/col of a range across the rest (Ctrl+D / Ctrl+R). */
export function fillRange(sheet, rng, dir) {
  const cells = { ...sheet.cells };
  const styles = { ...sheet.styles };
  for (let r = rng.r1; r <= rng.r2; r++)
    for (let c = rng.c1; c <= rng.c2; c++) {
      const sr = dir === "down" ? rng.r1 : r;
      const sc = dir === "right" ? rng.c1 : c;
      if (sr === r && sc === c) continue;
      const src = sheet.cells[key(sr, sc)];
      const k = key(r, c);
      if (src === undefined) delete cells[k];
      else cells[k] = isF(src) ? shiftFormula(src, r - sr, c - sc) : src;
      const st = sheet.styles[key(sr, sc)];
      if (st) styles[k] = { ...st };
      else delete styles[k];
    }
  return { ...sheet, cells, styles };
}

// ── Structure ────────────────────────────────────────────────────────
function remapKeys(map, fn) {
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const [r, c] = unkey(k);
    const nk = fn(r, c);
    if (nk) out[nk] = v;
  }
  return out;
}
const rewriteFormulas = (cells, axis, index, delta) =>
  Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, isF(v) ? adjustForStructure(v, axis, index, delta) : v]));

function shiftIndexMap(m, index, delta, max) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    const n = Number(k);
    if (delta > 0) {
      if (n >= index) {
        if (n + delta < max) out[n + delta] = v;
      } else out[n] = v;
    } else if (n >= index && n < index - delta) continue;
    else out[n >= index - delta ? n + delta : n] = v;
  }
  return out;
}

export function insertLines(sheet, axis, index, count = 1) {
  const max = axis === "row" ? ROWS : COLS;
  const move = (r, c) => {
    const v = axis === "row" ? r : c;
    const nv = v >= index ? v + count : v;
    if (nv >= max) return null;
    return axis === "row" ? key(nv, c) : key(r, nv);
  };
  const next = { ...sheet, cells: remapKeys(rewriteFormulas(sheet.cells, axis, index, count), move), styles: remapKeys(sheet.styles, move) };
  if (axis === "row") {
    next.rowHeights = shiftIndexMap(sheet.rowHeights, index, count, ROWS);
    next.hiddenRows = shiftIndexMap(sheet.hiddenRows, index, count, ROWS);
  } else next.colWidths = shiftIndexMap(sheet.colWidths, index, count, COLS);
  return next;
}

export function deleteLines(sheet, axis, index, count = 1) {
  const move = (r, c) => {
    const v = axis === "row" ? r : c;
    if (v >= index && v < index + count) return null;
    const nv = v >= index + count ? v - count : v;
    return axis === "row" ? key(nv, c) : key(r, nv);
  };
  const next = { ...sheet, cells: remapKeys(rewriteFormulas(sheet.cells, axis, index, -count), move), styles: remapKeys(sheet.styles, move) };
  if (axis === "row") {
    next.rowHeights = shiftIndexMap(sheet.rowHeights, index, -count, ROWS);
    next.hiddenRows = shiftIndexMap(sheet.hiddenRows, index, -count, ROWS);
  } else next.colWidths = shiftIndexMap(sheet.colWidths, index, -count, COLS);
  return next;
}

// ── Sort ─────────────────────────────────────────────────────────────
function looksLikeHeader(evaluator, sheet, rng) {
  if (rng.r2 <= rng.r1) return false;
  for (let c = rng.c1; c <= rng.c2; c++) {
    const top = evaluator.value(sheet.id, rng.r1, c);
    const below = evaluator.value(sheet.id, rng.r1 + 1, c);
    if (typeof top === "string" && typeof below === "number") return true;
  }
  return false;
}

/** Sort rows of a range by absolute column `col`. Formulas keep working (relative refs shift with their row). */
export function sortRange(sheet, rng, col, ascending = true, hasHeader) {
  const evaluator = createEvaluator([sheet]);
  const header = hasHeader ?? looksLikeHeader(evaluator, sheet, rng);
  const start = rng.r1 + (header ? 1 : 0);
  const rows = [];
  for (let r = start; r <= rng.r2; r++) rows.push(r);
  const val = (r) => evaluator.value(sheet.id, r, col);
  const rank = (v) => (v === null ? 3 : isError(v) ? 2 : typeof v === "number" ? 0 : typeof v === "boolean" ? 1.5 : 1);
  const sorted = [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    const ra = rank(va);
    const rb = rank(vb);
    if (ra !== rb) return ra - rb; // blanks always last
    let cmp = 0;
    if (typeof va === "string") cmp = va.localeCompare(vb, undefined, { sensitivity: "base" });
    else if (va < vb) cmp = -1;
    else if (va > vb) cmp = 1;
    return (ascending ? cmp : -cmp) || a - b;
  });
  const cells = { ...sheet.cells };
  const styles = { ...sheet.styles };
  sorted.forEach((srcRow, i) => {
    const dst = start + i;
    for (let c = rng.c1; c <= rng.c2; c++) {
      const raw = sheet.cells[key(srcRow, c)];
      const k = key(dst, c);
      if (raw === undefined) delete cells[k];
      else cells[k] = isF(raw) ? shiftFormula(raw, dst - srcRow, 0) : raw;
      const st = sheet.styles[key(srcRow, c)];
      if (st) styles[k] = st;
      else delete styles[k];
    }
  });
  return { ...sheet, cells, styles };
}

/** Contiguous block of data around a cell (Excel's "current region"). */
export function currentRegion(sheet, r, c) {
  const has = (rr, cc) => rr >= 0 && cc >= 0 && rr < ROWS && cc < COLS && (sheet.cells[key(rr, cc)] ?? "") !== "";
  let rng = { r1: r, c1: c, r2: r, c2: c };
  let changed = true;
  const grow = (rr, cc) => {
    if (!has(rr, cc)) return;
    rng = { r1: Math.min(rng.r1, rr), r2: Math.max(rng.r2, rr), c1: Math.min(rng.c1, cc), c2: Math.max(rng.c2, cc) };
    changed = true;
  };
  while (changed) {
    changed = false;
    const { r1, r2, c1, c2 } = rng;
    for (let cc = c1 - 1; cc <= c2 + 1; cc++) {
      grow(r1 - 1, cc);
      grow(r2 + 1, cc);
    }
    for (let rr = r1 - 1; rr <= r2 + 1; rr++) {
      grow(rr, c1 - 1);
      grow(rr, c2 + 1);
    }
  }
  return rng;
}

export function removeDuplicateRows(sheet, rng) {
  const evaluator = createEvaluator([sheet]);
  const seen = new Set();
  const keep = [];
  for (let r = rng.r1; r <= rng.r2; r++) {
    const sig = [];
    for (let c = rng.c1; c <= rng.c2; c++) sig.push(String(evaluator.value(sheet.id, r, c)).toLowerCase());
    const s = sig.join("\u0001");
    if (r === rng.r1 || !seen.has(s)) keep.push(r);
    seen.add(s);
  }
  const cells = { ...sheet.cells };
  const styles = { ...sheet.styles };
  for (let r = rng.r1; r <= rng.r2; r++)
    for (let c = rng.c1; c <= rng.c2; c++) {
      delete cells[key(r, c)];
      delete styles[key(r, c)];
    }
  keep.forEach((src, i) => {
    for (let c = rng.c1; c <= rng.c2; c++) {
      const raw = sheet.cells[key(src, c)];
      if (raw !== undefined) cells[key(rng.r1 + i, c)] = isF(raw) ? shiftFormula(raw, rng.r1 + i - src, 0) : raw;
      const st = sheet.styles[key(src, c)];
      if (st) styles[key(rng.r1 + i, c)] = st;
    }
  });
  return { sheet: { ...sheet, cells, styles }, removed: rng.r2 - rng.r1 + 1 - keep.length };
}

export function findAll(sheet, evaluator, text, { matchCase = false, inFormulas = false } = {}) {
  if (!text) return [];
  const needle = matchCase ? text : text.toLowerCase();
  const hits = [];
  const keys = Object.keys(sheet.cells).sort((a, b) => {
    const [ra, ca] = unkey(a);
    const [rb, cb] = unkey(b);
    return ra - rb || ca - cb;
  });
  for (const k of keys) {
    const [r, c] = unkey(k);
    const hay = inFormulas ? String(sheet.cells[k]) : String(evaluator.value(sheet.id, r, c) ?? "");
    if ((matchCase ? hay : hay.toLowerCase()).includes(needle)) hits.push({ r, c });
  }
  return hits;
}
