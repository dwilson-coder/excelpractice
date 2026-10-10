/**
 * Pivot engine — groups rows by a field (and optional column field) and aggregates a value field.
 * @param {Array<Object>} data - row objects keyed by header
 * @param {{rows:string, columns?:string, values:string, agg?:string}} config
 * @returns {{ headers: string[], rows: Array<Array>, grandRow: Array }}
 */
const numsOf = (vals) => vals.map((v) => (typeof v === "number" ? v : Number(v))).filter((n) => typeof n === "number" && !isNaN(n));

const AGGREGATIONS = {
  SUM: (vals) => numsOf(vals).reduce((a, b) => a + b, 0),
  AVERAGE: (vals) => {
    const n = numsOf(vals);
    return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0;
  },
  COUNT: (vals) => vals.filter((v) => v !== "" && v !== null && v !== undefined).length,
  MAX: (vals) => {
    const n = numsOf(vals);
    return n.length ? Math.max(...n) : 0;
  },
  MIN: (vals) => {
    const n = numsOf(vals);
    return n.length ? Math.min(...n) : 0;
  },
};

export function buildPivot(data, config) {
  const { rows: rowField, columns: colField, values: valueField, agg = "SUM" } = config;
  const aggFn = AGGREGATIONS[agg.toUpperCase()] || AGGREGATIONS.SUM;
  const groups = new Map();
  const colKeys = new Set();
  for (const row of data) {
    const rKey = String(row[rowField] ?? "");
    const cKey = colField ? String(row[colField] ?? "") : "Total";
    colKeys.add(cKey);
    if (!groups.has(rKey)) groups.set(rKey, new Map());
    const g = groups.get(rKey);
    if (!g.has(cKey)) g.set(cKey, []);
    g.get(cKey).push(row[valueField]);
  }
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const colHeaders = [...colKeys].sort(collator.compare);
  const showGrandCol = !!colField;
  const headers = ["", ...colHeaders, ...(showGrandCol ? ["Grand Total"] : [])];
  const rows = [];
  const colTotals = colHeaders.map(() => []);
  for (const rKey of [...groups.keys()].sort(collator.compare)) {
    const g = groups.get(rKey);
    const out = [rKey];
    const rowAll = [];
    colHeaders.forEach((cKey, i) => {
      const vals = g.get(cKey) || [];
      out.push(vals.length ? aggFn(vals) : "");
      rowAll.push(...vals);
      colTotals[i].push(...vals);
    });
    if (showGrandCol) out.push(aggFn(rowAll));
    rows.push(out);
  }
  const grandRow = ["Grand Total", ...colTotals.map((v) => aggFn(v))];
  if (showGrandCol) grandRow.push(aggFn(data.map((d) => d[valueField])));
  return { headers, rows, grandRow };
}

export const getUniqueValues = (data, field) => [...new Set(data.map((r) => r[field]))].sort();
