/**
 * Pivot Table engine
 * Aggregates a dataset by grouping rows and applying an aggregation function.
 *
 * @typedef {Object} PivotConfig
 * @property {string} rows       - column name for row grouping
 * @property {string} columns    - column name for column grouping (optional)
 * @property {string} values     - column name to aggregate
 * @property {string} agg        - "SUM" | "AVERAGE" | "COUNT" | "MAX" | "MIN"
 *
 * @param {Array<Object>} data - array of row objects
 * @param {PivotConfig} config
 * @returns {Object} { headers: string[], rows: Array<Array>, totals: Array }
 */

const AGGREGATIONS = {
  SUM: (vals) => vals.reduce((a, b) => a + (Number(b) || 0), 0),
  AVERAGE: (vals) => {
    const nums = vals.map(Number).filter((n) => !isNaN(n));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  },
  COUNT: (vals) => vals.length,
  MAX: (vals) => Math.max(...vals.map(Number).filter((n) => !isNaN(n))),
  MIN: (vals) => Math.min(...vals.map(Number).filter((n) => !isNaN(n))),
};

export function buildPivot(data, config) {
  const { rows: rowField, columns: colField, values: valueField, agg = "SUM" } = config;
  const aggFn = AGGREGATIONS[agg.toUpperCase()] || AGGREGATIONS.SUM;

  // ── Group data ──
  const groups = {}; // { rowVal: { colVal: [values] } }
  const rowKeys = new Set();
  const colKeys = new Set();

  for (const row of data) {
    const rKey = row[rowField] ?? "";
    const cKey = colField ? (row[colField] ?? "") : "Total";
    rowKeys.add(rKey);
    colKeys.add(cKey);

    if (!groups[rKey]) groups[rKey] = {};
    if (!groups[rKey][cKey]) groups[rKey][cKey] = [];
    groups[rKey][cKey].push(row[valueField]);
  }

  // ── Build output ──
  const colHeaders = [...colKeys].sort();
  const headers = ["", ...colHeaders, "Grand Total"];

  const rows = [];
  const grandTotals = colHeaders.map(() => []); // collect per-column grand totals

  for (const rKey of [...rowKeys].sort()) {
    const rowOut = [rKey];
    let rowTotal = [];

    for (const cKey of colHeaders) {
      const vals = groups[rKey]?.[cKey] || [];
      rowOut.push(aggFn(vals));
      rowTotal.push(...vals);
      grandTotals[colHeaders.indexOf(cKey)].push(...vals);
    }
    rowOut.push(aggFn(rowTotal));
    rows.push(rowOut);
  }

  // Grand total row
  const grandRow = ["Grand Total"];
  for (const cKey of colHeaders) {
    grandRow.push(aggFn(grandTotals[colHeaders.indexOf(cKey)]));
  }
  const allValues = data.map((d) => d[valueField]);
  grandRow.push(aggFn(allValues));

  return { headers, rows, grandRow };
}

/**
 * Convenience: get unique values for a field (for dropdowns in UI)
 */
export function getUniqueValues(data, field) {
  return [...new Set(data.map((r) => r[field]))].sort();
}   