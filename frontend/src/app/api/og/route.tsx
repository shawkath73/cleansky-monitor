import { ImageResponse } from "next/og";

export const runtime = "edge";

function aqiColor(aqi: number | null): string {
  if (aqi === null) return "#78EAF8";
  if (aqi <= 50) return "#22C55E";
  if (aqi <= 100) return "#EAB308";
  if (aqi <= 200) return "#F97316";
  if (aqi <= 300) return "#EF4444";
  return "#7C3AED";
}

async function fetchAqiFromApi(city: string): Promise<number | null> {
  const backendUrl = process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : (process.env.NEXT_PUBLIC_API_URL || "https://cleansky-monitor.onrender.com");

  try {
    const res = await fetch(
      `${backendUrl}/api/current-aqi?city=${encodeURIComponent(city)}`,
      { 
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10000) 
      },
    );

    if (!res.ok) return null;

    const payload = (await res.json()) as { data?: { aqi?: number } };
    const aqi = payload?.data?.aqi;
    return typeof aqi === "number" ? Math.round(aqi) : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get("city") || "Delhi").trim() || "Delhi";

  const aqiParam = searchParams.get("aqi");
  const parsedAqi = aqiParam ? Number(aqiParam) : Number.NaN;
  const resolvedAqi = Number.isFinite(parsedAqi)
    ? Math.round(parsedAqi)
    : await fetchAqiFromApi(city);

  const accent = aqiColor(resolvedAqi);
  const aqiLabel = resolvedAqi === null ? "AQI unavailable" : `AQI ${resolvedAqi}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "linear-gradient(130deg, #031122 0%, #0A2238 55%, #123654 100%)",
          color: "#EAF4FF",
          fontFamily: "Segoe UI",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-90px",
            top: "-70px",
            width: "340px",
            height: "340px",
            borderRadius: "999px",
            background: `${accent}30`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "40px",
            bottom: "-110px",
            width: "380px",
            height: "380px",
            borderRadius: "999px",
            background: `${accent}25`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              borderRadius: "999px",
              background: "#0A1B2B",
              border: "1px solid #24435E",
              fontSize: "24px",
            }}
          >
            CleanSky Monitor
          </div>

          <div style={{ fontSize: "78px", fontWeight: 700, lineHeight: 1.05 }}>
            {city}
          </div>
          <div style={{ fontSize: "34px", color: "#B8CCE0" }}>Live Air Quality Intelligence</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "28px", color: "#BCD3E8" }}>Real-time city health signal</div>
            <div style={{ fontSize: "22px", color: "#8FAFCA" }}>Forecasts, trends, and station intelligence</div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 24px",
              borderRadius: "18px",
              background: "#0B1F31",
              border: `2px solid ${accent}`,
              color: accent,
              fontSize: "42px",
              fontWeight: 700,
            }}
          >
            {aqiLabel}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
