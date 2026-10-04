import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import RibbonTab from "./RibbonTab";
import RibbonButton from "./RibbonButton";

/**
 * Top ribbon bar with tabs and contextual buttons.
 *
 * @param {Array<{id:string, icon?:Function}>} tabs
 * @param {string} activeTab
 * @param {Function} onTabChange
 * @param {Array<{icon:Function, label:string, action:string}>} buttons
 * @param {Function} onAction
 */
export default function Ribbon({ tabs, activeTab, onTabChange, buttons, onAction }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="ribbon-bar">
      {/* ── Mobile Toggle ── */}
      <button
        className="md:hidden w-8 h-8 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle ribbon"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-0.5">
        {tabs.map((tab) => (
          <RibbonTab
            key={tab.id}
            id={tab.id}
            icon={tab.icon}
            active={activeTab === tab.id}
            onClick={() => {
              onTabChange(tab.id);
              setMobileOpen(false);
            }}
          />
        ))}
      </div>

      {/* ── Buttons (desktop: inline, mobile: dropdown) ── */}
      <div className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-white/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1"
          >
            {buttons.map((btn) => (
              <RibbonButton
                key={btn.action}
                icon={btn.icon}
                label={btn.label}
                onClick={() => onAction(btn.action)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Mobile Dropdown ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 bg-white shadow-lg border-b border-gray-200 p-3 md:hidden"
          >
            <div className="flex flex-wrap gap-2">
              {buttons.map((btn) => (
                <RibbonButton
                  key={btn.action}
                  icon={btn.icon}
                  label={btn.label}
                  onClick={() => onAction(btn.action)}
                  light
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}   