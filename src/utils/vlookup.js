/**
 * VLOOKUP implementation
 * Syntax: VLOOKUP(lookupValue, tableRange, colIndex, [approxMatch])
 *
 * @param {Array<Array>} grid
 * @param {string} lookupValue - value to find in first column
 * @param {string} tableRange  - e.g. "A1:D10"
 * @param {string} colIndex    - "2" (1-based column index)
 * @param {string} approxMatch - "TRUE" or "FALSE" (default "FALSE")
 * @returns {*}
 */
import { parseRange, getCellValue, parseCellRef } from "./formulaEngine";

export function vlookup(grid, lookupValue, tableRange, colIndex, approxMatch = "FALSE") {
  const { start, end } = parseRange(tableRange);
  const targetCol = parseInt(colIndex, 10) - 1; // 0-based
  const fuzzy = approxMatch.toUpperCase() === "TRUE";

  // Build the lookup column (first col of range) and result column
  const lookupCol = [];
  const resultCol = [];

  for (let r = start.row; r <= end.row; r++) {
    lookupCol.push(getCellValue(grid, { row: r, col: start.col }));
    resultCol.push(getCellValue(grid, { row: r, col: start.col + targetCol }));
  }

  // Exact match
  if (!fuzzy) {
    const idx = lookupCol.findIndex((v) => String(v).toLowerCase() === String(lookupValue).toLowerCase());
    if (idx === -1) return "#N/A";
    return resultCol[idx];
  }

  // Approximate match (requires sorted column)
  const sorted = lookupCol
    .map((v, i) => ({ val: Number(v), idx: i }))
    .sort((a, b) => a.val - b.val);

  let best = null;
  for (const item of sorted) {
    if (item.val <= Number(lookupValue)) {
      best = item;
    } else {
      break;
    }
  }

  return best ? resultCol[best.idx] : "#N/A";
}   