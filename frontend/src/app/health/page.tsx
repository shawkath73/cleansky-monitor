"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import { fetchCurrentAQI, fetchHealthRisk } from "@/lib/api";
import { getAQIColorByValue } from "@/lib/aqi";
import type { HealthRiskData } from "@/lib/types";
import GlassCard from "@/components/GlassCard";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { motion } from "framer-motion";
import {
  AlertTriangle, Baby, UserRound, HardHat, Users, Siren, Stethoscope,
  HeartPulse, Activity, ShieldCheck, Home, DoorClosed, Phone,
  Ban, Lock, Wind, Eye, PartyPopper, type LucideIcon,
} from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const listItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

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
          <AlertTriangle className="w-10 h-10 text-[#FF7E00] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#F9FAFB] mb-2">Connection Error</h2>
          <p className="text-[#9CA3AF]">{error}</p>
        </div>
      </GlassCard>
    );
  }

  if (!health) return null;

  const color = getAQIColorByValue(health.aqi);

  const groupIcons: Record<string, LucideIcon> = {
    "Children": Baby,
    "Elderly": UserRound,
    "Pregnant women": HeartPulse,
    "Outdoor workers": HardHat,
    "Everyone": Users,
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
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#E8F5EE] leading-tight">
          Health Risk{" "}
          <span >Analysis</span>
        </h1>
        <p className="text-[#3B7A5A] text-sm mt-2 uppercase tracking-widest">
          Advisory · <span className="text-[#0DF09E]">{city}</span> · Based on current AQI
        </p>
      </motion.div>

      {/* Risk Banner */}
      <motion.div variants={fadeUp}>
        <GlassCard delay={1} className="relative overflow-hidden">
          {/* Ambient glow */}
          <motion.div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: color }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex items-center gap-6">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {health.emoji}
            </div>
            <div>
              <p className="text-[#3B7A5A] text-sm uppercase tracking-widest font-medium">Risk Level</p>
              <h2 className="text-3xl font-bold mt-1" style={{ color }}>
                {health.category}
              </h2>
              <p className="text-[#6EE7B7] text-sm mt-1">
                AQI: <span className="font-semibold text-[#E8F5EE]">{Math.round(health.aqi)}</span>
                {health.range && <> · Range: {health.range}</>}
              </p>
            </div>
          </div>
          {health.recommendation && (
            <p className="relative text-[#6EE7B7] mt-4 text-sm leading-relaxed border-t border-[#06331F] pt-4">
              {health.recommendation}
            </p>
          )}
        </GlassCard>
      </motion.div>

      {/* Row: Affected Groups + Actions */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={fadeUp}>
        {/* Who is affected */}
        <GlassCard delay={2}>
          <h2 className="text-sm font-medium text-[#3B7A5A] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0DF09E]" />
            Who is Affected?
          </h2>
          {health.sensitive_groups.length > 0 ? (
            <motion.div
              className="space-y-3"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
            >
              {health.sensitive_groups.map((group) => {
                const Icon = groupIcons[group] || Users;
                return (
                  <motion.div
                    key={group}
                    variants={listItem}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#041F15]/50 border border-[#06331F]"
                  >
                    <Icon className="w-5 h-5 shrink-0" style={{ color }} />
                    <span className="text-sm text-[#E8F5EE]">{group}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <PartyPopper className="w-10 h-10 text-[#0DF09E] mx-auto" />
              <p className="text-[#6EE7B7] mt-2 text-sm">
                No sensitive groups currently at risk!
              </p>
            </div>
          )}
        </GlassCard>

        {/* Suggested Actions */}
        <GlassCard delay={3}>
          <h2 className="text-sm font-medium text-[#3B7A5A] uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0DF09E]" />
            Suggested Actions
          </h2>
          <motion.div
            className="space-y-3"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            animate="show"
          >
            {health.actions.map((action, i) => {
              const Icon = actionIcons[action] || ShieldCheck;
              return (
                <motion.div
                  key={i}
                  variants={listItem}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[#041F15]/50 border border-[#06331F]"
                >
                  <Icon className="w-5 h-5 mt-0.5 shrink-0 text-[#0DF09E]" />
                  <span className="text-sm text-[#E8F5EE]">{action}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </GlassCard>
      </motion.div>

      {/* AQI Scale Legend */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <h2 className="text-sm font-medium text-[#3B7A5A] uppercase tracking-widest mb-4">
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
            ].map((item, i) => {
              const isActive = item.label === health.category;
              return (
                <motion.div
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1.05 : 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  whileHover={{ opacity: 0.9 }}
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs font-medium text-[#E8F5EE]">{item.label}</p>
                  <p className="text-[10px] text-[#6EE7B7]">{item.range}</p>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
