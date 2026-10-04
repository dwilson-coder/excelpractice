import { motion } from "framer-motion";

/**
 * Renders the pivot table results as a styled grid.
 *
 * @param {string[]} headers  - column headers (first is empty/row-label)
 * @param {Array<Array>} rows - data rows
 * @param {Array} grandRow    - grand total row
 */
export default function PivotTable({ headers, rows, grandRow }) {
  const formatVal = (v) => {
    if (typeof v === "number") {
      return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
    }
    return v;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm border-collapse">
        {/* ── Header Row ── */}
        <thead>
          <tr className="bg-excel-green text-white">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-3 py-2.5 font-medium text-xs uppercase tracking-wide text-left whitespace-nowrap ${
                  i === 0 ? "border-r border-white/20" : ""
                }`}
              >
                {h || "Row"}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Data Rows ── */}
        <tbody>
          {rows.map((row, r) => (
            <motion.tr
              key={r}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: r * 0.04, duration: 0.25 }}
              className={`border-b border-gray-100 transition-colors hover:bg-excel-green-light/40 ${
                r % 2 === 1 ? "bg-gray-50/60" : "bg-white"
              }`}
            >
              {row.map((val, c) => (
                <td
                  key={c}
                  className={`px-3 py-2 whitespace-nowrap ${
                    c === 0
                      ? "font-medium text-gray-800 border-r border-gray-100"
                      : "text-gray-600 font-mono text-xs"
                  }`}
                >
                  {c === 0 ? val : formatVal(val)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>

        {/* ── Grand Total Row ── */}
        <tfoot>
          <tr className="bg-gray-100 border-t-2 border-excel-green/30">
            {grandRow.map((val, c) => (
              <td
                key={c}
                className={`px-3 py-2.5 font-semibold whitespace-nowrap ${
                  c === 0
                    ? "text-gray-800 border-r border-gray-200"
                    : "text-excel-green font-mono text-xs"
                }`}
              >
                {c === 0 ? val : formatVal(val)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      {/* ── Summary badge ── */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-400">
          {rows.length} row{rows.length !== 1 ? "s" : ""} ×{" "}
          {headers.length - 1} column{headers.length - 1 !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}   