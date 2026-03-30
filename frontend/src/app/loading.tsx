"use client";

import { motion } from "framer-motion";
import { CloudSun } from "lucide-react";

export default function Loading() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "#0d0e10" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(13,240,158,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Grid overlay (matches body background) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "calc(100vw / 7) calc(100vh / 6)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        {/* Icon with pulsing glow ring */}
        <div className="relative">
          {/* Outer glow ring */}
          <motion.div
            className="absolute -inset-6 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(13,240,158,0.12) 0%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Inner glow ring */}
          <motion.div
            className="absolute -inset-3 rounded-full"
            style={{
              border: "1px solid rgba(13,240,158,0.15)",
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />

          {/* Icon */}
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <CloudSun className="w-12 h-12 text-[#0DF09E] relative z-10" />
          </motion.div>
        </div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-[#E8F5EE] tracking-widest uppercase">
            Clean<span className="text-[#0DF09E]">Sky</span>
          </h1>
          <motion.p
            className="text-xs text-[#3B7A5A] mt-1 tracking-[0.3em] uppercase"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Air Quality Monitor
          </motion.p>
        </motion.div>

        {/* Loading bar */}
        <div className="w-48">
          <div className="relative w-full h-[3px] bg-[#1a1b1e] rounded-full overflow-hidden">
            <motion.div
              className="absolute h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #0DF09E, #6EE7B7, transparent)",
              }}
              animate={{
                left: ["-40%", "100%"],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              initial={{ width: "40%", left: "-40%" }}
            />
          </div>

          {/* Scanning dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#0DF09E]"
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
