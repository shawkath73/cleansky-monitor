"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchForecast } from "@/lib/api";
import { getAQICategory, getAQIColorByValue, getAQIEmoji } from "@/lib/aqi";
import type { ForecastItem, ForecastSummary } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { ChartSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  ArrowDown,
  ArrowUp,
  Clock,
} from "lucide-react";

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

const STAT_ICONS: Record<string, React.ReactNode> = {
  "Average AQI": <BarChart3 className="w-5 h-5 text-[#7C9CFF]" />,
  Minimum: <ArrowDown className="w-5 h-5 text-[#34D399]" />,
  Maximum: <ArrowUp className="w-5 h-5 text-[#EF4444]" />,
  "Hours Covered": <Clock className="w-5 h-5 text-[#94A3B8]" />,
};

export default function ForecastPage() {
  const { city, lat, lon } = useCity();
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchForecast(city, lat, lon);
        if (cancelled) return;
        setForecast(res.forecast);
        setSummary(res.summary);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load forecast");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [city, lat, lon]);

  if (loading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
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
        </div>
      </GlassCard>
    );
  }

  // Chart data
  const chartData = forecast.map((item) => {
    const dt = new Date(item.datetime || item.timestamp);
    return {
      time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: dt.toLocaleDateString([], { month: "short", day: "numeric" }),
      aqi: Math.round(item.aqi),
      color: getAQIColorByValue(item.aqi),
    };
  });

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#E2E8F0] leading-tight">
          48-Hour AQI <span>Forecast</span>
        </h1>
        <p className="text-[#64748B] text-sm mt-2 uppercase tracking-widest">
          Predictive trends <span className="text-[#7C9CFF]">{city}</span>
        </p>
      </motion.div>

      {/* Summary stats */}
      {summary && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={fadeUp}
        >
          {[
            { label: "Average AQI", value: summary.avg_aqi },
            { label: "Minimum", value: summary.min_aqi },
            { label: "Maximum", value: summary.max_aqi },
            { label: "Hours Covered", value: summary.hours },
          ].map((stat) => (
            <GlassCard
              key={stat.label}
              animate={false}
              className="text-center py-4"
            >
              <div className="flex justify-center">
                {STAT_ICONS[stat.label]}
              </div>
              <p className="text-2xl font-bold text-[#E2E8F0] mt-1">
                {typeof stat.value === "number"
                  ? Math.round(stat.value)
                  : stat.value}
              </p>
              <p className="text-xs text-[#64748B] mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </GlassCard>
          ))}
        </motion.div>
      )}

      {/* Large chart */}
      <motion.div variants={fadeUp}>
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            AQI Trend Over Time
          </h2>
          <div
            className="overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
            <div className="h-80" style={{ minWidth: "600px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="forecastGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#7C9CFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7C9CFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  {/* AQI Zone backgrounds */}
                  <ReferenceArea
                    y1={0}
                    y2={50}
                    fill="#7C9CFF"
                    fillOpacity={0.03}
                  />
                  <ReferenceArea
                    y1={50}
                    y2={100}
                    fill="#34D399"
                    fillOpacity={0.03}
                  />
                  <ReferenceArea
                    y1={100}
                    y2={200}
                    fill="#FBBF24"
                    fillOpacity={0.03}
                  />
                  <ReferenceArea
                    y1={200}
                    y2={300}
                    fill="#F97316"
                    fillOpacity={0.03}
                  />
                  <ReferenceArea
                    y1={300}
                    y2={500}
                    fill="#EF4444"
                    fillOpacity={0.03}
                  />
                  {/* Reference lines for boundaries */}
                  <ReferenceLine
                    y={50}
                    stroke="#7C9CFF"
                    strokeDasharray="3 3"
                    strokeOpacity={0.2}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#34D399"
                    strokeDasharray="3 3"
                    strokeOpacity={0.2}
                  />
                  <ReferenceLine
                    y={200}
                    stroke="#FBBF24"
                    strokeDasharray="3 3"
                    strokeOpacity={0.2}
                  />
                  <ReferenceLine
                    y={300}
                    stroke="#F97316"
                    strokeDasharray="3 3"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    interval={Math.floor(chartData.length / 8)}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #1E293B",
                      borderRadius: "12px",
                      color: "#E2E8F0",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${value}`, "AQI"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    stroke="#7C9CFF"
                    strokeWidth={2}
                    fill="url(#forecastGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#7C9CFF" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Hourly cards */}
      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
          Hourly Breakdown
        </h2>

        {/* Mobile: horizontal scroll | Laptop+: wrapping grid */}
        {/* Mobile scroll strip */}
        <div
          className="md:hidden overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`.hourly-strip::-webkit-scrollbar { display: none; }`}</style>
          <div className="hourly-strip flex gap-2 w-max">
            {forecast.map((item, idx) => {
              const dt = new Date(item.datetime || item.timestamp);
              const category = item.category || getAQICategory(item.aqi);
              const color = getAQIColorByValue(item.aqi);
              const barPct = Math.min(Math.round((item.aqi / 500) * 100), 100);
              return (
                <motion.div
                  key={idx}
                  className="flex flex-col items-center gap-1 glass-light rounded-2xl pt-3 pb-2 px-3 cursor-default relative overflow-hidden"
                  style={{ minWidth: "68px" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.015 }}
                  whileHover={{ scale: 1.06, y: -3 }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                    style={{ background: color }}
                  />
                  <span className="text-[10px] text-[#64748B] font-medium tabular-nums">
                    {dt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-end gap-1.5 mt-1">
                    <div className="w-1.5 bg-[#1E293B]/40 rounded-full h-8 flex items-end overflow-hidden">
                      <div
                        className="w-full rounded-full transition-all"
                        style={{ height: `${barPct}%`, background: color }}
                      />
                    </div>
                    <span
                      className="text-lg font-bold leading-none"
                      style={{ color }}
                    >
                      {Math.round(item.aqi)}
                    </span>
                  </div>
                  <span className="text-sm leading-none mt-0.5">
                    {getAQIEmoji(category)}
                  </span>
                  <span className="text-[9px] text-[#64748B] font-medium uppercase tracking-wide mt-0.5 text-center leading-tight">
                    {category}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Laptop+ wrapping grid — groups by day */}
        <div className="hidden md:block space-y-5">
          {Array.from(
            forecast.reduce((acc, item) => {
              const dt = new Date(item.datetime || item.timestamp);
              const key = dt.toDateString();
              if (!acc.has(key))
                acc.set(key, {
                  label: dt.toLocaleDateString([], {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  }),
                  items: [],
                });
              acc.get(key)!.items.push(item);
              return acc;
            }, new Map<string, { label: string; items: typeof forecast }>()),
          ).map(([key, group]) => (
            <div key={key}>
              {/* Day label */}
              <p className="text-xs text-[#7C9CFF] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="inline-block w-4 h-px bg-[#7C9CFF]/40" />
                {group.label}
              </p>
              <div className="grid grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-2">
                {group.items.map((item, idx) => {
                  const dt = new Date(item.datetime || item.timestamp);
                  const category = item.category || getAQICategory(item.aqi);
                  const color = getAQIColorByValue(item.aqi);
                  const barPct = Math.min(
                    Math.round((item.aqi / 500) * 100),
                    100,
                  );
                  return (
                    <motion.div
                      key={idx}
                      className="flex flex-col items-center gap-1 glass-light rounded-2xl pt-3 pb-2 px-2 cursor-default relative overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.02 }}
                      whileHover={{ scale: 1.05, y: -3 }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                        style={{ background: color }}
                      />
                      <span className="text-[10px] text-[#64748B] font-medium tabular-nums">
                        {dt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="flex items-end gap-1 mt-1">
                        <div className="w-1.5 bg-[#1E293B]/40 rounded-full h-7 flex items-end overflow-hidden">
                          <div
                            className="w-full rounded-full transition-all"
                            style={{ height: `${barPct}%`, background: color }}
                          />
                        </div>
                        <span
                          className="text-base font-bold leading-none"
                          style={{ color }}
                        >
                          {Math.round(item.aqi)}
                        </span>
                      </div>
                      <span className="text-sm leading-none mt-0.5">
                        {getAQIEmoji(category)}
                      </span>
                      <span className="text-[9px] text-[#64748B] font-medium uppercase tracking-wide mt-0.5 text-center leading-tight">
                        {category}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
