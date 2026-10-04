import { motion } from "framer-motion";

/**
 * Individual ribbon button with icon + label.
 * Supports a `light` variant for the mobile dropdown (white bg).
 *
 * @param {Function} icon - Lucide icon component
 * @param {string} label
 * @param {Function} onClick
 * @param {boolean} light - use light styling (for mobile dropdown)
 */
export default function RibbonButton({ icon: Icon, label, onClick, light = false }) {
  return (
    <motion.button
      className={`ribbon-btn ${light ? "!bg-white !text-gray-700 !border-gray-200" : ""}`}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.92, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 400 }}
      title={label}
    >
      <Icon size={16} className={light ? "text-gray-600" : "text-gray-500"} />
      <span className="text-[0.65rem] leading-tight text-center">{label}</span>
    </motion.button>
  );
}   