import { motion } from "framer-motion";

/** Floating gradient orbs for ambient background decoration */
export function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          top: "10%",
          left: "5%",
        }}
        animate={{
          y: [0, -20, 10, 0],
          x: [0, 10, -5, 0],
          scale: [1, 1.05, 0.97, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full opacity-[0.025]"
        style={{
          background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
          top: "60%",
          right: "10%",
        }}
        animate={{
          y: [0, 15, -10, 0],
          x: [0, -8, 12, 0],
          scale: [1, 0.95, 1.03, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full opacity-[0.02]"
        style={{
          background: "radial-gradient(circle, #06b6d4, transparent 70%)",
          bottom: "20%",
          left: "40%",
        }}
        animate={{
          y: [0, -12, 8, 0],
          x: [0, 15, -10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
