import { useState, useRef, useEffect } from "react";

/**
 * Single spreadsheet cell.
 * Renders text or an input (when editing).
 *
 * @param {number} row
 * @param {number} col
 * @param {string} value
 * @param {boolean} isActive
 * @param {boolean} isEditing
 * @param {Function} onSelect
 * @param {Function} onEdit   - (initialChar?: string) => void
 * @param {Function} onCommit - (value: string) => void
 * @param {Function} onCancel
 */
export default function Cell({
  row,
  col,
  value,
  isActive,
  isEditing,
  onSelect,
  onEdit,
  onCommit,
  onCancel,
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  // Sync edit value when cell changes or editing starts
  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, value]);

  const handleCommit = () => {
    onCommit(editValue);
  };

  return (
    <td
      data-cell={`${row}-${col}`}
      className={`cell cursor-pointer ${isActive ? "active" : ""} ${
        isEditing ? "cell-editing" : ""
      }`}
      onClick={onSelect}
      onDoubleClick={() => onEdit()}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCommit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            } else if (e.key === "Tab") {
              e.preventDefault();
              handleCommit();
            }
          }}
        />
      ) : (
        <span className="block truncate leading-5">{value}</span>
      )}
    </td>
  );
}   