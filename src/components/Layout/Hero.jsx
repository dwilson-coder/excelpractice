import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useMousePosition } from "../../hooks/useMousePosition";

/**
 * Full-viewport hero section with parallax scroll,
 * animated grid background, and mouse-tracking glow.
 */
export default function Hero({ title, subtitle, children }) {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax transforms
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const { ref: glowRef, onMouseMove, onMouseLeave } = useMousePosition();

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* ── Animated Grid Background ── */}
      <motion.div
        style={{ y }}
        className="absolute inset-0"
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--excel-green) 1px, transparent 1px), linear-gradient(90deg, var(--excel-green) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Floating accent cells */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[10%] w-20 h-8 rounded border border-excel-green/20 bg-excel-green/5"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[60%] right-[15%] w-28 h-8 rounded border border-excel-green/15 bg-excel-green/5"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-[25%] left-[25%] w-16 h-7 rounded border border-blue-400/15 bg-blue-400/5"
        />
      </motion.div>

      {/* ── Mouse-tracking Glow ── */}
      <div
        ref={glowRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(33,115,70,0.05), transparent 60%)",
        }}
      />

      {/* ── Content ── */}
      <motion.div
        style={{ opacity, scale }}
        className="relative z-10 text-center px-6 max-w-3xl mx-auto"
      >
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl text-gray-500 mb-10"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {children}
        </motion.div>
      </motion.div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center pt-2"
        >
          <div className="w-1.5 h-3 rounded-full bg-gray-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}   