"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchForecast } from "@/lib/api";
import { getAQICategory, getAQIColorByValue, getAQIEmoji } from "@/lib/aqi";
import type { ForecastItem, ForecastSummary } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { ChartSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { motion } from "framer-motion";
import { AlertTriangle, CloudMoon, Sunrise, Wind } from "lucide-react";

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

type StatTone = "cyan" | "neutral" | "rose";

const TONE_CLASSES: Record<
  StatTone,
  { edge: string; value: string; meter: string; cap: string }
> = {
  cyan: {
    edge: "border-l-[#7DEFFF]",
    value: "text-[#D9FAFF]",
    meter: "bg-[#78EAF8]",
    cap: "text-[#7DEFFF]",
  },
  neutral: {
    edge: "border-l-[#B8C2D9]",
    value: "text-[#E5EAF8]",
    meter: "bg-[#B8C2D9]",
    cap: "text-[#B8C2D9]",
  },
  rose: {
    edge: "border-l-[#FFB1A8]",
    value: "text-[#FFE4E0]",
    meter: "bg-[#FFB1A8]",
    cap: "text-[#FFB1A8]",
  },
};

function formatSlotLabel(item: ForecastItem) {
  const dt = new Date(
    item.datetime ?? item.timestamp ?? new Date().toISOString(),
  );
  const end = item.end_datetime ? new Date(item.end_datetime) : null;
  return end
    ? `${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}-${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayTime(item: ForecastItem) {
  const dt = new Date(
    item.datetime ?? item.timestamp ?? new Date().toISOString(),
  );
  return `${dt.toLocaleDateString([], { weekday: "short" }).toUpperCase()} ${dt.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )}`;
}

export default function ForecastPage() {
  const { city, lat, lon } = useCity();
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [breakdownHours, setBreakdownHours] = useState<1 | 6 | 12>(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchForecast(city, lat, lon, breakdownHours);
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
  }, [city, lat, lon, breakdownHours]);

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

  const targetBuckets =
    breakdownHours === 1 ? forecast.length : Math.ceil(48 / breakdownHours);
  const displayForecast = forecast.slice(0, targetBuckets);

  const avgAqi = summary
    ? Math.round(summary.avg_aqi)
    : Math.round(
        displayForecast.reduce((acc, item) => acc + item.aqi, 0) /
          Math.max(displayForecast.length, 1),
      );
  const minAqi = summary
    ? Math.round(summary.min_aqi)
    : Math.round(Math.min(...displayForecast.map((item) => item.aqi), 0));
  const maxAqi = summary
    ? Math.round(summary.max_aqi)
    : Math.round(Math.max(...displayForecast.map((item) => item.aqi), 0));

  const chartData = displayForecast.map((item) => {
    return {
      time: formatSlotLabel(item),
      aqi: Math.round(item.aqi),
      color: getAQIColorByValue(item.aqi),
    };
  });

  const chartTickPositions = [
    0,
    Math.floor((chartData.length - 1) * 0.25),
    Math.floor((chartData.length - 1) * 0.5),
    Math.floor((chartData.length - 1) * 0.75),
    Math.max(chartData.length - 1, 0),
  ];

  const readoutItems = displayForecast.slice(
    0,
    Math.min(displayForecast.length, 6),
  );

  return (
    <motion.div
      className="space-y-6 md:space-y-7 pb-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] sm:text-[10px] text-[#79D7F0] uppercase tracking-[0.26em] sm:tracking-[0.32em] font-semibold mb-2">
              Atmospheric Outlook
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-[#DDE8FF] leading-[0.95] tracking-[-0.03em]">
              48-Hour Air Quality Forecast
            </h1>
            <p className="text-[#7E8BA7] text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.28em] mt-3 sm:mt-4">
              Live trend stream · {city}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-[#1A2437]/80 bg-[#0B111D]/80 p-1 gap-1 self-start lg:self-auto w-full sm:w-auto justify-between sm:justify-start">
            {[1, 6, 12].map((h) => {
              const active = breakdownHours === h;
              return (
                <button
                  key={h}
                  onClick={() => setBreakdownHours(h as 1 | 6 | 12)}
                  className={`px-3 sm:px-4 py-1.5 text-[10px] rounded-md transition-all uppercase tracking-[0.18em] sm:tracking-[0.25em] font-semibold ${
                    active
                      ? "bg-[#8CB6FF] text-[#05142A]"
                      : "text-[#7A869F] hover:text-[#D8E6FF] hover:bg-[#1A2437]/70"
                  }`}
                >
                  {h}H
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
        variants={fadeUp}
      >
        {[
          { label: "Predicted Average", value: avgAqi, tone: "cyan" as const },
          { label: "Period Minimum", value: minAqi, tone: "neutral" as const },
          { label: "Period Maximum", value: maxAqi, tone: "rose" as const },
        ].map((stat) => {
          const tone = TONE_CLASSES[stat.tone];
          const meter = Math.min(Math.round((stat.value / 500) * 100), 100);
          return (
            <GlassCard
              key={stat.label}
              animate={false}
              className={`border-l-2 ${tone.edge} px-4 sm:px-6 py-4 sm:py-5`}
            >
              <p className="text-[9px] uppercase tracking-[0.24em] font-semibold text-[#8A95AE] mb-3">
                {stat.label}
              </p>
              <div className="flex items-end gap-2">
                <p
                  className={`text-4xl sm:text-[44px] md:text-5xl font-extrabold leading-none ${tone.value}`}
                >
                  {stat.value}
                </p>
                <p
                  className={`text-[9px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] pb-1 font-semibold ${tone.cap}`}
                >
                  AQI US
                </p>
              </div>
              <div className="h-1.5 mt-5 rounded-full bg-[#1E2736] overflow-hidden">
                <div
                  className={`h-full rounded-full ${tone.meter}`}
                  style={{ width: `${meter}%` }}
                />
              </div>
            </GlassCard>
          );
        })}
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard animate={false} className="p-0 overflow-hidden">
          <div className="px-4 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-8 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#E3EBFF] tracking-[-0.02em]">
                Temporal AQI Distribution
              </h2>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.17em] sm:tracking-[0.24em] text-[#7D879E] mt-1">
                Satellite Reanalysis & ML Correction
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#98A2B9] self-start sm:self-auto">
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7CE9F8]" />
                Good
              </div>
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F1ADA6]" />
                Moderate
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4 md:px-6 pb-4 md:pb-6">
            <div className="h-[260px] sm:h-[320px] md:h-[360px] rounded-xl bg-[#0D1524]/70 border border-[#1B2638] px-1 pt-2 md:px-3 md:pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 16, right: 8, left: 8, bottom: 20 }}
                >
                  <ReferenceArea
                    y1={0}
                    y2={50}
                    fill="#66DFF2"
                    fillOpacity={0.07}
                  />
                  <ReferenceArea
                    y1={50}
                    y2={220}
                    fill="#F0A8A2"
                    fillOpacity={0.08}
                  />
                  <CartesianGrid
                    stroke="#1E2B3F"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#44516A"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6C7791", fontSize: 10 }}
                    interval={0}
                    tickFormatter={(_, idx) => {
                      if (!chartTickPositions.includes(idx)) {
                        return "";
                      }
                      if (idx === 0) return "NOW";
                      const step = Math.round(
                        (idx / Math.max(chartData.length - 1, 1)) * 48,
                      );
                      return `${step}H`;
                    }}
                  />
                  <YAxis
                    stroke="#44516A"
                    tick={{ fill: "#6C7791", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 220]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1220",
                      border: "1px solid #1A2A42",
                      borderRadius: "10px",
                      color: "#DAE5FF",
                      fontSize: "12px",
                    }}
                    labelStyle={{
                      color: "#8EA0C5",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                    formatter={(value) => [`${value ?? "-"}`, "AQI"]}
                  />
                  <Bar
                    dataKey="aqi"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive
                    animationDuration={550}
                  >
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.aqi <= 100 ? "#66DFF2" : "#E8A9A1"}
                        fillOpacity={0.72}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <p className="text-[9px] sm:text-[10px] text-[#9DACCA] uppercase tracking-[0.2em] sm:tracking-[0.28em] font-semibold mb-3 sm:mb-4">
          Sequential Data Readout
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {readoutItems.map((item, idx) => {
            const category = item.category || getAQICategory(item.aqi);
            const color = getAQIColorByValue(item.aqi);
            const icon =
              idx % 3 === 0 ? Wind : idx % 3 === 1 ? Sunrise : CloudMoon;
            const Icon = icon;

            return (
              <motion.div
                key={`${item.timestamp ?? item.datetime ?? idx}-${idx}`}
                className="glass-light data-surface rounded-xl px-3 sm:px-4 py-3 border border-[#1A2435]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
              >
                <p className="text-[9px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#7E8AA3] font-semibold">
                  {formatDayTime(item)}
                </p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-3xl sm:text-4xl leading-none font-extrabold text-[#E7EFFF]">
                      {Math.round(item.aqi)}
                    </p>
                    <p className="text-[9px] mt-1 uppercase tracking-[0.16em] text-[#74819D]">
                      AQI INDEX
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs" style={{ color }}>
                      {getAQIEmoji(category)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="pt-4 border-t border-[#131E31] flex flex-col gap-3 text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#5C677F] md:flex-row md:items-center md:justify-between"
      >
        <p>
          © 2026 CleanSky Atmospheric Systems. Data filtered through the digital
          lens.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>Privacy Policy</span>
          <span>API Docs</span>
          <span>Network Status</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
