"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import {
  fetchCurrentAQI,
  fetchForecast,
  fetchHealthRisk,
  fetchPollutants,
} from "@/lib/api";
import { getAQICategory, getAQIColorByValue, getAQIEmoji } from "@/lib/aqi";
import type {
  AQIData,
  ForecastItem,
  HealthRiskData,
  PollutantDetail,
} from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import AQIGauge from "@/components/AQIGauge";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import LoadingScreen from "./loading";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export default function Dashboard() {
  const { city } = useCity();
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [healthRisk, setHealthRisk] = useState<HealthRiskData | null>(null);
  const [pollutants, setPollutants] = useState<PollutantDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [aqiRes, forecastRes, pollutantsRes] = await Promise.all([
          fetchCurrentAQI(city),
          fetchForecast(city),
          fetchPollutants(city),
        ]);

        if (cancelled) return;

        setAqiData(aqiRes.data);
        setForecast(forecastRes.forecast.slice(0, 24));
        setPollutants(pollutantsRes.pollutants);

        // Fetch health risk with the AQI value
        const healthRes = await fetchHealthRisk(aqiRes.data.aqi);
        if (!cancelled) setHealthRisk(healthRes.data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [city]);

  if (loading) {
    if (!aqiData) return <LoadingScreen />;
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-[#F97316] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#E2E8F0] mb-2">
            Connection Error
          </h2>
          <p className="text-[#94A3B8]">{error}</p>
          <p className="text-[#64748B] text-sm mt-2">
            Make sure the Flask backend is running on port 5000
          </p>
        </div>
      </GlassCard>
    );
  }

  const aqi = aqiData?.aqi ?? 0;
  const category = aqiData?.category ?? getAQICategory(aqi);
  const color = getAQIColorByValue(aqi);

  // Prepare chart data
  const chartData = forecast.map((item) => ({
    time: new Date(item.datetime || item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    aqi: Math.round(item.aqi),
  }));

  // Top pollutants for bars
  const topPollutants = pollutants.slice(0, 5);
  const maxPollutantPct = Math.max(
    ...topPollutants.map((p) => p.percentage),
    1,
  );

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Hero Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#E2E8F0] leading-tight">
          Real-time Air Quality
        </h1>
        <p className="text-[#64748B] text-sm mt-2 uppercase tracking-widest">
          Monitoring <span className="text-[#7C9CFF]">{city}</span> Updated
          every 5 minutes
        </p>
      </motion.div>

      {/* Row 1: AQI Gauge + Health Risk */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={fadeUp}
      >
        {/* AQI Gauge card */}
        <GlassCard
          className="flex flex-col items-center justify-center"
          delay={1}
        >
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            Current AQI
          </h2>
          <AQIGauge aqi={aqi} size={220} />
          <div className="mt-4 text-center">
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {getAQIEmoji(category)} {category}
            </span>
            {aqiData?.dominant_pollutant && (
              <p className="text-[#64748B] text-xs mt-2">
                Dominant pollutant:{" "}
                <span className="text-[#94A3B8]">
                  {aqiData.dominant_pollutant}
                </span>
              </p>
            )}
          </div>
        </GlassCard>

        {/* Health Risk card */}
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            Health Risk
          </h2>
          {healthRisk && (
            <div className="space-y-4">
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  backgroundColor: `${color}15`,
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <span className="text-3xl">{healthRisk.emoji}</span>
                <div>
                  <p className="text-lg font-semibold text-[#E2E8F0]">
                    {healthRisk.category} Risk
                  </p>
                  <p className="text-sm text-[#94A3B8]">
                    AQI: {Math.round(aqi)}
                  </p>
                </div>
              </div>

              <p className="text-[#94A3B8] text-sm leading-relaxed">
                {healthRisk.recommendation}
              </p>

              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-widest mb-2">
                  Suggested Actions
                </p>
                <ul className="space-y-1.5">
                  {healthRisk.actions.slice(0, 3).map((action, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[#94A3B8]"
                    >
                      <ChevronRight
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color }}
                      />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Row 2: Forecast chart */}
      <motion.div variants={fadeUp}>
        <GlassCard delay={3}>
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#7C9CFF]" />
            24-Hour AQI Forecast
          </h2>
          <div
            className="overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
            <div className="h-64" style={{ minWidth: "600px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C9CFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C9CFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #1E293B",
                      borderRadius: "12px",
                      color: "#E2E8F0",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    stroke="#7C9CFF"
                    strokeWidth={2}
                    fill="url(#aqiGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#7C9CFF" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Row 3: Pollutant breakdown */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            Pollutant Breakdown
          </h2>
          <div className="space-y-3">
            {topPollutants.map((pol, i) => (
              <div key={pol.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#E2E8F0]">
                    {pol.name}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {pol.value.toFixed(1)} {pol.unit} ·{" "}
                    {pol.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(pol.percentage / maxPollutantPct) * 100}%`,
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                    style={{
                      backgroundColor:
                        pol.status === "exceeded" ? "#F97316" : "#7C9CFF",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
