import { toCellRef } from "../../utils";

/**
 * Renders a row of column headers (A, B, C, … Z).
 *
 * @param {number} cols - total number of columns
 * @param {number} activeCol - currently selected column index
 * @param {Function} onSelect - (colIndex) => void
 */
export default function ColumnHeader({ cols, activeCol, onSelect }) {
  return (
    <>
      {Array.from({ length: cols }, (_, c) => {
        const label = toCellRef(0, c).replace(/\d/g, "");
        const isActive = activeCol === c;
        return (
          <th
            key={c}
            className={`cell border border-gray-300 font-medium text-xs text-center cursor-pointer transition-all min-w-[4rem] ${
              isActive
                ? "bg-excel-green text-white"
                : "bg-gray-100 text-gray-600 hover:bg-excel-green-light"
            }`}
            onClick={() => onSelect(c)}
          >
            {label}
          </th>
        );
      })}
    </>
  );
}   