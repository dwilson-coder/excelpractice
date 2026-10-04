/**
 * Minimal formula parser & evaluator.
 * Supports: =SUM(A1:A10), =AVERAGE(A1:A5), =COUNT(A1:A10),
 *          =A1+B2, =A1*B2, =A1-B2, =A1/B2, =A1
 *          =VLOOKUP(...), =XLOOKUP(...) (delegates to utils)
 */

import { vlookup } from "./vlookup";
import { xlookup } from "./xlookup";

// ─── Cell Reference Parser ───────────────────────────────────────────
/**
 * Convert "A1" → { row: 0, col: 0 }
 * Convert "BC23" → { row: 22, col: 54 }
 */
export function parseCellRef(ref) {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  const [, letters, num] = match;

  let col = 0;
  for (const ch of letters) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return { row: parseInt(num, 10) - 1, col: col - 1 };
}

/**
 * Convert { row: 0, col: 0 } → "A1"
 */
export function toCellRef(row, col) {
  let letters = "";
  let c = col;
  while (c >= 0) {
    letters = String.fromCharCode((c % 26) + 65) + letters;
    c = Math.floor(c / 26) - 1;
  }
  return `${letters}${row + 1}`;
}

// ─── Range Parser ────────────────────────────────────────────────────
/**
 * Parse "A1:B10" → { start: {row,col}, end: {row,col} }
 */
export function parseRange(rangeStr) {
  const [startStr, endStr] = rangeStr.split(":");
  return {
    start: parseCellRef(startStr.trim()),
    end: parseCellRef(endStr.trim()),
  };
}

// ─── Cell Value Resolver ─────────────────────────────────────────────
/**
 * Get the numeric (or string) value of a cell from the grid.
 * @param {Array<Array>} grid - 2D array of cell values
 * @param {{row:number, col:number}} ref
 */
export function getCellValue(grid, ref) {
  const { row, col } = ref;
  if (row < 0 || row >= grid.length || col < 0) return 0;
  const val = grid[row]?.[col];
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(val);
  return isNaN(num) ? val : num;
}

/**
 * Get all values in a range as a flat array.
 */
export function getRangeValues(grid, range) {
  const { start, end } = range;
  const values = [];
  for (let r = start.row; r <= end.row; r++) {
    for (let c = start.col; c <= end.col; c++) {
      values.push(getCellValue(grid, { row: r, col: c }));
    }
  }
  return values;
}

// ─── Built-in Functions ──────────────────────────────────────────────
const functions = {
  SUM: (vals) => vals.reduce((a, b) => a + (Number(b) || 0), 0),
  AVERAGE: (vals) => {
    const nums = vals.filter((v) => !isNaN(Number(v)));
    return nums.length ? nums.reduce((a, b) => a + Number(b), 0) / nums.length : 0;
  },
  COUNT: (vals) => vals.filter((v) => !isNaN(Number(v))).length,
  MAX: (vals) => Math.max(...vals.map(Number).filter((n) => !isNaN(n))),
  MIN: (vals) => Math.min(...vals.map(Number).filter((n) => !isNaN(n))),
  ROUND: (vals, digits) => {
    const n = Number(vals[0]);
    const d = Number(digits) || 0;
    return Number(n.toFixed(d));
  },
};

// ─── Main Evaluator ──────────────────────────────────────────────────
/**
 * Evaluate a formula string against a grid.
 * @param {string} formula - e.g. "=SUM(A1:A10)"
 * @param {Array<Array>} grid - 2D array of cell values
 * @returns {number|string}
 */
export function evaluateFormula(formula, grid) {
  if (!formula || !formula.startsWith("=")) return formula;
  const expr = formula.slice(1).trim(); // strip leading "="

  // ── Function call: NAME(args) ──
  const funcMatch = expr.match(/^([A-Z]+)\((.+)\)$/);
  if (funcMatch) {
    const [, funcName, argsStr] = funcMatch;

    // Special: VLOOKUP / XLOOKUP
    if (funcName === "VLOOKUP") {
      const args = splitArgs(argsStr);
      return vlookup(grid, ...args);
    }
    if (funcName === "XLOOKUP") {
      const args = splitArgs(argsStr);
      return xlookup(grid, ...args);
    }

    const fn = functions[funcName];
    if (!fn) throw new Error(`Unknown function: ${funcName}`);

    // Parse args as ranges or literals
    const args = splitArgs(argsStr).map((a) => {
      if (a.includes(":")) {
        return getRangeValues(grid, parseRange(a));
      }
      const ref = parseCellRef(a);
      return [getCellValue(grid, ref)];
    });

    // Flatten for aggregate functions
    const flat = args.flat();
    // ROUND takes (value, digits)
    if (funcName === "ROUND") {
      return fn(flat, flat.length > 1 ? flat[1] : 0);
    }
    return fn(flat);
  }

  // ── Arithmetic expression: A1+B2, A1*B2, etc. ──
  const arithMatch = expr.match(/^([A-Z]+\d+)\s*([+\-*/])\s*([A-Z]+\d+)$/);
  if (arithMatch) {
    const [, left, op, right] = arithMatch;
    const l = Number(getCellValue(grid, parseCellRef(left)));
    const r = Number(getCellValue(grid, parseCellRef(right)));
    switch (op) {
      case "+": return l + r;
      case "-": return l - r;
      case "*": return l * r;
      case "/": return r === 0 ? "#DIV/0!" : l / r;
    }
  }

  // ── Single cell reference ──
  if (/^[A-Z]+\d+$/.test(expr)) {
    return getCellValue(grid, parseCellRef(expr));
  }

  // ── Literal number ──
  if (!isNaN(Number(expr))) return Number(expr);

  throw new Error(`Cannot evaluate: ${formula}`);
}

// ─── Helper: split comma-separated args (no nested parens in v1) ─────
function splitArgs(str) {
  return str.split(",").map((s) => s.trim());
}   