"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Navigation } from "lucide-react";

/* ── Types ─────────────────────────────── */

interface CityStation {
  name: string;
  broad_city?: string;
  state?: string;
  lat: number;
  lon: number;
  uid?: string;
  aqi: number | string;
}

/* ── AQI Color Helpers ─────────────────── */

const AQI_CATEGORIES = [
  { max: 50, label: "Good", color: "#22c55e" },
  { max: 100, label: "Satisfactory", color: "#84cc16" },
  { max: 200, label: "Moderate", color: "#eab308" },
  { max: 300, label: "Poor", color: "#f97316" },
  { max: 400, label: "Very Poor", color: "#ef4444" },
  { max: Infinity, label: "Severe", color: "#7f1d1d" },
] as const;

function getAQIInfo(aqi: number) {
  for (const cat of AQI_CATEGORIES) {
    if (aqi <= cat.max) return cat;
  }
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

function isValidAQI(val: unknown): val is number {
  if (val === null || val === undefined || val === "-" || val === "") return false;
  const n = typeof val === "string" ? parseInt(val, 10) : (val as number);
  return !isNaN(n) && n > 0;
}

function parseAQI(val: number | string): number {
  return typeof val === "string" ? parseInt(val, 10) : val;
}

/* ── Locate Me Controller ──────────────── */

function LocateMeButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [locAqi, setLocAqi] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLocate = () => {
    if (locating) return;
    setLocating(true);
    setError(null);
    setLocAqi(null);
    setLocated(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 10, { duration: 1.5 });

        try {
          const res = await fetch(
            `/api/current-aqi?lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data.success && data.data?.aqi) {
            setLocAqi(Math.round(data.data.aqi));
          }
        } catch {
          /* silently ignore fetch errors */
        }

        setLocated(true);
        setLocating(false);
      },
      () => {
        setError("Location access denied");
        setLocating(false);
        setTimeout(() => setError(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: "auto" }}>
      <div
        className="leaflet-control"
        style={{ margin: "12px 12px 0 0" }}
      >
        <button
          id="locate-me-btn"
          onClick={handleLocate}
          disabled={locating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "rgba(20, 21, 24, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "#E2E8F0",
            fontSize: "13px",
            fontWeight: 600,
            cursor: locating ? "wait" : "pointer",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            transition: "all 0.2s ease",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(124,156,255,0.4)";
            e.currentTarget.style.boxShadow =
              "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(124,156,255,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
          }}
        >
          {locating ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7C9CFF" }} />
          ) : (
            <Navigation className="w-4 h-4" style={{ color: "#7C9CFF" }} />
          )}
          {locating ? "Locating…" : "Locate Me"}
        </button>

        {/* AQI result popup */}
        <AnimatePresence>
          {located && locAqi !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              style={{
                marginTop: "8px",
                padding: "12px 16px",
                background: "rgba(20, 21, 24, 0.9)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${getAQIInfo(locAqi).color}40`,
                borderRadius: "12px",
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${getAQIInfo(locAqi).color}20`,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin className="w-4 h-4" style={{ color: getAQIInfo(locAqi).color }} />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 500,
                  }}
                >
                  Your Location
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  marginTop: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: getAQIInfo(locAqi).color,
                    lineHeight: 1,
                  }}
                >
                  {locAqi}
                </span>
                <span style={{ fontSize: "13px", color: "#94A3B8" }}>
                  {getAQIInfo(locAqi).label}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginTop: "8px",
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px",
                color: "#fca5a5",
                fontSize: "12px",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Legend ─────────────────────────────── */

function AQILegend() {
  return (
    <div
      className="leaflet-bottom leaflet-left"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="leaflet-control"
        id="aqi-legend"
        style={{
          margin: "0 0 16px 12px",
          padding: "16px 20px",
          background: "rgba(20, 21, 24, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          fontFamily: "Inter, system-ui, sans-serif",
          minWidth: "160px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#64748B",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          AQI Scale
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {AQI_CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              style={{ display: "flex", alignItems: "center", gap: "10px" }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  backgroundColor: cat.color,
                  boxShadow: `0 0 8px ${cat.color}40`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: 500 }}>
                {cat.label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748B",
                  marginLeft: "auto",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {cat.max === Infinity
                  ? "400+"
                  : cat.max === 50
                    ? "0–50"
                    : `${AQI_CATEGORIES[AQI_CATEGORIES.indexOf(cat) - 1]?.max
                        ? AQI_CATEGORIES[AQI_CATEGORIES.indexOf(cat) - 1].max + 1
                        : 0}–${cat.max}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ── DivIcon Marker Layer ──────────────── */
/* We use a separate component to render markers with DivIcon containing AQI numbers */

function AQIDivMarkers({ stations }: { stations: CityStation[] }) {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    stations
      .filter((s) => isValidAQI(s.aqi))
      .forEach((station) => {
        const aqi = parseAQI(station.aqi);
        const info = getAQIInfo(aqi);

        const divIcon = L.divIcon({
          className: "aqi-div-marker",
          html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:32px;height:32px;border-radius:50%;
            background:${info.color};
            border:2px solid rgba(255,255,255,0.3);
            color:#fff;font-size:11px;font-weight:700;
            font-family:Inter,system-ui,sans-serif;
            box-shadow:0 2px 10px ${info.color}80, 0 0 20px ${info.color}30;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor:pointer;
          ">${aqi}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([station.lat, station.lon], { icon: divIcon });

        marker.bindPopup(
          `<div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:4px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${info.color};box-shadow:0 0 8px ${info.color};"></div>
              <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748B;font-weight:600;">Monitoring Station</span>
            </div>
            <h3 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 4px 0;line-height:1.3;">${station.name}</h3>
            ${station.state ? `<p style="font-size:12px;color:#64748B;margin:0 0 12px 0;">${station.state}</p>` : ""}
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:${info.color}12;border-radius:10px;border:1px solid ${info.color}25;margin-bottom:12px;">
              <span style="font-size:28px;font-weight:800;color:${info.color};line-height:1;font-variant-numeric:tabular-nums;">${aqi}</span>
              <div>
                <div style="font-size:12px;font-weight:600;color:${info.color};">${info.label}</div>
                <div style="font-size:10px;color:#94A3B8;margin-top:2px;">Air Quality Index</div>
              </div>
            </div>
            <a href="/?city=${encodeURIComponent(station.name)}&lat=${station.lat}&lon=${station.lon}" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 0;background:${info.color};color:${aqi > 400 ? "#fecaca" : "#fff"};border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
              View Details →
            </a>
          </div>`,
          {
            className: "aqi-popup",
            maxWidth: 260,
          }
        );

        marker.addTo(map);
        markers.push(marker);
      });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [stations, map]);

  return null;
}


/* ── Main Map Component ────────────────── */

export default function AQIMap() {
  const [stations, setStations] = useState<CityStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStations() {
      try {
        const res = await fetch("/api/cities");
        const data = await res.json();
        if (data.success && data.cities) {
          setStations(data.cities);
        }
      } catch (err) {
        console.error("Failed to load stations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStations();
  }, []);

  const waqiToken = process.env.NEXT_PUBLIC_WAQI_TOKEN || "";

  return (
    <div
      id="aqi-map-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13, 14, 16, 0.9)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Loader2
                className="animate-spin"
                style={{ width: "32px", height: "32px", color: "#7C9CFF" }}
              />
              <span
                style={{
                  fontSize: "13px",
                  color: "#94A3B8",
                  fontFamily: "Inter, system-ui, sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                Loading stations…
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={14}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Dark CartoDB Base Tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* WAQI AQI Overlay Tiles */}
        {waqiToken && (
          <TileLayer
            url={`https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${waqiToken}`}
            opacity={0.6}
            attribution='&copy; <a href="https://waqi.info/">WAQI</a>'
          />
        )}

        {/* Indian Station DivIcon Markers */}
        <AQIDivMarkers stations={stations} />

        {/* Locate Me Button */}
        <LocateMeButton />

        {/* Legend */}
        <AQILegend />
      </MapContainer>

      {/* Custom styles for leaflet popups */}
      <style>{`
        .aqi-div-marker {
          background: none !important;
          border: none !important;
        }
        .aqi-div-marker > div:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 4px 20px currentColor !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(255,255,255,0.97) !important;
          border-radius: 14px !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.2) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
          font-family: Inter, system-ui, sans-serif !important;
        }
        .leaflet-popup-tip {
          background: rgba(255,255,255,0.97) !important;
        }
        .leaflet-popup-close-button {
          color: #94A3B8 !important;
          font-size: 20px !important;
          padding: 8px 10px 0 0 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #475569 !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(20, 21, 24, 0.85) !important;
          backdrop-filter: blur(16px);
          color: #E2E8F0 !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 16px !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30, 31, 34, 0.95) !important;
          color: #7C9CFF !important;
        }
        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
