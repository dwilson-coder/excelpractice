import { motion } from "framer-motion";

/**
 * Individual ribbon tab (Home, Formulas, Data, etc.)
 *
 * @param {string} id
 * @param {Function} icon - Lucide icon component
 * @param {boolean} active
 * @param {Function} onClick
 */
export default function RibbonTab({ id, icon: Icon, active, onClick }) {
  return (
    <motion.button
      layout
      className={`ribbon-tab relative ${active ? "active" : ""}`}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      <span className="flex items-center gap-1.5">
        {Icon && <Icon size={13} />}
        {id}
      </span>

      {/* Active underline indicator */}
      {active && (
        <motion.span
          layoutId="ribbon-tab-indicator"
          className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
        />
      )}
    </motion.button>
  );
}   