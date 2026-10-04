/**
 * XLOOKUP implementation
 * Syntax: XLOOKUP(lookupValue, lookupArray, returnArray, [ifNotFound])
 *
 * @param {Array<Array>} grid
 * @param {string} lookupValue  - value to search for
 * @param {string} lookupArray  - range to search in, e.g. "A1:A10"
 * @param {string} returnArray  - range to return from, e.g. "D1:D10"
 * @param {string} ifNotFound   - value to return if no match (default "#N/A")
 * @returns {*}
 */
import { parseRange, getCellValue } from "./formulaEngine";

export function xlookup(grid, lookupValue, lookupArray, returnArray, ifNotFound = "#N/A") {
  const lookupRange = parseRange(lookupArray);
  const returnRange = parseRange(returnArray);

  const { start: ls, end: le } = lookupRange;
  const { start: rs } = returnRange;

  // Iterate through lookup range
  for (let r = ls.row; r <= le.row; r++) {
    const lookupVal = getCellValue(grid, { row: r, col: ls.col });
    if (String(lookupVal).toLowerCase() === String(lookupValue).toLowerCase()) {
      const returnRow = rs.row + (r - ls.row); // align return array
      return getCellValue(grid, { row: returnRow, col: rs.col });
    }
  }

  return ifNotFound;
}   