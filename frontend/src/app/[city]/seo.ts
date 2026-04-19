import type { Metadata } from "next";
import { cache } from "react";

function normalizeCitySlug(slug: unknown): string {
  if (typeof slug !== "string") return "delhi";
  const normalized = slug.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "delhi";
}

export function cityLabelFromSlug(slug: unknown): string {
  return normalizeCitySlug(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const fetchLiveAqi = cache(async (cityLabel: string): Promise<number | null> => {
  const backendUrl = process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : (process.env.NEXT_PUBLIC_API_URL || "https://cleansky-monitor.onrender.com");

  try {
    const res = await fetch(
      `${backendUrl}/api/current-aqi?city=${encodeURIComponent(cityLabel)}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) return null;

    const json = (await res.json()) as { data?: { aqi?: number } };
    const aqi = json?.data?.aqi;
    return typeof aqi === "number" ? Math.round(aqi) : null;
  } catch {
    return null;
  }
});

export async function createCityMetadata(
  citySlug: unknown,
  pageTitle: string,
  pageDescription: string,
  pathSuffix = "",
): Promise<Metadata> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://cleansky-monitor.vercel.app";
  const safeSlug = normalizeCitySlug(citySlug);
  const cityLabel = cityLabelFromSlug(safeSlug);
  const title = pageTitle.replaceAll("[City]", cityLabel);
  const baseDescription = pageDescription.replaceAll("[City]", cityLabel);
  const aqi = await fetchLiveAqi(cityLabel);
  const description =
    aqi !== null ? `${baseDescription} Current AQI: ${aqi}.` : baseDescription;
  const canonicalPath = `/${safeSlug}${pathSuffix}`;
  const imageUrl = `${siteUrl}/api/og?city=${encodeURIComponent(cityLabel)}${aqi !== null ? `&aqi=${aqi}` : ""}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${cityLabel} air quality overview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
