import type { MetadataRoute } from "next";

const FALLBACK_CITIES = [
  "delhi",
  "mumbai",
  "chennai",
  "kolkata",
  "bangalore",
  "hyderabad",
  "ahmedabad",
  "pune",
  "jaipur",
  "lucknow",
];

type CityApiItem =
  | string
  | {
      city?: string;
      name?: string;
    };

function toCitySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getCitySlugs(): Promise<string[]> {
  const backendUrl = process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : (process.env.NEXT_PUBLIC_API_URL || "https://cleansky-monitor.onrender.com");

  try {
    const response = await fetch(`${backendUrl}/api/cities`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000), // 10s timeout so build doesn't hang wait for Render to wake up
    });

    if (!response.ok) {
      return FALLBACK_CITIES;
    }

    const payload = (await response.json()) as { cities?: CityApiItem[] };
    const rawCities = payload.cities || [];

    const slugs = rawCities
      .map((item) => {
        if (typeof item === "string") return toCitySlug(item);
        return toCitySlug(item.city || item.name || "");
      })
      .filter(Boolean);

    return Array.from(new Set(slugs)).sort();
  } catch {
    return FALLBACK_CITIES;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cleansky-monitor.vercel.app";
  const cities = await getCitySlugs();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  for (const city of cities) {
    entries.push({
      url: `${siteUrl}/${city}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });
    entries.push({
      url: `${siteUrl}/${city}/forecast`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    });
    entries.push({
      url: `${siteUrl}/${city}/map`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    });
    entries.push({
      url: `${siteUrl}/${city}/health`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    });
    entries.push({
      url: `${siteUrl}/${city}/pollutants`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    });
  }

  return entries;
}
