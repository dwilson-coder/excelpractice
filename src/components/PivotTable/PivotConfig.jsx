import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings2, Play, ChevronDown } from "lucide-react";
import { usePivot } from "../../store/usePivot";
import PivotTable from "./PivotTable";

const AGG_OPTIONS = ["SUM", "AVERAGE", "COUNT", "MAX", "MIN"];

export default function PivotConfig({ data, onClose }) {
  const {
    isOpen,
    config,
    results,
    setPivotConfig,
    build,
    getFields,
  } = usePivot();

  const [building, setBuilding] = useState(false);
  const fields = useMemo(() => getFields(data), [data, getFields]);

  const handleBuild = () => {
    if (!config.rows || !config.values) return;
    setBuilding(true);
    // Small delay for visual feedback
    setTimeout(() => {
      build(data);
      setBuilding(false);
    }, 300);
  };

  const handleReset = () => {
    setPivotConfig({ rows: "", columns: "", values: "", agg: "SUM" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-excel-green" />
          <h2 className="font-semibold text-gray-900">Pivot Table</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Config Panel ── */}
      <div className="p-5 space-y-4 border-b border-gray-200">
        {/* Row Field */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Row Field <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={config.rows}
              onChange={(e) => setPivotConfig({ rows: e.target.value })}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-excel-green/30 focus:border-excel-green transition-all"
            >
              <option value="">Select a column…</option>
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Column Field (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Column Field <span className="text-gray-400 normal-case">(optional)</span>
          </label>
          <div className="relative">
            <select
              value={config.columns}
              onChange={(e) => setPivotConfig({ columns: e.target.value })}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-excel-green/30 focus:border-excel-green transition-all"
            >
              <option value="">None</option>
              {fields
                .filter((f) => f !== config.rows)
                .map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Value Field */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Value Field <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={config.values}
              onChange={(e) => setPivotConfig({ values: e.target.value })}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-excel-green/30 focus:border-excel-green transition-all"
            >
              <option value="">Select a column…</option>
              {fields
                .filter((f) => f !== config.rows)
                .map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Aggregation */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Aggregation
          </label>
          <div className="grid grid-cols-5 gap-1">
            {AGG_OPTIONS.map((agg) => (
              <button
                key={agg}
                onClick={() => setPivotConfig({ agg })}
                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  config.agg === agg
                    ? "bg-excel-green text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {agg}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleBuild}
            disabled={!config.rows || !config.values || building}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-excel-green text-white text-sm font-medium hover:bg-excel-green-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            {building ? "Building…" : "Build Pivot"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="flex-1 overflow-auto p-5">
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <PivotTable
                headers={results.headers}
                rows={results.rows}
                grandRow={results.grandRow}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <Settings2 size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 max-w-[200px]">
                Configure the fields above and click{" "}
                <strong>Build Pivot</strong> to see results.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}   