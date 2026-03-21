/* AQI category helpers ─────────────────── */

export type AQICategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

/** Map an AQI number → category string */
export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

/** Map a category → hex colour */
export function getAQIColor(category: string): string {
  const map: Record<string, string> = {
    Good: "#00E400",
    Satisfactory: "#92D050",
    Moderate: "#FFFF00",
    Poor: "#FF7E00",
    "Very Poor": "#FF0000",
    Severe: "#7E0023",
  };
  return map[category] ?? "#9CA3AF";
}

/** Map an AQI number → hex colour */
export function getAQIColorByValue(aqi: number): string {
  return getAQIColor(getAQICategory(aqi));
}

/** Map a category → emoji */
export function getAQIEmoji(category: string): string {
  const map: Record<string, string> = {
    Good: "🟢",
    Satisfactory: "🟡",
    Moderate: "🟠",
    Poor: "🔴",
    "Very Poor": "🔴",
    Severe: "🟤",
  };
  return map[category] ?? "⚪";
}
