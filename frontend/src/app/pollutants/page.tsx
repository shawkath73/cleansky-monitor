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

const CHART_COLORS = ["#6366F1", "#818CF8", "#A78BFA", "#C084FC", "#E879F9", "#F472B6", "#FB923C"];

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
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-semibold text-[#F9FAFB] mb-2">Connection Error</h2>
          <p className="text-[#9CA3AF]">{error}</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-[#F9FAFB]">Pollution Contributors</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Pollutant breakdown for <span className="text-[#6366F1]">{city}</span>
          {dominantPollutant && (
            <> · Dominant: <span className="text-[#FF7E00]">{dominantPollutant}</span></>
          )}
        </p>
      </div>

      {/* Row 1: Donut + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <GlassCard delay={1}>
          <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
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
                    backgroundColor: "#111827",
                    border: "1px solid #1F2937",
                    borderRadius: "8px",
                    color: "#F9FAFB",
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
                <span className="text-xs text-[#9CA3AF]">
                  {d.name} ({d.value.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Bar Chart — vs WHO */}
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
            Actual vs WHO Limits
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
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
                <Legend
                  wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }}
                />
                <Bar dataKey="Actual" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="WHO Limit" fill="#374151" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Row 2: Pollutant detail cards */}
      <div>
        <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
          Pollutant Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pollutants.map((p) => {
            const exceeded = p.status === "exceeded";
            return (
              <div
                key={p.name}
                className="glass-light p-4 hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#F9FAFB]">{p.name}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      exceeded
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {exceeded ? "Exceeded" : "Safe"}
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#F9FAFB]">
                  {p.value.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-[#6B7280]">{p.unit}</span>
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-[#6B7280]">
                  <span>WHO Limit: {p.who_limit} {p.unit}</span>
                  {exceeded && (
                    <span className="text-red-400">+{p.exceeded_by.toFixed(1)}</span>
                  )}
                </div>
                {/* Percentage bar */}
                <div className="h-1.5 bg-[#1F2937] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((p.value / p.who_limit) * 100, 100)}%`,
                      backgroundColor: exceeded ? "#EF4444" : "#10B981",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
