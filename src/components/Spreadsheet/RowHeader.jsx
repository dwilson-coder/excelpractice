/**
 * Renders a single row header (number).
 *
 * @param {number} row - 0-based row index
 * @param {boolean} active
 * @param {Function} onSelect
 */
export default function RowHeader({ row, active, onSelect }) {
  return (
    <td
      className={`cell border border-gray-300 font-medium text-xs text-center cursor-pointer transition-all w-12 min-w-[3rem] sticky left-0 z-10 ${
        active
          ? "bg-excel-green text-white"
          : "bg-gray-100 text-gray-500 hover:bg-excel-green-light"
      }`}
      onClick={onSelect}
    >
      {row + 1}
    </td>
  );
}   