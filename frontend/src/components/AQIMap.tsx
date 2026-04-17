"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  MapPin,
  Navigation,
  X,
  ExternalLink,
  Wind,
} from "lucide-react";

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

interface StationDetail {
  station: CityStation;
  liveAqi: number | null;
  category: string;
  color: string;
  dominantPollutant: string;
  pollutants: Record<string, number>;
  loading: boolean;
  error: string | null;
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
  if (val === null || val === undefined || val === "-" || val === "")
    return false;
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
            `/api/current-aqi?lat=${latitude}&lon=${longitude}`,
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
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ pointerEvents: "auto" }}
    >
      <div className="leaflet-control" style={{ margin: "12px 12px 0 0" }}>
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
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "#78EAF8" }}
            />
          ) : (
            <Navigation className="w-4 h-4" style={{ color: "#78EAF8" }} />
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <MapPin
                  className="w-4 h-4"
                  style={{ color: getAQIInfo(locAqi).color }}
                />
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
              <span
                style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: 500 }}
              >
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
                    : `${
                        AQI_CATEGORIES[AQI_CATEGORIES.indexOf(cat) - 1]?.max
                          ? AQI_CATEGORIES[AQI_CATEGORIES.indexOf(cat) - 1]
                              .max + 1
                          : 0
                      }–${cat.max}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Custom pane so WAQI tiles don't block marker clicks ── */

function WaqiPane() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("waqiPane")) {
      const pane = map.createPane("waqiPane");
      pane.style.zIndex = "350";
      pane.style.pointerEvents = "none";
    }
  }, [map]);

  return null;
}

/* ── DivIcon Marker Layer ──────────────── */

function AQIDivMarkers({
  stations,
  onStationClick,
}: {
  stations: CityStation[];
  onStationClick: (station: CityStation) => void;
}) {
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
            position:relative;
            display:flex;align-items:center;justify-content:center;
            width:20px;height:20px;border-radius:50%;
            background:${info.color};
            border:2px solid rgba(255,255,255,0.55);
            font-family:Inter,system-ui,sans-serif;
            box-shadow:0 2px 12px ${info.color}90, 0 0 24px ${info.color}40;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor:pointer;
            z-index:800;
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([station.lat, station.lon], {
          icon: divIcon,
          interactive: true,
          zIndexOffset: 1000,
          riseOnHover: true,
          bubblingMouseEvents: false,
        });

        // On click → lift the station to the React info panel
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onStationClick(station);
          map.flyTo([station.lat, station.lon], Math.max(map.getZoom(), 8), {
            duration: 0.8,
          });
        });

        marker.addTo(map);
        markers.push(marker);
      });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [stations, map, onStationClick]);

  return null;
}

/* ── Station Info Panel (React overlay) ── */

function StationInfoPanel({
  detail,
  onClose,
}: {
  detail: StationDetail;
  onClose: () => void;
}) {
  const {
    station,
    liveAqi,
    category,
    color,
    dominantPollutant,
    pollutants,
    loading,
    error,
  } = detail;
  const displayAqi =
    liveAqi ?? (isValidAQI(station.aqi) ? parseAQI(station.aqi) : null);
  const displayInfo = displayAqi ? getAQIInfo(displayAqi) : null;
  const c = color || displayInfo?.color || "#78EAF8";

  // Build sorted pollutant list
  const pollutantList = Object.entries(pollutants)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: "absolute",
        top: "24px",
        left: "24px",
        zIndex: 1200,
        width: "360px",
        maxHeight: "calc(100% - 48px)",
        overflowY: "auto",
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: "24px",
        boxShadow: `0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)`,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "24px",
        scrollbarWidth: "none",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: "rgba(255,255,255,0.06)",
          border: "none",
          borderRadius: "10px",
          padding: "6px",
          cursor: "pointer",
          color: "#94A3B8",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.12)";
          e.currentTarget.style.color = "#E2E8F0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "#94A3B8";
        }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 700,
            color: "#E2E8F0",
          }}
        >
          <span style={{ color: "#38bdf8" }}>CleanSky</span> Air Quality
        </h2>
      </div>

      {/* Station Name Details */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        <MapPin
          className="w-5 h-5"
          style={{ color: "#38bdf8", flexShrink: 0, marginTop: "2px" }}
        />
        <div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#38bdf8",
              margin: "0 0 2px 0",
              lineHeight: 1.3,
            }}
          >
            {station.name}
          </h3>
          {station.state && (
            <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
              {station.state}
            </p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "16px",
            background: "rgba(124,156,255,0.06)",
            borderRadius: "12px",
            marginBottom: "16px",
          }}
        >
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#78EAF8" }}
          />
          <span style={{ fontSize: "13px", color: "#94A3B8" }}>
            Fetching live data…
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "10px",
            color: "#fca5a5",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* AQI Display */}
      {displayAqi !== null && (
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#94A3B8",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Wind className="w-4 h-4" />
            Air Quality Index
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                fontWeight: 800,
                color: c,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.04em",
              }}
            >
              {displayAqi}
            </span>
            <div
              style={{
                background: c,
                color: displayAqi > 200 ? "#ffffff" : "#0f172a",
                padding: "6px 16px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 700,
                boxShadow: `0 4px 12px ${c}40`,
              }}
            >
              {category || displayInfo?.label || "–"}
            </div>
          </div>
          {dominantPollutant && (
            <div
              style={{ fontSize: "12px", color: "#94A3B8", marginTop: "12px" }}
            >
              Dominant Pollutant:{" "}
              <span style={{ color: "#E2E8F0", fontWeight: 600 }}>
                {dominantPollutant}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pollutant Breakdown - Styled like the screenshot */}
      {pollutantList.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {pollutantList.slice(0, 5).map(([name, value]) => {
              // rough normalization for max bar width (using an arbitrary 100 max for UI scale)
              const maxVal = Math.max(pollutantList[0][1], 100);
              const pct = Math.min(100, Math.round((value / maxVal) * 100));

              const isHigh = pct > 60;
              const barColor = isHigh
                ? "#f97316"
                : pct > 30
                  ? "#eab308"
                  : "#84cc16";

              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      color: "#E2E8F0",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      width: "100px",
                      textAlign: "right",
                      color: "#F8FAFC",
                      fontSize: "14px",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value.toFixed(1)}{" "}
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#94A3B8",
                        fontWeight: 500,
                      }}
                    >
                      µg/m³
                    </span>
                  </div>
                  <div
                    style={{
                      width: "60px",
                      height: "4px",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "2px",
                      position: "relative",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.8,
                        delay: 0.1,
                        ease: "easeOut",
                      }}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        background: barColor,
                        borderRadius: "2px",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: barColor,
                        boxShadow: `0 0 6px ${barColor}`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Color Scale */}
      <div
        style={{
          display: "flex",
          borderRadius: "6px",
          overflow: "hidden",
          height: "12px",
          marginBottom: "20px",
        }}
      >
        {AQI_CATEGORIES.map((cat) => (
          <div
            key={cat.label}
            style={{ flex: 1, backgroundColor: cat.color }}
            title={cat.label}
          />
        ))}
      </div>

      {/* View Dashboard Link */}
      <a
        href={`/?city=${encodeURIComponent(station.name)}&lat=${station.lat}&lon=${station.lon}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          width: "100%",
          padding: "14px 0",
          background:
            "linear-gradient(135deg, rgba(124, 156, 255, 0.2), rgba(124, 156, 255, 0.05))",
          border: "1px solid rgba(124, 156, 255, 0.2)",
          color: "#78EAF8",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(124, 156, 255, 0.3), rgba(124, 156, 255, 0.1))";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(124, 156, 255, 0.2), rgba(124, 156, 255, 0.05))";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <ExternalLink style={{ width: "16px", height: "16px" }} />
        View Full Dashboard
      </a>
    </motion.div>
  );
}

