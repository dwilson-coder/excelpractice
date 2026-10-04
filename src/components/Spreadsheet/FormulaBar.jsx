import { useState, useEffect, useRef } from "react";
import { FunctionSquare } from "lucide-react";

/**
 * The formula bar: shows cell reference + current value/formula.
 *
 * @param {string} cellRef - e.g. "B4"
 * @param {string} value   - current cell content
 * @param {Function} onChange - (newValue) => void
 */
export default function FormulaBar({ cellRef, value, onChange }) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);

  // Sync when active cell changes
  useEffect(() => {
    setInputValue(value);
  }, [value, cellRef]);

  const handleCommit = () => {
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  return (
    <div className="formula-bar">
      {/* Cell reference badge */}
      <div className="flex items-center gap-1.5 min-w-[4rem]">
        <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200">
          {cellRef}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-gray-200" />

      {/* fx label */}
      <span className="fx text-sm">fx</span>

      {/* Input */}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCommit();
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            setInputValue(value);
            inputRef.current?.blur();
          }
        }}
        placeholder="Enter a value or formula (e.g. =SUM(A1:A10))"
        className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:text-gray-400"
      />
    </div>
  );
}   