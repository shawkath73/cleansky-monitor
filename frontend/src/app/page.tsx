"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchCurrentAQI, fetchForecast, fetchHealthRisk, fetchPollutants } from "@/lib/api";
import { getAQICategory, getAQIColorByValue, getAQIEmoji } from "@/lib/aqi";
import type { AQIData, ForecastItem, HealthRiskData, PollutantDetail } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import AQIGauge from "@/components/AQIGauge";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from "recharts";

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
    setLoading(true);
    setError(null);

    async function load() {
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // auto-refresh 5 min
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [city]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-semibold text-[#F9FAFB] mb-2">Connection Error</h2>
          <p className="text-[#9CA3AF]">{error}</p>
          <p className="text-[#6B7280] text-sm mt-2">Make sure the Flask backend is running on port 5000</p>
        </div>
      </GlassCard>
    );
  }

  const aqi = aqiData?.aqi ?? 0;
  const category = aqiData?.category ?? getAQICategory(aqi);
  const color = getAQIColorByValue(aqi);

  // Prepare chart data
  const chartData = forecast.map((item) => ({
    time: new Date(item.timestamp || item.dt * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    aqi: Math.round(item.aqi),
  }));

  // Top pollutants for bars
  const topPollutants = pollutants.slice(0, 5);
  const maxPollutantPct = Math.max(...topPollutants.map((p) => p.percentage), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-[#F9FAFB]">
          Air Quality in <span className="text-[#6366F1]">{city}</span>
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Real-time AQI monitoring · Updated every 5 minutes
        </p>
      </div>

      {/* Row 1: AQI Gauge + Health Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AQI Gauge card */}
        <GlassCard className="flex flex-col items-center justify-center" delay={1}>
          <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
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
              <p className="text-[#6B7280] text-xs mt-2">
                Dominant pollutant: <span className="text-[#9CA3AF]">{aqiData.dominant_pollutant}</span>
              </p>
            )}
          </div>
        </GlassCard>

        {/* Health Risk card */}
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
            Health Risk
          </h2>
          {healthRisk && (
            <div className="space-y-4">
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ backgroundColor: `${color}15`, borderLeft: `4px solid ${color}` }}
              >
                <span className="text-3xl">{healthRisk.emoji}</span>
                <div>
                  <p className="text-lg font-semibold text-[#F9FAFB]">{healthRisk.category} Risk</p>
                  <p className="text-sm text-[#9CA3AF]">AQI: {Math.round(aqi)}</p>
                </div>
              </div>

              <p className="text-[#9CA3AF] text-sm leading-relaxed">
                {healthRisk.recommendation}
              </p>

              <div>
                <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">
                  Suggested Actions
                </p>
                <ul className="space-y-1.5">
                  {healthRisk.actions.slice(0, 3).map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#9CA3AF]">
                      <span style={{ color }} className="mt-0.5">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Row 2: Forecast chart */}
      <GlassCard delay={3}>
        <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
          📈 24-Hour AQI Forecast
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1F2937",
                  borderRadius: "8px",
                  color: "#F9FAFB",
                }}
              />
              <Area
                type="monotone"
                dataKey="aqi"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#aqiGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#6366F1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Row 3: Pollutant breakdown */}
      <GlassCard>
        <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
          Pollutant Breakdown
        </h2>
        <div className="space-y-3">
          {topPollutants.map((pol) => (
            <div key={pol.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[#F9FAFB]">{pol.name}</span>
                <span className="text-xs text-[#9CA3AF]">
                  {pol.value.toFixed(1)} {pol.unit} · {pol.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(pol.percentage / maxPollutantPct) * 100}%`,
                    backgroundColor: pol.status === "exceeded" ? "#FF7E00" : "#6366F1",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
