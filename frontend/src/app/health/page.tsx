"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchCurrentAQI, fetchHealthRisk, fetchPollutants } from "@/lib/api";
import { getAQICategory, getAQIColorByValue } from "@/lib/aqi";
import type { HealthRiskData, PollutantDetail } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Baby,
  UserRound,
  HardHat,
  Users,
  Siren,
  Stethoscope,
  HeartPulse,
  Activity,
  ShieldCheck,
  Home,
  DoorClosed,
  Phone,
  Ban,
  Lock,
  Wind,
  Eye,
  Droplet,
  CloudCog,
  type LucideIcon,
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

export default function HealthPage() {
  const { city, lat, lon } = useCity();
  const [health, setHealth] = useState<HealthRiskData | null>(null);
  const [pollutants, setPollutants] = useState<PollutantDetail[]>([]);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [ozone, setOzone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const aqiRes = await fetchCurrentAQI(city, lat, lon);
        const healthRes = await fetchHealthRisk(aqiRes.data.aqi);

        let pData = [] as PollutantDetail[];
        try {
          const pollRes = await fetchPollutants(city, lat, lon);
          if (pollRes?.pollutants) pData = pollRes.pollutants;
        } catch {
          // fallback gracefully if pollutants fail
        }

        if (!cancelled) {
          setHealth(healthRes.data);
          setPollutants(pData);
          setHumidity((aqiRes.data as { h?: number }).h || null);
          const o3 = pData.find((p) => p.name === "O3");
          if (o3) setOzone(o3.value);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [city, lat, lon]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-[#FF7E00] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#F9FAFB] mb-2">
            Connection Error
          </h2>
          <p className="text-[#9CA3AF]">{error}</p>
        </div>
      </GlassCard>
    );
  }

  if (!health) return null;

  const color = getAQIColorByValue(health.aqi);
  const aqiLabel = getAQICategory(health.aqi);

  const pm25 = pollutants.find((p) => p.name === "PM2.5");
  const pm10 = pollutants.find((p) => p.name === "PM10");

  const groupIcons: Record<string, LucideIcon> = {
    Children: Baby,
    Elderly: UserRound,
    "Pregnant women": HeartPulse,
    "Outdoor workers": HardHat,
    Everyone: Users,
    "Everyone — Emergency conditions": Siren,
    "People with respiratory issues": Stethoscope,
    "People with heart/lung disease": Activity,
  };

  const actionIcons: Record<string, LucideIcon> = {
    "Enjoy outdoor activities": Activity,
    "Open windows for fresh air": Wind,
    "Sensitive people reduce outdoor exertion": AlertTriangle,
    "Monitor symptoms": Eye,
    "Limit prolonged outdoor exertion": ShieldCheck,
    "Wear mask if sensitive": ShieldCheck,
    "Avoid outdoor activities": Ban,
    "Wear N95 mask outdoors": ShieldCheck,
    "Keep windows closed": DoorClosed,
    "Stay indoors": Home,
    "Use air purifier": Wind,
    "Wear N95 mask if going out": ShieldCheck,
    "Seek medical help if symptoms appear": Stethoscope,
    "Do not go outside": Ban,
    "Seal windows and doors": Lock,
    "Call doctor if breathing issues": Phone,
  };

  return (
    <motion.div
      className="space-y-6 md:space-y-8"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <p className="page-kicker">Health Advisory</p>
        <h1 className="page-title">
          Health Risk{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#78EAF8] to-[#3B82F6]">
            Analysis
          </span>
        </h1>
        <p className="page-subtitle">
          Personalized advisory for{" "}
          <span className="text-[#E2E8F0] font-semibold">{city}</span> based on
          real-time AQI
        </p>
      </motion.div>

      {/* Main Alert Banner */}
      <motion.div variants={fadeUp}>
        <div
          className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F172A] shadow-2xl p-6 md:p-8"
          style={{
            background: `linear-gradient(135deg, #0F172A 40%, ${color}20 100%)`,
          }}
        >
          {/* Subtle Accent Glow based on condition */}
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ backgroundColor: color }}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl md:text-5xl shadow-inner shrink-0"
                style={{
                  backgroundColor: `${color}15`,
                  border: `1px solid ${color}30`,
                }}
              >
                {health.emoji}
              </div>
              <div className="space-y-1">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-[#0F172A] mb-1"
                  style={{ backgroundColor: color }}
                >
                  Risk Level
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  {aqiLabel} Air Quality Detected
                </h2>
                <div className="flex items-center gap-3 text-[#94A3B8] text-sm mt-1 font-medium">
                  <span className="bg-[#1E293B] px-2 py-1 rounded-md text-white font-semibold">
                    AQI {Math.round(health.aqi)}
                  </span>
                  <span>Currently impacting sensitive demographics</span>
                </div>
              </div>
            </div>
          </div>

          {health.recommendation && (
            <div className="mt-6 md:mt-8 p-4 bg-black/40 rounded-xl border border-white/5 backdrop-blur-md">
              <p className="text-[#E2E8F0] text-sm md:text-base leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-[#FCD34D]" />
                <span>{health.recommendation}</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Grid: Vulnerability & Mitigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Vulnerability Assessment */}
        <motion.div variants={fadeUp} className="flex flex-col h-full">
          <GlassCard className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#78EAF8]" />
                  Vulnerability Assessment
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Specific demographic risks
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#94A3B8]" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {health.sensitive_groups.length > 0 ? (
                health.sensitive_groups.map((group) => {
                  const Icon = groupIcons[group] || Users;
                  return (
                    <div
                      key={group}
                      className="group flex gap-4 p-4 rounded-xl bg-gradient-to-r from-transparent to-[#1E293B]/30 hover:bg-[#1E293B]/50 border border-transparent hover:border-[#334155] transition-all"
                    >
                      <div className="mt-0.5">
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#E2E8F0]">
                          {group}
                        </h4>
                        <p className="text-xs text-[#94A3B8] leading-tight mt-1">
                          Extremely susceptible to respiratory distress and
                          aggravation of existing conditions under current AQI
                          conditions.
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                  <ShieldCheck className="w-12 h-12 text-[#78EAF8] mb-3" />
                  <p className="text-[#E2E8F0] text-sm font-medium">
                    Safe Conditions
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 text-center max-w-[200px]">
                    No specific groups are currently at high risk.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Action Mitigation Plan */}
        <motion.div variants={fadeUp} className="flex flex-col h-full">
          <GlassCard className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
                  Mitigation Plan
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Recommended protective actions
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#94A3B8]" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {health.actions.map((action, i) => {
                const Icon = actionIcons[action] || ShieldCheck;
                // Highlight strict actions if poor AQI
                const isUrgent =
                  health.aqi > 200 &&
                  (action.toLowerCase().includes("avoid") ||
                    action.toLowerCase().includes("mask") ||
                    action.toLowerCase().includes("indoors"));

                return (
                  <div
                    key={i}
                    className="flex flex-col p-4 rounded-xl border transition-all"
                    style={{
                      borderColor: isUrgent ? `${color}40` : "#1E293B",
                      backgroundColor: isUrgent
                        ? `${color}10`
                        : "rgba(30, 41, 59, 0.4)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isUrgent ? "bg-white/10" : "bg-[#0F172A]"}`}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: isUrgent ? color : "#78EAF8" }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#E2E8F0] tracking-wide">
                        {action}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* AQI Scale Reference */}
      <motion.div variants={fadeUp}>
        <div className="px-1 mb-2">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest text-center md:text-left mb-4">
            AQI Scale Reference
          </h3>
          <div className="flex rounded-lg overflow-hidden h-2.5 shadow-inner">
            {[
              { color: "#00E400", weight: 1 },
              { color: "#92D050", weight: 1 },
              { color: "#FFFF00", weight: 2 },
              { color: "#FF7E00", weight: 2 },
              { color: "#FF0000", weight: 2 },
              { color: "#7E0023", weight: 2 },
            ].map((stop, i) => (
              <div
                key={i}
                style={{ backgroundColor: stop.color, flexGrow: stop.weight }}
                className="h-full"
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs text-[#64748B] font-semibold mt-2 px-1">
            <span>0</span>
            <span>50</span>
            <span>100</span>
            <span>200</span>
            <span>300</span>
            <span>500</span>
          </div>
        </div>
      </motion.div>

      {/* Footer Metrics */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#1E293B]"
      >
        <div className="flex items-center gap-3 p-3 bg-[#0F172A] rounded-xl border border-[#1E293B]">
          <div className="p-2 bg-[#1E293B] rounded-lg text-[#78EAF8]">
            <CloudCog className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
              PM2.5
            </p>
            <p className="text-sm font-semibold text-white">
              {pm25 ? `${pm25.value} µg/m³` : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-[#0F172A] rounded-xl border border-[#1E293B]">
          <div className="p-2 bg-[#1E293B] rounded-lg text-[#78EAF8]">
            <CloudCog className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
              PM10
            </p>
            <p className="text-sm font-semibold text-white">
              {pm10 ? `${pm10.value} µg/m³` : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-[#0F172A] rounded-xl border border-[#1E293B]">
          <div className="p-2 bg-[#1E293B] rounded-lg text-[#78EAF8]">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
              Ozone
            </p>
            <p className="text-sm font-semibold text-white">
              {ozone !== null ? `${ozone} µg/m³` : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-[#0F172A] rounded-xl border border-[#1E293B]">
          <div className="p-2 bg-[#1E293B] rounded-lg text-[#78EAF8]">
            <Droplet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
              Humidity
            </p>
            <p className="text-sm font-semibold text-white">
              {humidity !== null ? `${humidity}%` : "—"}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
