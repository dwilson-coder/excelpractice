import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useSheet } from "../../store/useSheet";

/**
 * Bottom sheet tab bar with add, remove, rename, and switch.
 * Auto-scrolls to keep the active tab visible.
 */
export default function SheetTabs() {
  const { sheets, activeSheetId, addSheet, removeSheet, renameSheet, switchSheet } =
    useSheet();
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const containerRef = useRef(null);
  const activeTabRef = useRef(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeSheetId]);

  // ── Rename handlers ──
  const startRename = (sheet) => {
    setRenamingId(sheet.id);
    setRenameValue(sheet.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameSheet(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  // ── Remove with confirm ──
  const handleRemove = (id) => {
    if (sheets.length <= 1) return;
    if (confirmRemove === id) {
      removeSheet(id);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(id);
      // Auto-cancel after 2s
      setTimeout(() => setConfirmRemove(null), 2000);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex items-end gap-0.5 px-3 py-1.5 bg-gray-100 border-t border-gray-200 overflow-x-auto"
      style={{ scrollbarWidth: "thin" }}
    >
      {/* ── Sheet Tabs ── */}
      <AnimatePresence initial={false}>
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          const isRenaming = renamingId === sheet.id;
          const isConfirming = confirmRemove === sheet.id;

          return (
            <motion.div
              key={sheet.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="relative flex-shrink-0"
            >
              <div
                ref={isActive ? activeTabRef : null}
                className={`sheet-tab group flex items-center gap-1.5 ${
                  isActive ? "active" : ""
                }`}
                onClick={() => !isRenaming && switchSheet(sheet.id)}
                onDoubleClick={() => startRename(sheet)}
              >
                {/* Tab label or rename input */}
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") cancelRename();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-16 bg-white border border-excel-green rounded px-1 text-xs outline-none"
                  />
                ) : (
                  <span className="max-w-[80px] truncate">{sheet.name}</span>
                )}

                {/* Rename icon (visible on hover, not active) */}
                {!isActive && !isRenaming && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center hover:text-excel-green"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(sheet);
                    }}
                    title="Rename"
                  >
                    <Pencil size={10} />
                  </button>
                )}

                {/* Remove icon */}
                {sheets.length > 1 && !isRenaming && (
                  <button
                    className={`w-4 h-4 flex items-center justify-center transition-all ${
                      isConfirming
                        ? "text-white bg-red-500 rounded"
                        : "opacity-0 group-hover:opacity-100 hover:text-red-500"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(sheet.id);
                    }}
                    title={isConfirming ? "Click again to confirm" : "Remove sheet"}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>

              {/* Confirm remove tooltip */}
              {isConfirming && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-red-600 text-white text-[0.65rem] rounded whitespace-nowrap z-20"
                >
                  Remove? Click again
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-600" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── Add Sheet Button ── */}
      <motion.button
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-excel-green hover:bg-excel-green-light border border-dashed border-gray-300 hover:border-excel-green transition-all"
        onClick={addSheet}
        title="Add new sheet"
      >
        <Plus size={14} />
      </motion.button>
    </div>
  );
}   