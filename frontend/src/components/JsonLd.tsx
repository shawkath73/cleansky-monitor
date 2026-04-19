import { cityLabelFromSlug } from "@/app/[city]/seo";

interface JsonLdProps {
  citySlug: string;
  section?: "dashboard" | "forecast" | "health" | "pollutants" | "map";
}

function sectionLabel(section: JsonLdProps["section"]): string {
  if (!section || section === "dashboard") return "Dashboard";
  if (section === "forecast") return "Forecast";
  if (section === "health") return "Health";
  if (section === "pollutants") return "Pollutants";
  return "Map";
}

export default function JsonLd({ citySlug, section = "dashboard" }: JsonLdProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const cityLabel = cityLabelFromSlug(citySlug);
  const suffix = section === "dashboard" ? "" : `/${section}`;
  const pageUrl = `${siteUrl}/${citySlug}${suffix}`;
  const imageUrl = `${siteUrl}/api/og?city=${encodeURIComponent(cityLabel)}`;

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteUrl,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: cityLabel,
      item: `${siteUrl}/${citySlug}`,
    },
  ];

  if (section !== "dashboard") {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: sectionLabel(section),
      item: pageUrl,
    });
  }

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "CleanSky",
        applicationCategory: "EnvironmentApplication",
        operatingSystem: "Web",
        url: pageUrl,
        image: imageUrl,
      },
      {
        "@type": "Dataset",
        name: `${cityLabel} Air Quality Dataset`,
        description: `Live and forecast AQI metrics for ${cityLabel}.`,
        url: pageUrl,
        image: imageUrl,
        license: `${siteUrl}/terms`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
