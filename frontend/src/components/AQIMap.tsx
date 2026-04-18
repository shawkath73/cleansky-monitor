"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  LocateFixed,
  Plus,
  Minus,
  Layers,
  Search,
  X,
  ArrowRight,
  Radio,
  Activity,
} from "lucide-react";

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

const AQI_CATEGORIES = [
  { max: 50, label: "Excellent", color: "#22c55e" },
  { max: 100, label: "Good", color: "#84cc16" },
  { max: 200, label: "Moderate", color: "#facc15" },
  { max: 300, label: "Poor", color: "#f97316" },
  { max: 400, label: "Very Poor", color: "#ef4444" },
  { max: Infinity, label: "Severe", color: "#991b1b" },
] as const;

function getAQIInfo(aqi: number) {
  for (const cat of AQI_CATEGORIES) {
    if (aqi <= cat.max) return cat;
  }
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

function isValidAQI(val: unknown): val is number {
  if (val === null || val === undefined || val === "-" || val === "") {
    return false;
  }
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val);
  return !Number.isNaN(n) && n > 0;
}

function parseAQI(val: number | string): number {
  return typeof val === "string" ? parseInt(val, 10) : val;
}

function formatCategoryLabel(label: string) {
  return label.toUpperCase();
}

function MapCommandRail({
  onLocate,
  locating,
}: {
  onLocate: () => void;
  locating: boolean;
}) {
  const map = useMap();

  return (
    <div className="absolute left-5 top-6 z-[1200] flex flex-col gap-3 pointer-events-auto">
      <div className="rounded-xl border border-white/10 bg-[#0B111B]/90 p-2 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          className="h-10 w-10 rounded-md bg-[#97BDF8] text-[#0D1626] grid place-items-center hover:brightness-110 transition disabled:opacity-60"
          title="Locate me"
        >
          {locating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="mt-2 h-10 w-10 rounded-md text-[#D6DEE9] grid place-items-center bg-transparent hover:bg-white/5 transition"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="h-10 w-10 rounded-md text-[#D6DEE9] grid place-items-center bg-transparent hover:bg-white/5 transition"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0B111B]/90 p-2 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          className="h-10 w-10 rounded-md text-[#84F2FF] grid place-items-center hover:bg-white/5 transition"
          title="Live station mode"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="h-10 w-10 rounded-md text-[#D6DEE9] grid place-items-center hover:bg-white/5 transition"
          title="Monitor traffic impact"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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
            display:flex;align-items:center;justify-content:center;
            width:10px;height:10px;border-radius:50%;
            background:${info.color};
            box-shadow:0 0 0 2px rgba(255,255,255,0.2), 0 0 16px ${info.color}80;
            transition: transform .2s ease;
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const marker = L.marker([station.lat, station.lon], {
          icon: divIcon,
          interactive: true,
          zIndexOffset: 900,
          riseOnHover: true,
          bubblingMouseEvents: false,
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onStationClick(station);
          map.flyTo([station.lat, station.lon], Math.max(map.getZoom(), 9), {
            duration: 0.8,
          });
        });

        marker.addTo(map);
        markers.push(marker);
      });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [map, onStationClick, stations]);

  return null;
}

