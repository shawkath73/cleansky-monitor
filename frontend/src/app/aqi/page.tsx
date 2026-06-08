import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Activity } from "lucide-react";
import { getAQIColorByValue } from "@/lib/aqi";

export const metadata: Metadata = {
  title: "India Air Quality Index — All Cities",
  description: "Real-time AQI and 48-hour ML forecasts for major Indian cities. Check India cities AQI today.",
  alternates: {
    canonical: "/aqi",
  },
};

const FALLBACK_CITIES = [
  { city: "Delhi", aqi: 156 },
  { city: "Mumbai", aqi: 82 },
  { city: "Chennai", aqi: 65 },
  { city: "Kolkata", aqi: 140 },
  { city: "Bangalore", aqi: 54 },
  { city: "Hyderabad", aqi: 75 },
  { city: "Ahmedabad", aqi: 110 },
  { city: "Pune", aqi: 68 },
  { city: "Jaipur", aqi: 125 },
  { city: "Lucknow", aqi: 170 },
];

async function getCities() {
  const backendUrl =
    process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:5000"
      : process.env.NEXT_PUBLIC_API_URL || "https://cleansky-monitor.onrender.com";

  try {
    const response = await fetch(`${backendUrl}/api/cities`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return FALLBACK_CITIES;
    }

    const payload = await response.json();
    return payload.cities || FALLBACK_CITIES;
  } catch {
    return FALLBACK_CITIES;
  }
}

function toCitySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function AQIIndexPage() {
  const rawCities = await getCities();
  
  // Deduplicate and normalize
  const cityMap = new Map();
  for (const c of rawCities) {
    const name = typeof c === "string" ? c : c.city || c.name;
    if (!name) continue;
    const slug = toCitySlug(name);
    if (!cityMap.has(slug)) {
      cityMap.set(slug, {
        name: name,
        slug: slug,
        state: c.state || "",
        aqi: c.aqi && !isNaN(parseInt(c.aqi)) ? parseInt(c.aqi) : null,
      });
    }
  }

  const sortedCities = Array.from(cityMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <main className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="hero-atmosphere rounded-2xl p-8 text-center border border-[#1E293B]/50">
        <h1 className="text-3xl md:text-4xl font-bold text-[#E2E8F0] tracking-tight mb-4">
          India Air Quality Index — All Cities
        </h1>
        <p className="text-[#94A3B8] max-w-2xl mx-auto text-lg leading-relaxed">
          Real-time AQI and 48-hour ML forecasts for major Indian cities.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 cities-grid">
        {sortedCities.map((city) => (
          <Link 
            href={`/${city.slug}`} 
            key={city.slug}
            className="group glass-light p-4 rounded-xl border border-[#1E293B]/30 hover:border-[#78EAF8]/50 transition-all duration-300 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#E2E8F0] font-medium group-hover:text-[#78EAF8] transition-colors">
                <Building2 className="w-4 h-4 opacity-60" />
                <span className="truncate">{city.name}</span>
              </div>
            </div>
            
            {city.state && (
              <span className="text-xs text-[#64748B] truncate block -mt-2">
                {city.state}
              </span>
            )}
            
            <div className="mt-auto pt-2 flex items-center justify-between border-t border-[#1E293B]/30">
              <span className="text-xs font-semibold text-[#94A3B8] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Live AQI
              </span>
              <span className="text-sm font-bold" style={{ color: city.aqi ? getAQIColorByValue(city.aqi) : '#94A3B8' }}>
                {city.aqi ?? '--'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
