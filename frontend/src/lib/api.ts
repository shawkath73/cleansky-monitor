const API_BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

/* ── AQI ─────────────────────────────────── */

export async function fetchCurrentAQI(city: string) {
  return fetchJSON<{
    success: boolean;
    data: import("./types").AQIData;
  }>(`${API_BASE}/current-aqi?city=${encodeURIComponent(city)}`);
}

export async function fetchForecast(city: string) {
  return fetchJSON<{
    success: boolean;
    city: string;
    summary: import("./types").ForecastSummary;
    forecast: import("./types").ForecastItem[];
  }>(`${API_BASE}/forecast?city=${encodeURIComponent(city)}`);
}

export async function fetchHealthRisk(aqi: number) {
  return fetchJSON<{
    success: boolean;
    data: import("./types").HealthRiskData;
  }>(`${API_BASE}/health-risk?aqi=${aqi}`);
}

export async function fetchPollutants(city: string) {
  return fetchJSON<{
    success: boolean;
    city: string;
    current_aqi: number;
    dominant_pollutant: string;
    pollutants: import("./types").PollutantDetail[];
  }>(`${API_BASE}/pollutants?city=${encodeURIComponent(city)}`);
}

export async function fetchCities() {
  return fetchJSON<{
    success: boolean;
    cities: { city: string; state?: string; lat: number; lon: number }[];
  }>(`${API_BASE}/cities`);
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
