"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

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
        <div
          className="skeleton"
          style={{ width: "32px", height: "32px", borderRadius: "50%" }}
        />
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
      className="space-y-4"
    >
      <div className="px-1">
        <p className="page-kicker">
          Tactical map interface · live station intelligence
        </p>
      </div>

      <div style={{ height: "80vh", minHeight: "560px" }}>
        <AQIMap />
      </div>
    </motion.div>
  );
}
