const API_BASE = "/api";

const RETRYABLE_STATUS = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await fetch(url, options);

    if (res.ok) {
      return res.json();
    }

    const err = await res.json().catch(() => ({ error: res.statusText }));
    const isRetryable = RETRYABLE_STATUS.has(res.status);
    const hasMoreAttempts = attempt < maxAttempts;

    if (isRetryable && hasMoreAttempts) {
      await sleep(attempt * 400);
      continue;
    }

    throw new Error(err.error || res.statusText);
  }

  throw new Error("Request failed after retries");
}

/* ── AQI ─────────────────────────────────── */

export async function fetchCurrentAQI(city: string, lat?: number, lon?: number) {
  let url = `${API_BASE}/current-aqi?city=${encodeURIComponent(city)}`;
  if (lat !== undefined && lon !== undefined) url += `&lat=${lat}&lon=${lon}`;
  return fetchJSON<{
    success: boolean;
    data: import("./types").AQIData;
  }>(url);
}

export async function fetchForecast(
  city: string,
  lat?: number,
  lon?: number,
  breakdownHours = 1
) {
  let url = `${API_BASE}/forecast?city=${encodeURIComponent(city)}`;
  if (lat !== undefined && lon !== undefined) url += `&lat=${lat}&lon=${lon}`;
  url += `&breakdown_hours=${breakdownHours}`;
  return fetchJSON<{
    success: boolean;
    city: string;
    breakdown_hours: number;
    summary: import("./types").ForecastSummary;
    forecast: import("./types").ForecastItem[];
  }>(url);
}

export async function fetchHealthRisk(aqi: number) {
  return fetchJSON<{
    success: boolean;
    data: import("./types").HealthRiskData;
  }>(`${API_BASE}/health-risk?aqi=${aqi}`);
}

export async function fetchPollutants(city: string, lat?: number, lon?: number) {
  let url = `${API_BASE}/pollutants?city=${encodeURIComponent(city)}`;
  if (lat !== undefined && lon !== undefined) url += `&lat=${lat}&lon=${lon}`;
  return fetchJSON<{
    success: boolean;
    city: string;
    current_aqi: number;
    dominant_pollutant: string;
    pollutants: import("./types").PollutantDetail[];
  }>(url);
}

export async function fetchCities() {
  return fetchJSON<{
    success: boolean;
    cities: { city: string; state?: string; lat: number; lon: number }[];
  }>(`${API_BASE}/cities`);
}

export async function fetchAQIHistory(city: string, days = 30) {
  return fetchJSON<{
    success: boolean;
    city: string;
    days: number;
    timezone: string;
    count: number;
    readings: import("./types").HistoryReading[];
    trend_daily: import("./types").TrendDailyPoint[];
    hour_pattern: import("./types").HourPatternPoint[];
    weekday_pattern: import("./types").WeekdayPatternPoint[];
  }>(`${API_BASE}/history?city=${encodeURIComponent(city)}&days=${days}`);
}

export interface CitySearchResult {
  city: string;
  state: string;
  lat: number;
  lon: number;
  station_name: string;
  aqi: number | string;
  name?: string;
}

export async function searchCities(query: string) {
  return fetchJSON<{
    success: boolean;
    query: string;
    count: number;
    results: CitySearchResult[];
  }>(`${API_BASE}/search-cities?q=${encodeURIComponent(query)}`);
}

/* ── Auth ─────────────────────────────────── */

export async function loginUser(email: string, password: string) {
  return fetchJSON<{
    success: boolean;
    token: string;
    user: import("./types").User;
  }>(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  phone?: string
) {
  return fetchJSON<{
    success: boolean;
    message: string;
    user_id: string;
  }>(`${API_BASE}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone }),
  });
}
