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
}

export interface ForecastItem {
  aqi: number;
  category: string;
  color: string;
  emoji: string;
  timestamp: string;
  dt: number;
  pollutants: Record<string, number>;
}

export interface ForecastSummary {
  min_aqi: number;
  max_aqi: number;
  avg_aqi: number;
  hours: number;
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
