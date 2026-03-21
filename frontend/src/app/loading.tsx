"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <motion.div
      className="flex items-center justify-center min-h-[60vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="relative w-full h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] rounded-full animate-loading-bar" />
        </div>
        <motion.p
          className="text-sm text-[#9CA3AF]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Loading…
        </motion.p>
      </div>
    </motion.div>
  );
}
