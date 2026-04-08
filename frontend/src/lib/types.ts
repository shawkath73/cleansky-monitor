/* ── API response shapes ─────────────────── */

export interface AQIData {
  aqi: number;
  category: string;
  city: string;
  dominant_pollutant: string;
  pollutants: Record<string, number>;
  pollutant_percentages: Record<string, number>;
  color: string;
  emoji: string;
  datetime?: string;
  data_source?: string;
  station_name?: string;
  current_source?: "waqi" | "epa_fallback" | "ml_fallback";
  waqi_aqi?: number;
  epa_estimate_aqi?: number;
  ml_estimate_aqi?: number;
}

export interface ForecastItem {
  aqi: number;
  category: string;
  color: string;
  emoji: string;
  datetime: string;
  end_datetime?: string;
  hour?: number;
  timestamp?: string;
  dominant?: string;
  peak_aqi?: number;
  points?: number;
}

export interface ForecastSummary {
  min_aqi: number;
  max_aqi: number;
  avg_aqi: number;
  hours: number;
  breakdown_hours?: number;
  buckets?: number;
}

export interface PollutantDetail {
  name: string;
  value: number;
  unit: string;
  who_limit: number;
  percentage: number;
  status: "safe" | "exceeded";
  exceeded_by: number;
}

export interface HealthRiskData {
  aqi: number;
  category: string;
  color: string;
  emoji: string;
  range: string;
  recommendation: string;
  sensitive_groups: string[];
  actions: string[];
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  alert_threshold: number;
  preferences: Record<string, unknown>;
}
