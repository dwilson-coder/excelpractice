import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Table,
  FunctionSquare,
  BarChart3,
  MousePointerClick,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const features = [
  {
    icon: Table,
    title: "Spreadsheet Grid",
    desc: "50 rows × 26 columns with editable cells, row/column headers, and multi-sheet support.",
  },
  {
    icon: FunctionSquare,
    title: "Formula Engine",
    desc: "Type =SUM, =AVERAGE, =VLOOKUP, =XLOOKUP directly into cells and see results instantly.",
  },
  {
    icon: BarChart3,
    title: "Pivot Tables",
    desc: "Group, aggregate, and summarize data with a drag-free pivot configuration panel.",
  },
  {
    icon: MousePointerClick,
    title: "Interactive Ribbon",
    desc: "A contextual ribbon with Home, Formulas, and Data tabs — just like the real thing.",
  },
];

export default function Home() {
  const { ref: heroRef, visible: heroVisible } = useScrollReveal();
  const { ref: featuresRef, visible: featuresVisible } = useScrollReveal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className={`relative flex flex-col items-center justify-center min-h-[85vh] px-6 text-center scroll-reveal ${heroVisible ? "visible" : ""}`}
      >
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--excel-green) 1px, transparent 1px), linear-gradient(90deg, var(--excel-green) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-excel-green-light text-excel-green text-sm font-medium mb-6 animate-pulse-glow">
            <Sparkles size={14} />
            Free · No sign-up · Practice anywhere
          </span>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Master Excel Formulas
            <br />
            <span className="text-excel-green">Without Excel</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            A lightweight, browser-based spreadsheet for practicing{" "}
            <strong>VLOOKUP</strong>, <strong>XLOOKUP</strong>,{" "}
            <strong>SUM</strong>, and <strong>Pivot Tables</strong> — no
            downloads, no accounts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/practice" className="btn-primary text-lg px-8 py-3">
              Start Practicing
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/about"
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-excel-green hover:text-excel-green transition-all hover-lift"
            >
              Formula Reference
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section
        ref={featuresRef}
        className="max-w-6xl mx-auto px-6 py-24"
      >
        <div className={`text-center mb-16 scroll-reveal ${featuresVisible ? "visible" : ""}`}>
          <h2 className="section-title">Everything you need to practice</h2>
          <p className="section-subtitle mx-auto">
            Four core tools, zero friction. Open the app and start typing
            formulas immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="glow-card group"
            >
              <div className="w-12 h-12 rounded-lg bg-excel-green-light flex items-center justify-center mb-4 group-hover:bg-excel-green transition-colors duration-300">
                <f.icon size={22} className="text-excel-green group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-excel-green to-excel-green-dark rounded-2xl p-10 md:p-14 text-center text-white"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to practice?
          </h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Jump into the spreadsheet and try your first formula. It takes
            less than 30 seconds.
          </p>
          <Link
            to="/practice"
            className="inline-flex items-center gap-2 bg-white text-excel-green font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Open Spreadsheet
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}   