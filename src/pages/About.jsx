import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FunctionSquare,
  Search,
  Table2,
  Hash,
  ArrowLeft,
} from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const formulaSections = [
  {
    icon: Hash,
    title: "Basic Arithmetic",
    formulas: [
      { syntax: "=A1 + B1", desc: "Add two cells" },
      { syntax: "=A1 - B1", desc: "Subtract B1 from A1" },
      { syntax: "=A1 * B1", desc: "Multiply two cells" },
      { syntax: "=A1 / B1", desc: "Divide A1 by B1 (returns #DIV/0! if B1 is 0)" },
    ],
  },
  {
    icon: FunctionSquare,
    title: "Aggregate Functions",
    formulas: [
      { syntax: "=SUM(A1:A10)", desc: "Sum of a range" },
      { syntax: "=AVERAGE(A1:A10)", desc: "Arithmetic mean of a range" },
      { syntax: "=COUNT(A1:A10)", desc: "Count numeric cells in range" },
      { syntax: "=MAX(A1:A10)", desc: "Largest value in range" },
      { syntax: "=MIN(A1:A10)", desc: "Smallest value in range" },
      { syntax: "=ROUND(A1, 2)", desc: "Round to 2 decimal places" },
    ],
  },
  {
    icon: Search,
    title: "VLOOKUP",
    formulas: [
      {
        syntax: "=VLOOKUP(lookupValue, tableRange, colIndex, FALSE)",
        desc: "Exact-match lookup in the first column of tableRange, returns value from colIndex-th column.",
      },
      {
        syntax: "=VLOOKUP(\"Alice\", A2:D10, 3, FALSE)",
        desc: "Find \"Alice\" in column A, return the value from column C (3rd col of range).",
      },
    ],
  },
  {
    icon: Search,
    title: "XLOOKUP",
    formulas: [
      {
        syntax: "=XLOOKUP(lookupValue, lookupArray, returnArray, [ifNotFound])",
        desc: "Modern replacement for VLOOKUP. Search lookupArray, return from returnArray. Optional 4th arg is the fallback.",
      },
      {
        syntax: "=XLOOKUP(\"Bob\", A2:A10, D2:D10, \"Not Found\")",
        desc: "Find \"Bob\" in A2:A10, return corresponding D-column value, or \"Not Found\".",
      },
    ],
  },
  {
    icon: FunctionSquare,
    title: "Logic & Conditional Functions",
    formulas: [
      { syntax: '=IF(A1>=60, "Pass", "Fail")', desc: "Return one value when the test is TRUE, another when FALSE (IFS, IFERROR also work)" },
      { syntax: "=AND(A1>0, B1<10)  /  =OR(…)  /  =NOT(…)", desc: "Combine tests" },
      { syntax: '=SUMIF(A1:A9, "East", B1:B9)', desc: "Sum cells that match a condition (also COUNTIF, AVERAGEIF)" },
      { syntax: '=CONCAT(A1, " ", B1)  /  =TEXT(A1, "0.00")', desc: "Text helpers: LEFT, RIGHT, MID, LEN, UPPER, LOWER, TRIM, SUBSTITUTE…" },
    ],
  },
  {
    icon: Table2,
    title: "Output Cell",
    formulas: [
      { syntax: "Formula bar → Output cell", desc: "Type SUM(A1:A10) in the formula bar, enter D5 (or a range like D5:D9) in Output cell and press Enter to run it there." },
      { syntax: "Select cells, then Σ", desc: "AutoSum inserts a formula below the selection (or under the column above the active cell)." },
    ],
  },
  {
    icon: Table2,
    title: "Pivot Tables",
    formulas: [
      {
        syntax: "Data → Pivot table…",
        desc: "Select your data (first row = headers) and open the pivot panel. Select a row field, optional column field, a value field, and an aggregation (SUM, AVERAGE, COUNT, MAX, MIN).",
      },
      {
        syntax: "Example: Rows=Dept, Values=Sales, Agg=SUM",
        desc: "Groups all rows by department and sums the sales column for each group.",
      },
    ],
  },
];

export default function About() {
  const { ref, visible } = useScrollReveal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/practice"
            className="flex items-center gap-2 text-gray-600 hover:text-excel-green transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Spreadsheet
          </Link>
          <h1 className="font-semibold text-gray-900">Formula Reference</h1>
        </div>
      </header>

      {/* ── Content ── */}
      <main ref={ref} className="max-w-4xl mx-auto px-6 py-12">
        <div className={`scroll-reveal ${visible ? "visible" : ""} mb-12`}>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Cheat Sheet
          </h2>
          <p className="text-gray-500 text-lg">
            Every formula and feature available in this practice environment.
            Copy the syntax and paste it into a cell to try it.
          </p>
        </div>

        <div className="space-y-10">
          {formulaSections.map((section, i) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="glow-card"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-excel-green-light flex items-center justify-center">
                  <section.icon size={20} className="text-excel-green" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {section.title}
                </h3>
              </div>

              <div className="space-y-3">
                {section.formulas.map((f, j) => (
                  <div
                    key={j}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 rounded-lg bg-gray-50 hover:bg-excel-green-light/50 transition-colors"
                  >
                    <code className="text-sm font-mono text-excel-green-dark bg-white px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                      {f.syntax}
                    </code>
                    <span className="text-sm text-gray-600">{f.desc}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* ── Tips ── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 p-6 rounded-xl bg-blue-50 border border-blue-200"
        >
          <h3 className="font-semibold text-blue-900 mb-3">
            💡 Pro Tips
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              • Double-click any cell to edit, or press <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">F2</kbd>.
            </li>
            <li>
              • Use arrow keys to navigate the grid — just like real Excel.
            </li>
            <li>
              • VLOOKUP requires the lookup value in the <strong>first</strong> column of your range. XLOOKUP doesn't.
            </li>
            <li>
              • The pivot panel needs a header row (row 1) to identify column names.
            </li>
            <li>
              • Add multiple sheets with the <strong>+</strong> button at the bottom to organize practice data.
            </li>
          </ul>
        </motion.section>
      </main>
    </div>
  );
}   