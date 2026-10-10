import { motion, AnimatePresence } from "framer-motion";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Table2, BookOpen, Sparkles } from "lucide-react";
import Footer from "./Footer";
import { CookieConsent } from "../Cookies";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Sparkles },
  { to: "/practice", label: "Practice", icon: Table2 },
  { to: "/about", label: "Reference", icon: BookOpen },
];

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Nav ── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-excel-green flex items-center justify-center group-hover:bg-excel-green-dark transition-colors">
              <Table2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">
              Excel<span className="text-excel-green">Practice</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? "text-excel-green bg-excel-green-light"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>

                  {/* Active indicator */}
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-excel-green rounded-full"
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Page Content (with route transition) ── */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <Footer />
      <CookieConsent />
    </div>
  );
}   