function SearchOverlay({
  stations,
  onSelect,
}: {
  stations: CityStation[];
  onSelect: (station: CityStation) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return stations
      .filter((s) => {
        const city = (s.broad_city || "").toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          city.includes(q) ||
          (s.state || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [query, stations]);

  return (
    <div className="absolute left-1/2 top-6 z-[1200] w-[min(540px,calc(100%-11rem))] -translate-x-1/2 pointer-events-auto">
      <div className="rounded-xl border border-white/10 bg-[#0B111B]/90 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)] px-4 py-3">
        <div className="flex items-center gap-3 text-[#64748B]">
          <Search className="w-4 h-4 text-[#7EA9CF]" />
          <input
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search station, city or coordinates..."
            className="w-full bg-transparent outline-none text-sm text-[#DCE5F2] placeholder:text-[#5D6A7E]"
          />
          <span className="text-[10px] uppercase tracking-wider text-[#5D6A7E] border border-white/10 rounded px-1.5 py-0.5">
            10K
          </span>
        </div>
      </div>

      <AnimatePresence>
        {open && results.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 rounded-xl border border-white/10 bg-[#0B111B]/95 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            {results.map((result) => (
              <button
                type="button"
                key={`${result.uid || result.name}-${result.lat}-${result.lon}`}
                onClick={() => {
                  onSelect(result);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition"
              >
                <p className="text-sm font-medium text-[#DCE5F2]">
                  {result.name}
                </p>
                <p className="text-xs text-[#7D8BA1]">
                  {[result.broad_city, result.state]
                    .filter(Boolean)
                    .join(", ") ||
                    `${result.lat.toFixed(2)}, ${result.lon.toFixed(2)}`}
                </p>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

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
  const currentColor = color || displayInfo?.color || "#78EAF8";

  const pollutantRows = Object.entries(pollutants)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute right-5 top-5 z-[1200] w-[min(320px,calc(100%-2.5rem))] h-[calc(100%-5.25rem)] rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(7,12,20,0.96),rgba(11,18,30,0.86))] backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.58)] overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#6E7D94]">
              Station {station.uid || "N2-A"}
            </p>
            <h3 className="text-[28px] leading-none font-extrabold tracking-tight text-[#E5EDF8] mt-2">
              {station.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 h-8 w-8 rounded-md grid place-items-center text-[#8A98AF] hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-[#0B111B]/80 p-3 flex items-center gap-3 text-[#8FA3BD]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Fetching live station feed...</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        {displayAqi !== null ? (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#6E7D94]">
              Current Air Quality
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span
                className="text-[60px] leading-[0.9] font-black tracking-tight"
                style={{ color: currentColor }}
              >
                {displayAqi}
              </span>
              <span className="text-[#DCE5F2] font-semibold pb-3">AQI</span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-[#334155] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7DD9FF] to-[#78EAF8]"
                style={{ width: `${Math.min((displayAqi / 500) * 100, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-right">
              <span
                className="text-[11px] tracking-widest uppercase font-bold"
                style={{ color: currentColor }}
              >
                {formatCategoryLabel(
                  category || displayInfo?.label || "Moderate",
                )}
              </span>
            </div>
            {dominantPollutant ? (
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[#7D8BA1]">
                Dominant Pollutant:{" "}
                <span className="text-[#DCE5F2]">{dominantPollutant}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#6E7D94]">
            Pollutant Readout
          </p>
          <div className="mt-3 space-y-3">
            {pollutantRows.length > 0 ? (
              pollutantRows.map(([name, value]) => (
                <div key={name} className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#98A7BC] uppercase tracking-wide">
                      {name}
                    </p>
                    <p className="text-[26px] leading-none font-bold text-[#E9EFF9] mt-1">
                      {value.toFixed(1)}
                      <span className="text-xs text-[#8090A6] font-medium ml-1">
                        ppb
                      </span>
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-md bg-[#0E1727] border border-white/5 grid place-items-center">
                    <Radio className="w-4 h-4 text-[#78EAF8]" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#8090A6]">
                No pollutant telemetry available.
              </p>
            )}
          </div>
        </div>

        <a
          href={`/?city=${encodeURIComponent(station.name)}&lat=${station.lat}&lon=${station.lon}`}
          className="mt-6 h-10 rounded-md border border-[#9FC7FF]/30 bg-[#97BDF8] text-[#0D1626] font-semibold text-[11px] tracking-[0.16em] uppercase flex items-center justify-center gap-2 hover:brightness-110 transition"
        >
          Full Location Analysis
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="h-10 px-5 border-t border-white/5 bg-[#0A101A] text-[8px] uppercase tracking-[0.14em] text-[#6E7D94] flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#78EAF8]" />
          Live Data Feed
        </span>
        <span>
          Lat: {station.lat.toFixed(4)}, Lon: {station.lon.toFixed(4)}
        </span>
      </div>
    </motion.aside>
  );
}

export default function AQIMap() {
  const [stations, setStations] = useState<CityStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<StationDetail | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

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
      setSelectedDetail((prev) =>
        prev
          ? { ...prev, loading: false, error: "Could not fetch live data" }
          : null,
      );
    }
  }, []);

  const handleLocate = useCallback(
    (map: L.Map) => {
      if (locating) return;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo([latitude, longitude], 10, { duration: 1.4 });
          setLocating(false);
        },
        () => {
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    },
    [locating],
  );

  const waqiToken = process.env.NEXT_PUBLIC_WAQI_TOKEN || "";

  function ControlsBridge() {
    const map = useMap();
    return (
      <MapCommandRail locating={locating} onLocate={() => handleLocate(map)} />
    );
  }

  function SearchBridge() {
    const map = useMap();
    return (
      <SearchOverlay
        stations={stations}
        onSelect={(station) => {
          map.flyTo([station.lat, station.lon], Math.max(map.getZoom(), 9), {
            duration: 0.8,
          });
          void handleStationClick(station);
        }}
      />
    );
  }

  return (
    <div
      id="aqi-map-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 14px 46px rgba(0,0,0,0.52)",
      }}
    >
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-[1300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 text-[#8BA0B9]">
              <Loader2 className="w-8 h-8 animate-spin text-[#78EAF8]" />
              <p className="text-sm tracking-wide uppercase">
                Loading stations...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDetail ? (
          <StationInfoPanel
            detail={selectedDetail}
            onClose={() => setSelectedDetail(null)}
          />
        ) : null}
      </AnimatePresence>

      <MapContainer
        center={[20, 0]}
        zoom={2.5}
        minZoom={2}
        maxZoom={14}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {waqiToken ? (
          <TileLayer
            url={`https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${waqiToken}`}
            opacity={0.58}
            attribution='&copy; <a href="https://waqi.info/">WAQI</a>'
          />
        ) : null}

        <AQIDivMarkers
          stations={stations}
          onStationClick={handleStationClick}
        />
        <ControlsBridge />
        <SearchBridge />
      </MapContainer>

      <style>{`
        .aqi-div-marker {
          background: none !important;
          border: none !important;
          pointer-events: auto !important;
        }
        .aqi-div-marker > div:hover {
          transform: scale(1.5) !important;
        }
        .leaflet-control-container {
          display: none;
        }
      `}</style>
    </div>
  );
}
