"use client";

import { useEffect, useState } from "react";
import { useCity } from "@/context/CityContext";
import {
  fetchCurrentAQI,
  fetchForecast,
  fetchHealthRisk,
  fetchPollutants,
  fetchCities,
  fetchAQIHistory,
} from "@/lib/api";
import { getAQICategory, getAQIColorByValue, getAQIEmoji } from "@/lib/aqi";
import { buildCsvContent, triggerCsvDownload } from "@/lib/csv";
import type {
  AQIData,
  ForecastItem,
  HealthRiskData,
  HourPatternPoint,
  HistoryReading,
  PollutantDetail,
  TrendDailyPoint,
  WeekdayPatternPoint,
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
  Line,
  LineChart,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Globe2,
  RadioTower,
  ShieldAlert,
  Activity,
  Clock3,
  Users,
  Timer,
  Download,
} from "lucide-react";

interface StationSnapshot {
  city?: string;
  name?: string;
  station_name?: string;
  aqi?: number | string;
}

type TrendCompareMode = "overlay" | "30d" | "7d";

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
  const { city, lat, lon } = useCity();
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [healthRisk, setHealthRisk] = useState<HealthRiskData | null>(null);
  const [pollutants, setPollutants] = useState<PollutantDetail[]>([]);
  const [stations, setStations] = useState<StationSnapshot[]>([]);
  const [historyReadings, setHistoryReadings] = useState<HistoryReading[]>([]);
  const [trendDaily, setTrendDaily] = useState<TrendDailyPoint[]>([]);
  const [hourPattern, setHourPattern] = useState<HourPatternPoint[]>([]);
  const [weekdayPattern, setWeekdayPattern] = useState<WeekdayPatternPoint[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [trendCompareMode, setTrendCompareMode] =
    useState<TrendCompareMode>("overlay");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedMode = window.localStorage.getItem("dashboard_compare_mode");
    if (savedMode === "overlay" || savedMode === "30d" || savedMode === "7d") {
      setTrendCompareMode(savedMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboard_compare_mode", trendCompareMode);
  }, [trendCompareMode]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [aqiRes, forecastRes, pollutantsRes, citiesRes, historyRes] =
          await Promise.all([
            fetchCurrentAQI(city, lat, lon),
            fetchForecast(city, lat, lon),
            fetchPollutants(city, lat, lon),
            fetchCities(),
            fetchAQIHistory(city, 30),
          ]);

        if (cancelled) return;

        setAqiData(aqiRes.data);
        setForecast(forecastRes.forecast.slice(0, 24));
        setPollutants(pollutantsRes.pollutants);
        setStations((citiesRes.cities || []) as StationSnapshot[]);
        setHistoryReadings(historyRes.readings || []);
        setTrendDaily(historyRes.trend_daily || []);
        setHourPattern(historyRes.hour_pattern || []);
        setWeekdayPattern(historyRes.weekday_pattern || []);

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
  }, [city, lat, lon]);

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

  const parsedUpdatedAt = aqiData?.datetime ? new Date(aqiData.datetime) : null;
  const lastUpdatedMinutes =
    parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
      ? Math.max(
          0,
          Math.floor((Date.now() - parsedUpdatedAt.getTime()) / (1000 * 60)),
        )
      : null;
  const lastUpdatedText =
    lastUpdatedMinutes === null
      ? "Last updated: unavailable"
      : lastUpdatedMinutes === 0
        ? "Last updated: just now"
        : `Last updated: ${lastUpdatedMinutes} min${lastUpdatedMinutes === 1 ? "" : "s"} ago`;

  const sourceConfidenceMap: Record<string, number> = {
    waqi: 88,
    epa_fallback: 72,
    ml_fallback: 58,
  };
  const sourceKey = aqiData?.current_source ?? "ml_fallback";
  const sourceScore = sourceConfidenceMap[sourceKey] ?? 55;
  const freshnessScore =
    lastUpdatedMinutes === null
      ? 62
      : Math.max(45, Math.min(100, 100 - lastUpdatedMinutes * 1.2));
  const criticalPollutants = ["PM2.5", "PM10", "NO2"];
  const availableCriticalCount = criticalPollutants.filter(
    (key) => (aqiData?.pollutants?.[key] ?? 0) > 0,
  ).length;
  const completenessScore = 55 + (availableCriticalCount / 3) * 45;
  const confidenceScore = Math.round(
    Math.max(
      5,
      Math.min(
        99,
        sourceScore * 0.5 + freshnessScore * 0.3 + completenessScore * 0.2,
      ),
    ),
  );
  const fallbackActive = (aqiData?.current_source ?? "waqi") !== "waqi";

  const sourceLabelMap: Record<string, string> = {
    waqi: "WAQI Live",
    epa_fallback: "EPA Fallback",
    ml_fallback: "ML Fallback",
  };
  const sourceLabel = aqiData?.current_source
    ? sourceLabelMap[aqiData.current_source] || "Unknown"
    : null;

  // Prepare chart data
  const chartData = forecast.map((item, i) => {
    const fallbackSpread =
      sourceKey === "waqi" ? 8 : sourceKey === "epa_fallback" ? 14 : 20;
    const horizonSpread = i * 0.5;
    const derivedSpread = fallbackSpread + horizonSpread;
    const roundedAqi = Math.round(item.aqi);

    const minLine = Math.round(item.min_aqi ?? roundedAqi);
    const maxLine = Math.round(item.max_aqi ?? roundedAqi);
    const medianLine = Math.round(item.median_aqi ?? roundedAqi);

    const uncertaintyMin = Math.round(
      item.uncertainty_min_aqi ?? Math.max(0, medianLine - derivedSpread),
    );
    const uncertaintyMax = Math.round(
      item.uncertainty_max_aqi ?? Math.min(500, medianLine + derivedSpread),
    );

    return {
      time: new Date(
        item.datetime ?? item.timestamp ?? new Date().toISOString(),
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      aqi: roundedAqi,
      minLine,
      maxLine,
      medianLine,
      uncertaintyMin,
      uncertaintyBand: Math.max(0, uncertaintyMax - uncertaintyMin),
    };
  });

  // Top pollutants for bars
  const topPollutants = pollutants.slice(0, 5);
  const maxPollutantPct = Math.max(
    ...topPollutants.map((p) => p.percentage),
    1,
  );

  const stationAQIs = stations
    .map((s) => {
      const raw = s.aqi;
      const val = typeof raw === "string" ? parseInt(raw, 10) : raw;
      return Number.isFinite(val) ? Number(val) : 0;
    })
    .filter((v) => v > 0);

  const activeStations = stationAQIs.length;
  const networkAvgAQI = activeStations
    ? Math.round(stationAQIs.reduce((a, b) => a + b, 0) / activeStations)
    : 0;
  const poorOrWorseCount = stationAQIs.filter((v) => v > 200).length;
  const severeCount = stationAQIs.filter((v) => v > 400).length;

  const hotspotStations = stations
    .map((s) => {
      const raw = s.aqi;
      const val = typeof raw === "string" ? parseInt(raw, 10) : raw;
      return {
        label: s.city || s.name || "Unknown",
        aqi: Number.isFinite(val) ? Number(val) : 0,
      };
    })
    .filter((s) => s.aqi > 0)
    .sort((a, b) => b.aqi - a.aqi)
    .slice(0, 5);

  const history30d = historyReadings
    .map((r) => ({
      dt: new Date(r.datetime),
      aqi: Number(r.aqi || 0),
    }))
    .filter((r) => !Number.isNaN(r.dt.getTime()) && r.aqi > 0)
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  const dailyMap = new Map<
    string,
    { label: string; total: number; count: number; ts: number }
  >();
  for (const r of history30d) {
    const key = `${r.dt.getFullYear()}-${r.dt.getMonth()}-${r.dt.getDate()}`;
    const existing = dailyMap.get(key);
    if (existing) {
      existing.total += r.aqi;
      existing.count += 1;
    } else {
      dailyMap.set(key, {
        label: r.dt.toLocaleDateString([], { month: "short", day: "numeric" }),
        total: r.aqi,
        count: 1,
        ts: r.dt.getTime(),
      });
    }
  }

  const trend30dData = Array.from(dailyMap.values())
    .sort((a, b) => a.ts - b.ts)
    .map((d) => ({
      date: d.label,
      aqi30: Math.round(d.total / d.count),
      ts: d.ts,
    }));

  const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const trendCombinedFallback = trend30dData.map((d) => ({
    date: d.date,
    aqi30: d.aqi30,
    aqi7: d.ts >= cutoff7d ? d.aqi30 : null,
  }));

  const hourAgg = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    total: 0,
    count: 0,
  }));
  for (const r of history30d) {
    const h = r.dt.getHours();
    hourAgg[h].total += r.aqi;
    hourAgg[h].count += 1;
  }
  const hourPatternFallback = hourAgg
    .filter((x) => x.count > 0)
    .map((x) => ({
      hour: `${String(x.hour).padStart(2, "0")}:00`,
      aqi: Math.round(x.total / x.count),
    }));

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayAgg = weekdayNames.map((day) => ({ day, total: 0, count: 0 }));
  for (const r of history30d) {
    const d = r.dt.getDay();
    weekdayAgg[d].total += r.aqi;
    weekdayAgg[d].count += 1;
  }
  const weekdayPatternFallback = weekdayAgg
    .filter((x) => x.count > 0)
    .map((x) => ({
      day: x.day,
      aqi: Math.round(x.total / x.count),
    }));

  const trendCombinedData =
    trendDaily.length > 0
      ? trendDaily.map((d) => ({
          date: d.date,
          aqi30: Math.round(d.aqi),
          aqi7: d.in_last_7d ? Math.round(d.aqi) : null,
        }))
      : trendCombinedFallback;

  const avg30Aqi =
    trendCombinedData.length > 0
      ? Math.round(
          trendCombinedData.reduce((sum, item) => sum + item.aqi30, 0) /
            trendCombinedData.length,
        )
      : null;
  const latestTrendAqi =
    trendCombinedData.length > 0
      ? trendCombinedData[trendCombinedData.length - 1].aqi30
      : null;
  const trendDelta =
    avg30Aqi !== null && latestTrendAqi !== null ? latestTrendAqi - avg30Aqi : null;

  const trendTickInterval = Math.max(
    0,
    Math.ceil(Math.max(trendCombinedData.length, 1) / 8) - 1,
  );

  const hourPatternData =
    hourPattern.filter((x) => x.count > 0).length > 0
      ? hourPattern
          .filter((x) => x.count > 0)
          .map((x) => ({ hour: x.hour, aqi: Math.round(x.aqi) }))
      : hourPatternFallback;

  const weekdayPatternData =
    weekdayPattern.filter((x) => x.count > 0).length > 0
      ? weekdayPattern
          .filter((x) => x.count > 0)
          .map((x) => ({ day: x.day, aqi: Math.round(x.aqi) }))
      : weekdayPatternFallback;

  const parsedForecast = forecast
    .map((item) => {
      const dt = new Date(item.datetime ?? item.timestamp ?? "");
      return {
        dt,
        aqi: Number(item.aqi || 0),
      };
    })
    .filter((item) => !Number.isNaN(item.dt.getTime()) && item.aqi > 0)
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  const minWindowHours = 2;
  let bestWindow:
    | { start: Date; end: Date; avgAqi: number; maxAqi: number }
    | null = null;

  for (let i = 0; i <= parsedForecast.length - minWindowHours; i += 1) {
    const chunk = parsedForecast.slice(i, i + minWindowHours);
    if (chunk.length < minWindowHours) continue;

    const consecutive =
      chunk[chunk.length - 1].dt.getTime() - chunk[0].dt.getTime() <=
      (minWindowHours - 1) * 60 * 60 * 1000 + 10 * 60 * 1000;
    if (!consecutive) continue;

    const aqiValues = chunk.map((x) => x.aqi);
    const avgAqi = aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length;
    const maxAqi = Math.max(...aqiValues);

    if (!bestWindow || avgAqi < bestWindow.avgAqi) {
      bestWindow = {
        start: chunk[0].dt,
        end: chunk[chunk.length - 1].dt,
        avgAqi,
        maxAqi,
      };
    }
  }

  const safeWindowLabel = bestWindow
    ? `${bestWindow.start.toLocaleTimeString([], { hour: "numeric" })}-${bestWindow.end.toLocaleTimeString([], { hour: "numeric" })}`
    : "Unavailable";
  const safeWindowTrusted = !!bestWindow && bestWindow.maxAqi <= 120;

  const sensitiveGuidance =
    aqi <= 100
      ? [
          "Children and older adults can do regular outdoor activities.",
          "Asthma patients should still carry rescue medication.",
        ]
      : aqi <= 200
        ? [
            "Children, elderly, and pregnant people should limit exertion.",
            "Respiratory or cardiac patients should prefer short, low-intensity outings.",
          ]
        : aqi <= 300
          ? [
              "Sensitive groups should avoid outdoor exercise.",
              "If stepping out is required, use N95 masks and keep duration short.",
            ]
          : [
              "All sensitive groups should stay indoors as much as possible.",
              "Use air purification indoors and avoid outdoor exposure.",
            ];

  const durationGuidance =
    aqi <= 50
      ? [
          "Light activity: up to 2 hours",
          "Moderate activity: 60-90 minutes",
          "High intensity: 30-45 minutes",
        ]
      : aqi <= 100
        ? [
            "Light activity: 60-90 minutes",
            "Moderate activity: 30-45 minutes",
            "High intensity: up to 20 minutes",
          ]
        : aqi <= 200
          ? [
              "Light activity: 20-40 minutes",
              "Moderate activity: up to 20 minutes",
              "High intensity: avoid outdoors",
            ]
          : [
              "Light activity: up to 15 minutes only if necessary",
              "Moderate activity: avoid outdoors",
              "High intensity: avoid outdoors",
            ];

  const handleDownloadCsv = () => {
    if (!aqiData) return;

    setIsExporting(true);
    try {
      const forecastStaleToleranceMs = 3 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const exportedAt = new Date().toISOString();
      const currentDatetime = aqiData.datetime
        ? new Date(aqiData.datetime).toISOString()
        : "";
      const currentPollutants = aqiData.pollutants || {};

      const validForecastItems = forecast.filter((item) => {
        const rawDatetime = item.datetime || item.timestamp;
        if (!rawDatetime) return false;

        const forecastTimeMs = new Date(rawDatetime).getTime();
        if (Number.isNaN(forecastTimeMs)) return false;

        return forecastTimeMs >= nowMs - forecastStaleToleranceMs;
      });
      const forecastWasFiltered = validForecastItems.length < forecast.length;

      const headers = [
        "record_type",
        "city",
        "exported_at_utc",
        "data_datetime_utc",
        "aqi",
        "category",
        "dominant_pollutant",
        "source",
        "forecast_is_stale",
        "pm2_5_ug_m3",
        "pm10_ug_m3",
        "no2_ug_m3",
        "o3_ug_m3",
        "co_ug_m3",
        "so2_ug_m3",
        "forecast_min_aqi",
        "forecast_median_aqi",
        "forecast_max_aqi",
        "uncertainty_min_aqi",
        "uncertainty_max_aqi",
        "confidence_score",
        "last_updated_minutes",
        "safe_window_start_utc",
        "safe_window_end_utc",
        "safe_window_avg_aqi",
        "safe_window_trusted",
        "network_active_stations",
        "network_avg_aqi",
        "hotspot_count",
        "trend_compare_mode",
      ];

      const currentRow = {
        record_type: "current",
        city,
        exported_at_utc: exportedAt,
        data_datetime_utc: currentDatetime,
        aqi: Math.round(aqiData.aqi),
        category: aqiData.category,
        dominant_pollutant: aqiData.dominant_pollutant,
        source: aqiData.current_source ?? aqiData.data_source ?? "unknown",
        forecast_is_stale: forecastWasFiltered,
        pm2_5_ug_m3: currentPollutants["PM2.5"] ?? "",
        pm10_ug_m3: currentPollutants.PM10 ?? "",
        no2_ug_m3: currentPollutants.NO2 ?? "",
        o3_ug_m3: currentPollutants.O3 ?? "",
        co_ug_m3: currentPollutants.CO ?? "",
        so2_ug_m3: currentPollutants.SO2 ?? "",
        forecast_min_aqi: "",
        forecast_median_aqi: "",
        forecast_max_aqi: "",
        uncertainty_min_aqi: "",
        uncertainty_max_aqi: "",
        confidence_score: confidenceScore,
        last_updated_minutes: lastUpdatedMinutes ?? "",
        safe_window_start_utc: bestWindow
          ? bestWindow.start.toISOString()
          : "",
        safe_window_end_utc: bestWindow ? bestWindow.end.toISOString() : "",
        safe_window_avg_aqi: bestWindow ? Math.round(bestWindow.avgAqi) : "",
        safe_window_trusted: safeWindowTrusted,
        network_active_stations: activeStations,
        network_avg_aqi: networkAvgAQI,
        hotspot_count: hotspotStations.length,
        trend_compare_mode: trendCompareMode,
      };

      const forecastRows = validForecastItems.map((item) => {
        const forecastDatetime = item.datetime || item.timestamp || "";
        return {
          record_type: "forecast",
          city,
          exported_at_utc: exportedAt,
          data_datetime_utc: forecastDatetime
            ? new Date(forecastDatetime).toISOString()
            : "",
          aqi: Math.round(item.aqi),
          category: item.category,
          dominant_pollutant: item.dominant ?? "",
          source: sourceKey,
          forecast_is_stale: false,
          pm2_5_ug_m3: "",
          pm10_ug_m3: "",
          no2_ug_m3: "",
          o3_ug_m3: "",
          co_ug_m3: "",
          so2_ug_m3: "",
          forecast_min_aqi: item.min_aqi ?? "",
          forecast_median_aqi: item.median_aqi ?? "",
          forecast_max_aqi: item.max_aqi ?? "",
          uncertainty_min_aqi: item.uncertainty_min_aqi ?? "",
          uncertainty_max_aqi: item.uncertainty_max_aqi ?? "",
          confidence_score: confidenceScore,
          last_updated_minutes: lastUpdatedMinutes ?? "",
          safe_window_start_utc: "",
          safe_window_end_utc: "",
          safe_window_avg_aqi: "",
          safe_window_trusted: safeWindowTrusted,
          network_active_stations: activeStations,
          network_avg_aqi: networkAvgAQI,
          hotspot_count: hotspotStations.length,
          trend_compare_mode: trendCompareMode,
        };
      });

      const csvContent = buildCsvContent(headers, [currentRow, ...forecastRows]);
      const citySlug = city
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const stamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z");

      triggerCsvDownload(`cleansky_${citySlug || "city"}_${stamp}.csv`, csvContent);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Hero Header */}
      <motion.div variants={fadeUp} className="hero-atmosphere rounded-2xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#E2E8F0] leading-tight">
              Monitoring Overview
            </h1>
            <p className="text-[#64748B] text-sm mt-2 uppercase tracking-widest">
              Network status across tracked stations · Updated every 5 minutes
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={!aqiData || isExporting}
            className="inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#020617] border border-[#1E293B] text-sm text-[#E2E8F0] hover:border-[#7C9CFF]/60 hover:text-[#7C9CFF] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Preparing CSV..." : "Download CSV"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0B1220]/70 border border-[#1E293B]/60 text-[#94A3B8]">
            {lastUpdatedText}
          </span>
          {fallbackActive && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F97316]/15 border border-[#F97316]/30 text-[#F97316]">
              Fallback source active
            </span>
          )}
        </div>
      </motion.div>

      {/* Row 0: Global monitoring summary */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={fadeUp}
      >
        {[
          {
            label: "Active Stations",
            value: activeStations,
            icon: <RadioTower className="w-4 h-4 text-[#94A3B8]" />,
          },
          {
            label: "Network Avg AQI",
            value: networkAvgAQI,
            icon: <Activity className="w-4 h-4 text-[#94A3B8]" />,
          },
          {
            label: "Poor+ Stations",
            value: poorOrWorseCount,
            icon: <ShieldAlert className="w-4 h-4 text-[#F97316]" />,
          },
          {
            label: "Severe Stations",
            value: severeCount,
            icon: <AlertTriangle className="w-4 h-4 text-[#EF4444]" />,
          },
        ].map((item) => (
          <GlassCard key={item.label} animate={false} className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#64748B] uppercase tracking-wider">
                {item.label}
              </p>
              {item.icon}
            </div>
            <p className="text-2xl font-bold text-[#E2E8F0] mt-2">
              {item.value}
            </p>
          </GlassCard>
        ))}
      </motion.div>

      {/* Row 0b: Hotspots + context */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={fadeUp}
      >
        <GlassCard>
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#7C9CFF]" />
            Top Pollution Hotspots
          </h2>
          <div className="space-y-2">
            {hotspotStations.map((item, i) => (
              <div
                key={`${item.label}-${i}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B1220]/60 border border-[#1E293B]/40"
              >
                <span className="text-sm text-[#E2E8F0] truncate pr-3">
                  {item.label}
                </span>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-md"
                  style={{
                    backgroundColor: `${getAQIColorByValue(item.aqi)}20`,
                    color: getAQIColorByValue(item.aqi),
                  }}
                >
                  AQI {item.aqi}
                </span>
              </div>
            ))}
            {hotspotStations.length === 0 && (
              <p className="text-sm text-[#64748B]">
                No station AQI data available.
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            Selected City Focus
          </h2>
          <p className="text-2xl font-bold text-[#E2E8F0]">{city}</p>
          <p className="text-sm text-[#94A3B8] mt-2">
            Detailed diagnostics below are scoped to the currently selected
            city.
          </p>
          <div className="mt-4 text-xs text-[#64748B]">
            Use the city selector in the top bar to switch focus while keeping
            system-wide context in view.
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest">
          City Detail Panel
        </h2>
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
            <div className="mt-3">
              <p className="text-[10px] text-[#64748B] uppercase tracking-widest">
                Confidence score
              </p>
              <p className="text-lg font-semibold text-[#E2E8F0]">
                {confidenceScore}%
              </p>
            </div>
            {sourceLabel && (
              <p className="text-[#64748B] text-xs mt-2">
                Source: <span className="text-[#94A3B8]">{sourceLabel}</span>
              </p>
            )}
            {aqiData && (
              <p className="text-[#64748B] text-xs mt-1">
                WAQI {Math.round(aqiData.waqi_aqi ?? 0)} | EPA{" "}
                {Math.round(aqiData.epa_estimate_aqi ?? 0)} | ML{" "}
                {Math.round(aqiData.ml_estimate_aqi ?? 0)}
              </p>
            )}
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
          <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B1220]/70 border border-[#1E293B]/50 text-[#94A3B8]">
              <span className="w-3 h-[2px] bg-[#7C9CFF]" /> Predicted AQI
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B1220]/70 border border-[#1E293B]/50 text-[#94A3B8]">
              <span className="w-3 h-[2px] bg-[#22D3EE]" /> Median
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B1220]/70 border border-[#1E293B]/50 text-[#94A3B8]">
              <span className="w-3 h-[2px] border-t border-dashed border-[#94A3B8]" />
              Min/Max
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B1220]/70 border border-[#1E293B]/50 text-[#94A3B8]">
              <span className="w-3 h-2 bg-[#7C9CFF]/25 rounded-sm" />
              Confidence area
            </span>
          </div>
          <p className="text-xs text-[#64748B] mb-3">
            Includes min/max/median trajectories and a deterministic confidence
            area that widens over forecast horizon.
          </p>
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
                    dataKey="uncertaintyMin"
                    stackId="uncertainty"
                    stroke="none"
                    fill="transparent"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="uncertaintyBand"
                    stackId="uncertainty"
                    stroke="none"
                    fill="#7C9CFF"
                    fillOpacity={0.12}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxLine"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="minLine"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="medianLine"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
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

      {/* Row 2.5: Actionable guidance from forecast */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={fadeUp}
      >
        <GlassCard>
          <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-[#7C9CFF]" />
            Safe Outdoor Window
          </h3>
          <p className="text-2xl font-bold text-[#E2E8F0]">{safeWindowLabel}</p>
          <p className="text-xs text-[#64748B] mt-2">
            Best 2-hour window in the next 24 hours based on lowest forecast AQI.
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: safeWindowTrusted ? "#22C55E" : "#F97316" }}
          >
            {safeWindowTrusted
              ? "Window is low-risk for most users"
              : "No clearly low-risk window; use caution"}
          </p>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#22D3EE]" />
            Sensitive Group Guidance
          </h3>
          <ul className="space-y-2">
            {sensitiveGuidance.map((tip, i) => (
              <li key={i} className="text-sm text-[#94A3B8] leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#F59E0B]" />
            Duration Recommendations
          </h3>
          <ul className="space-y-2">
            {durationGuidance.map((tip, i) => (
              <li key={i} className="text-sm text-[#94A3B8] leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </GlassCard>
      </motion.div>

      {/* Row 3: Historical trends and patterns */}
      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-medium text-[#64748B] uppercase tracking-widest">
          Historical Insights
        </h2>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        variants={fadeUp}
      >
        <GlassCard>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-widest">
                7D / 30D AQI Trend
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Compare current movement with 30-day baseline.
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-[#1E293B]/60 bg-[#020617]/70 p-1 gap-1">
              {[
                { value: "overlay", label: "Overlay" },
                { value: "30d", label: "30D" },
                { value: "7d", label: "7D" },
              ].map((mode) => {
                const active = trendCompareMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() =>
                      setTrendCompareMode(mode.value as TrendCompareMode)
                    }
                    className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                      active
                        ? "bg-[#7C9CFF]/20 text-[#7C9CFF]"
                        : "text-[#94A3B8] hover:bg-[#1E293B]/40 hover:text-[#E2E8F0]"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mb-3 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#0B1220]/70 border border-[#1E293B]/50">
            <p className="text-xs text-[#94A3B8]">
              Delta vs 30-day avg:
              <span
                className="ml-1 font-semibold"
                style={{
                  color:
                    trendDelta === null
                      ? "#94A3B8"
                      : trendDelta <= 0
                        ? "#22C55E"
                        : "#F97316",
                }}
              >
                {trendDelta === null
                  ? "N/A"
                  : `${trendDelta > 0 ? "+" : ""}${trendDelta}`}
              </span>
            </p>
          </div>
          {trendCombinedData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendCombinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 10 }}
                    interval={trendTickInterval}
                    minTickGap={16}
                    tickMargin={8}
                    angle={-28}
                    textAnchor="end"
                    height={56}
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
                  {trendCompareMode !== "7d" && (
                    <Line
                      type="monotone"
                      dataKey="aqi30"
                      stroke="#7C9CFF"
                      strokeWidth={2}
                      dot={false}
                      name="30-day"
                    />
                  )}
                  {trendCompareMode !== "30d" && (
                    <Line
                      type="monotone"
                      dataKey="aqi7"
                      stroke="#22D3EE"
                      strokeWidth={2}
                      dot={false}
                      name="7-day"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">Not enough history yet.</p>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            Hour of Day Pattern
          </h3>
          {hourPatternData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourPatternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="hour"
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    interval={2}
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
                    stroke="#34D399"
                    fill="#34D399"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">Not enough history yet.</p>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-widest mb-4">
            Weekday Pattern
          </h3>
          {weekdayPatternData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayPatternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="day"
                    stroke="#64748B"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
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
                  <Bar dataKey="aqi" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">Not enough history yet.</p>
          )}
        </GlassCard>
      </motion.div>

      {/* Row 4: Pollutant breakdown */}
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
