"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchForecast } from "@/lib/api";
import { getAQICategory, getAQIColorByValue, getAQIEmoji } from "@/lib/aqi";
import type { ForecastItem, ForecastSummary } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { ChartSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceArea,
} from "recharts";

export default function ForecastPage() {
  const { city } = useCity();
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
        const res = await fetchForecast(city);
        if (cancelled) return;
        setForecast(res.forecast);
        setSummary(res.summary);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load forecast");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [city]);

  if (loading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-semibold text-[#F9FAFB] mb-2">Connection Error</h2>
          <p className="text-[#9CA3AF]">{error}</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-[#F9FAFB]">48-Hour AQI Forecast</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Predictive air quality trends for <span className="text-[#6366F1]">{city}</span>
        </p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-delay-1">
          {[
            { label: "Average AQI", value: summary.avg_aqi, icon: "📊" },
            { label: "Minimum", value: summary.min_aqi, icon: "⬇️" },
            { label: "Maximum", value: summary.max_aqi, icon: "⬆️" },
            { label: "Hours Covered", value: summary.hours, icon: "🕐" },
          ].map((stat) => (
            <GlassCard key={stat.label} animate={false} className="text-center py-4">
              <span className="text-xl">{stat.icon}</span>
              <p className="text-2xl font-bold text-[#F9FAFB] mt-1">
                {typeof stat.value === "number" ? Math.round(stat.value) : stat.value}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">{stat.label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Large chart */}
      <GlassCard delay={2}>
        <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
          AQI Trend Over Time
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              {/* AQI Zone backgrounds */}
              <ReferenceArea y1={0} y2={50} fill="#00E400" fillOpacity={0.04} />
              <ReferenceArea y1={50} y2={100} fill="#92D050" fillOpacity={0.04} />
              <ReferenceArea y1={100} y2={200} fill="#FFFF00" fillOpacity={0.04} />
              <ReferenceArea y1={200} y2={300} fill="#FF7E00" fillOpacity={0.04} />
              <ReferenceArea y1={300} y2={500} fill="#FF0000" fillOpacity={0.04} />
              {/* Reference lines for boundaries */}
              <ReferenceLine y={50} stroke="#00E400" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={100} stroke="#92D050" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={200} stroke="#FFFF00" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={300} stroke="#FF7E00" strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                interval={Math.floor(chartData.length / 8)}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1F2937",
                  borderRadius: "8px",
                  color: "#F9FAFB",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}`, "AQI"]}
              />
              <Area
                type="monotone"
                dataKey="aqi"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#forecastGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#6366F1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Hourly cards */}
      <div>
        <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
          Hourly Breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {forecast.map((item, idx) => {
            const dt = new Date(item.datetime || item.timestamp);
            const category = item.category || getAQICategory(item.aqi);
            const color = getAQIColorByValue(item.aqi);
            return (
              <div
                key={idx}
                className="glass-light p-3 text-center hover:scale-105 transition-transform duration-200 cursor-default"
              >
                <p className="text-xs text-[#6B7280]">
                  {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xl font-bold mt-1" style={{ color }}>
                  {Math.round(item.aqi)}
                </p>
                <p className="text-xs mt-1">
                  {getAQIEmoji(category)}
                </p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">{category}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
