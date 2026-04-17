"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

// Leaflet must be loaded client-side only (no SSR)
const AQIMap = dynamic(() => import("@/components/AQIMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "75vh",
        borderRadius: "16px",
        background: "rgba(20, 21, 24, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div className="skeleton" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
        <div className="skeleton" style={{ width: "120px", height: "12px" }} />
      </div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#E2E8F0] leading-tight flex items-center gap-3">
          <Globe className="w-8 h-8 text-[#78EAF8]" />
          Global AQI Map
        </h1>
        <p className="text-[#64748B] text-sm mt-2 uppercase tracking-widest">
          Real-time air quality data across the{" "}
          <span className="text-[#78EAF8]">world</span> · Click any station for
          details
        </p>
      </div>

      {/* Map */}
      <div style={{ height: "75vh", minHeight: "500px" }}>
        <AQIMap />
      </div>
    </motion.div>
  );
}