/* ── Main Map Component ────────────────── */

export default function AQIMap() {
  const [stations, setStations] = useState<CityStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<StationDetail | null>(
    null,
  );

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

  const handleStationClick = useCallback(async (station: CityStation) => {
    const aqi = isValidAQI(station.aqi) ? parseAQI(station.aqi) : 0;
    const info = getAQIInfo(aqi);

    // Set initial state with map data
    setSelectedDetail({
      station,
      liveAqi: aqi || null,
      category: info.label,
      color: info.color,
      dominantPollutant: "",
      pollutants: {},
      loading: true,
      error: null,
    });

    // Fetch live data from backend
    try {
      const [aqiRes, pollRes] = await Promise.all([
        fetch(
          `/api/current-aqi?city=${encodeURIComponent(station.name)}&lat=${station.lat}&lon=${station.lon}`,
        ).then((r) => r.json()),
        fetch(
          `/api/pollutants?city=${encodeURIComponent(station.name)}&lat=${station.lat}&lon=${station.lon}`,
        ).then((r) => r.json()),
      ]);

      const liveAqi = aqiRes.success ? Math.round(aqiRes.data.aqi) : aqi;
      const liveInfo = getAQIInfo(liveAqi);
      const pollutantMap: Record<string, number> = {};

      if (pollRes.success && pollRes.pollutants) {
        for (const p of pollRes.pollutants) {
          if (p.value > 0) pollutantMap[p.name] = p.value;
        }
      } else if (aqiRes.success && aqiRes.data.pollutants) {
        // Fallback: use pollutant values from AQI endpoint
        for (const [k, v] of Object.entries(aqiRes.data.pollutants)) {
          if (typeof v === "number" && v > 0) pollutantMap[k] = v;
        }
      }

      setSelectedDetail({
        station,
        liveAqi,
        category: aqiRes.success ? aqiRes.data.category : liveInfo.label,
        color: liveInfo.color,
        dominantPollutant: aqiRes.success
          ? aqiRes.data.dominant_pollutant || ""
          : "",
        pollutants: pollutantMap,
        loading: false,
        error: null,
      });
    } catch {
      // If API fails, keep the map-provided AQI
      setSelectedDetail((prev) =>
        prev
          ? { ...prev, loading: false, error: "Could not fetch live data" }
          : null,
      );
    }
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
                style={{ width: "32px", height: "32px", color: "#78EAF8" }}
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

      {/* Station Info Panel (React-driven, not Leaflet popup) */}
      <AnimatePresence>
        {selectedDetail && (
          <StationInfoPanel
            detail={selectedDetail}
            onClose={() => setSelectedDetail(null)}
          />
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

        {/* Pane for WAQI overlay (pointer-events: none) */}
        <WaqiPane />

        {/* WAQI AQI Overlay Tiles — in custom pane so they don't block marker clicks */}
        {waqiToken && (
          <TileLayer
            url={`https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${waqiToken}`}
            opacity={0.6}
            pane="waqiPane"
            attribution='&copy; <a href="https://waqi.info/">WAQI</a>'
          />
        )}

        {/* WAQI Station DivIcon Markers */}
        <AQIDivMarkers
          stations={stations}
          onStationClick={handleStationClick}
        />

        {/* Locate Me Button */}
        <LocateMeButton />

        {/* Legend */}
        <AQILegend />
      </MapContainer>

      {/* Custom styles */}
      <style>{`
        .aqi-div-marker {
          background: none !important;
          border: none !important;
          pointer-events: auto !important;
          z-index: 800 !important;
        }
        .aqi-div-marker > div:hover {
          transform: scale(1.2) !important;
          box-shadow: 0 4px 24px currentColor !important;
        }
        /* Ensure marker pane is above everything */
        .leaflet-marker-pane {
          z-index: 700 !important;
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
          color: #78EAF8 !important;
        }
        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
