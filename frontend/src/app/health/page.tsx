"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchCurrentAQI, fetchHealthRisk } from "@/lib/api";
import { getAQIColorByValue } from "@/lib/aqi";
import type { HealthRiskData } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";

export default function HealthPage() {
  const { city } = useCity();
  const [health, setHealth] = useState<HealthRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const aqiRes = await fetchCurrentAQI(city);
        const healthRes = await fetchHealthRisk(aqiRes.data.aqi);
        if (!cancelled) setHealth(healthRes.data);
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

  if (!health) return null;

  const color = getAQIColorByValue(health.aqi);

  const groupIcons: Record<string, string> = {
    Children: "👶",
    Elderly: "👴",
    "Pregnant women": "🤰",
    "Outdoor workers": "🏗️",
    Everyone: "👥",
    "Everyone — Emergency conditions": "🚨",
    "People with respiratory issues": "🫁",
    "People with heart/lung disease": "❤️‍🩹",
  };

  const actionIcons: Record<string, string> = {
    "Enjoy outdoor activities": "🏃",
    "Open windows for fresh air": "🪟",
    "Sensitive people reduce outdoor exertion": "⚠️",
    "Monitor symptoms": "📋",
    "Limit prolonged outdoor exertion": "⏱️",
    "Wear mask if sensitive": "😷",
    "Avoid outdoor activities": "🚫",
    "Wear N95 mask outdoors": "😷",
    "Keep windows closed": "🪟",
    "Stay indoors": "🏠",
    "Use air purifier": "💨",
    "Wear N95 mask if going out": "😷",
    "Seek medical help if symptoms appear": "🏥",
    "Do not go outside": "⛔",
    "Seal windows and doors": "🔒",
    "Call doctor if breathing issues": "📞",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-[#F9FAFB]">Health Risk Analysis</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Health advisory for <span className="text-[#6366F1]">{city}</span> based on current AQI
        </p>
      </div>

      {/* Risk Banner */}
      <GlassCard delay={1} className="relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: color }}
        />
        <div className="relative flex items-center gap-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: `${color}20` }}
          >
            {health.emoji}
          </div>
          <div>
            <p className="text-sm text-[#6B7280] uppercase tracking-wider">Risk Level</p>
            <h2 className="text-3xl font-bold mt-1" style={{ color }}>
              {health.category}
            </h2>
            <p className="text-[#9CA3AF] text-sm mt-1">
              AQI: <span className="font-semibold text-[#F9FAFB]">{Math.round(health.aqi)}</span>
              {health.range && <> · Range: {health.range}</>}
            </p>
          </div>
        </div>
        {health.recommendation && (
          <p className="relative text-[#9CA3AF] mt-4 text-sm leading-relaxed border-t border-[#1F2937] pt-4">
            {health.recommendation}
          </p>
        )}
      </GlassCard>

      {/* Row: Affected Groups + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Who is affected */}
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
            👥 Who is Affected?
          </h2>
          {health.sensitive_groups.length > 0 ? (
            <div className="space-y-3">
              {health.sensitive_groups.map((group) => (
                <div
                  key={group}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0F1E]/50 border border-[#1F2937]"
                >
                  <span className="text-2xl">{groupIcons[group] || "👤"}</span>
                  <span className="text-sm text-[#F9FAFB]">{group}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl">🎉</span>
              <p className="text-[#9CA3AF] mt-2 text-sm">
                No sensitive groups currently at risk!
              </p>
            </div>
          )}
        </GlassCard>

        {/* Suggested Actions */}
        <GlassCard delay={3}>
          <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
            ✅ Suggested Actions
          </h2>
          <div className="space-y-3">
            {health.actions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#0A0F1E]/50 border border-[#1F2937]"
              >
                <span className="text-xl mt-0.5">{actionIcons[action] || "💡"}</span>
                <span className="text-sm text-[#F9FAFB]">{action}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* AQI Scale Legend */}
      <GlassCard>
        <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
          AQI Scale Reference
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Good", range: "0–50", color: "#00E400" },
            { label: "Satisfactory", range: "51–100", color: "#92D050" },
            { label: "Moderate", range: "101–200", color: "#FFFF00" },
            { label: "Poor", range: "201–300", color: "#FF7E00" },
            { label: "Very Poor", range: "301–400", color: "#FF0000" },
            { label: "Severe", range: "400+", color: "#7E0023" },
          ].map((item) => {
            const isActive = item.label === health.category;
            return (
              <div
                key={item.label}
                className={`p-3 rounded-xl text-center transition-all duration-200 ${
                  isActive
                    ? "ring-2 scale-105"
                    : "opacity-50 hover:opacity-80"
                }`}
                style={{
                  backgroundColor: `${item.color}15`,
                  ...(isActive ? { ringColor: item.color } : {}),
                  borderColor: isActive ? item.color : "transparent",
                  borderWidth: isActive ? 2 : 1,
                  borderStyle: "solid",
                }}
              >
                <div
                  className="w-4 h-4 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs font-medium text-[#F9FAFB]">{item.label}</p>
                <p className="text-[10px] text-[#6B7280]">{item.range}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
