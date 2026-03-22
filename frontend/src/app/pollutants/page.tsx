"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchPollutants } from "@/lib/api";
import type { PollutantDetail } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const CHART_COLORS = [
  "#86EFAC", // Pale Green
  "#93C5FD", // Pale Blue
  "#FCD34D", // Pale Gold/Amber
  "#F9A8D4", // Pale Pink
  "#C4B5FD", // Pale Violet
  "#5EEAD4", // Pale Teal
  "#FDA4AF"  // Pale Rose
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function PollutantsPage() {
  const { city } = useCity();
  const [pollutants, setPollutants] = useState<PollutantDetail[]>([]);
  const [dominantPollutant, setDominantPollutant] = useState("");
  const [, setCurrentAQI] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchPollutants(city);
        if (cancelled) return;
        setPollutants(res.pollutants);
        setDominantPollutant(res.dominant_pollutant);
        setCurrentAQI(res.current_aqi);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [city]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-[#F97316] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#E8F5EE] mb-2">Connection Error</h2>
          <p className="text-[#6EE7B7]">{error}</p>
        </div>
      </GlassCard>
    );
  }

  // Donut data
  const donutData = pollutants.map((p) => ({
    name: p.name,
    value: p.percentage,
  }));

  // Bar chart data — actual vs WHO limit
  const barData = pollutants.slice(0, 6).map((p) => ({
    name: p.name,
    Actual: p.value,
    "WHO Limit": p.who_limit,
  }));

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#E8F5EE] leading-tight">
          Pollution <span >Contributors</span>
        </h1>
        <p className="text-[#3B7A5A] text-sm mt-2 uppercase tracking-widest">
          Breakdown · <span className="text-[#0DF09E]">{city}</span>
          {dominantPollutant && (
            <> · Dominant: <span className="text-[#F97316]">{dominantPollutant}</span></>
          )}
        </p>
      </motion.div>

      {/* Row 1: Donut + Bar */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={fadeUp}>
        {/* Donut Chart */}
        <GlassCard delay={1}>
          <h2 className="text-sm font-medium text-[#3B7A5A] uppercase tracking-widest mb-4">
            Contribution Breakdown
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#041F15",
                    border: "1px solid #0A4D30",
                    borderRadius: "12px",
                    color: "#E8F5EE",
                  }}
                  
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, "Share"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {donutData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-xs text-[#6EE7B7]">
                  {d.name} ({d.value.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Bar Chart — vs WHO */}
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#3B7A5A] uppercase tracking-widest mb-4">
            Actual vs WHO Limits
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#06331F" />
                <XAxis
                  dataKey="name"
                  stroke="#3B7A5A"
                  tick={{ fill: "#6EE7B7", fontSize: 11 }}
                />
                <YAxis
                  stroke="#3B7A5A"
                  tick={{ fill: "#6EE7B7", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#041F15",
                    border: "1px solid #0A4D30",
                    borderRadius: "12px",
                    color: "#E8F5EE",
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#6EE7B7", fontSize: 12 }}
                />
                <Bar dataKey="Actual" fill="#0DF09E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="WHO Limit" fill="#0A4D30" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </motion.div>

      {/* Row 2: Pollutant detail cards */}
      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-medium text-[#3B7A5A] uppercase tracking-widest mb-4">
          Pollutant Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pollutants.map((p, i) => {
            const exceeded = p.status === "exceeded";
            return (
              <motion.div
                key={p.name}
                className="glass-light p-4 rounded-xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#E8F5EE]">{p.name}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      exceeded
                        ? "bg-red-500/20 text-red-400"
                        : "bg-[#0DF09E]/15 text-[#0DF09E]"
                    }`}
                  >
                    {exceeded ? "Exceeded" : "Safe"}
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#E8F5EE]">
                  {p.value.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-[#3B7A5A]">{p.unit}</span>
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-[#3B7A5A]">
                  <span>WHO Limit: {p.who_limit} {p.unit}</span>
                  {exceeded && (
                    <span className="text-red-400">+{p.exceeded_by.toFixed(1)}</span>
                  )}
                </div>
                {/* Percentage bar */}
                <div className="h-1.5 bg-[#06331F] rounded-full mt-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((p.value / p.who_limit) * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                    style={{
                      backgroundColor: exceeded ? "#EF4444" : "#0DF09E",
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
