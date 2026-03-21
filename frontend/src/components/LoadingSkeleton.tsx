"use client";

import { motion } from "framer-motion";

export default function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <motion.div
      className="glass p-6 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <LoadingSkeleton className="h-4 w-32" />
      <LoadingSkeleton className="h-8 w-24" />
      <LoadingSkeleton className="h-3 w-full" />
      <LoadingSkeleton className="h-3 w-3/4" />
    </motion.div>
  );
}

export function ChartSkeleton() {
  return (
    <motion.div
      className="glass p-6 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <LoadingSkeleton className="h-4 w-48" />
      <LoadingSkeleton className="h-64 w-full" />
    </motion.div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <ChartSkeleton />
      <CardSkeleton />
    </div>
  );
}
