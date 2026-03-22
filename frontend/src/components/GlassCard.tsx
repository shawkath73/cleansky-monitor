"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export default function GlassCard({
  children,
  className = "",
  animate = true,
  delay = 0,
}: GlassCardProps) {
  if (!animate) {
    return <div className={`glass p-6 rounded-2xl ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      className={`glass p-6 rounded-2xl ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delay * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}
