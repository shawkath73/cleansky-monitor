"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCity } from "@/context/CityContext";
import { fetchCities, fetchCurrentAQI, searchCities } from "@/lib/api";
import type { CitySearchResult } from "@/lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CloudSun,
  MapPin,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  Building2,
  Loader2,
  Radio,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/forecast", label: "Forecast" },
  { href: "/pollutants", label: "Pollutants" },
  { href: "/health", label: "Health" },
];

type AlertLevel = "info" | "warning" | "critical";

interface InAppAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  time: string;
}

function getAlertAccent(level: AlertLevel): string {
  if (level === "critical") return "#EF4444";
  if (level === "warning") return "#F97316";
  return "#7C9CFF";
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// AQI badge color helper
function getAQIBadgeColor(aqi: number | string): string {
  const val = typeof aqi === "string" ? parseInt(aqi, 10) : aqi;
  if (isNaN(val) || val <= 0) return "#64748B";
  if (val <= 50) return "#22C55E";
  if (val <= 100) return "#EAB308";
  if (val <= 200) return "#F97316";
  if (val <= 300) return "#EF4444";
  return "#7C3AED";
}

function getCityLabel(result: CitySearchResult): string {
  return (result.city || result.name || "").trim();
}

function sortCitiesAlphabetically(
  cities: CitySearchResult[],
): CitySearchResult[] {
  return [...cities].sort((a, b) =>
    getCityLabel(a).localeCompare(getCityLabel(b), "en", {
      sensitivity: "base",
    }),
  );
}

// City item component (shared between desktop and mobile)
function CityItem({
  result,
  isActive,
  onSelect,
}: {
  result: CitySearchResult;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${
        isActive
          ? "bg-[#7C9CFF]/15 text-[#7C9CFF]"
          : "text-[#94A3B8] hover:bg-[#1E293B]/30 hover:text-[#E2E8F0]"
      }`}
      onClick={onSelect}
    >
      <Building2 className="w-3.5 h-3.5 opacity-50 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="block truncate font-medium">
          {result.city || result.name}
        </span>
        {result.state && (
          <span className="block text-xs text-[#64748B] truncate">
            {result.state}
          </span>
        )}
      </div>
      {result.station_name && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Radio className="w-3 h-3 text-[#64748B]" />
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded-md"
            style={{
              backgroundColor: `${getAQIBadgeColor(result.aqi)}20`,
              color: getAQIBadgeColor(result.aqi),
            }}
          >
            {result.aqi}
          </span>
        </div>
      )}
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { city, lat, lon, setCity } = useCity();

  // Default cities (loaded once)
  const [defaultCities, setDefaultCities] = useState<CitySearchResult[]>([]);
  // Dynamic search results
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [normalizedSearch, setNormalizedSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Load default cities on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? (savedTheme as "light" | "dark")
        : prefersLight
          ? "light"
          : "dark";

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchCities()
      .then((res) => {
        const defaults: CitySearchResult[] = res.cities.map((c) => ({
          city: typeof c === "string" ? c : c.city,
          state: typeof c === "string" ? "" : c.state || "",
          lat: typeof c === "string" ? 0 : c.lat,
          lon: typeof c === "string" ? 0 : c.lon,
          station_name: "",
          aqi: "-",
        }));
        setDefaultCities(sortCitiesAlphabetically(defaults));
      })
      .catch(() => {
        setDefaultCities(
          sortCitiesAlphabetically(
            [
              "Delhi",
              "Mumbai",
              "Chennai",
              "Kolkata",
              "Bangalore",
              "Hyderabad",
              "Ahmedabad",
              "Pune",
              "Jaipur",
              "Lucknow",
            ].map((name) => ({
              city: name,
              state: "",
              lat: 0,
              lon: 0,
              station_name: "",
              aqi: "-",
            })),
          ),
        );
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      setAlertsLoading(true);

      try {
        const res = await fetchCurrentAQI(city, lat, lon);
        if (cancelled) return;

        const data = res.data;
        const aqi = Math.round(data.aqi ?? 0);
        const nowStamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        const nextAlerts: InAppAlert[] = [];

        if (aqi > 200) {
          nextAlerts.push({
            id: "aqi-critical",
            level: "critical",
            title: `Hazardous trend in ${city}`,
            description: `AQI is ${aqi}. Avoid outdoor activity for sensitive groups.`,
            time: nowStamp,
          });
        } else if (aqi > 100) {
          nextAlerts.push({
            id: "aqi-warning",
            level: "warning",
            title: `Elevated AQI in ${city}`,
            description: `AQI is ${aqi}. Reduce prolonged outdoor exertion.`,
            time: nowStamp,
          });
        } else {
          nextAlerts.push({
            id: "aqi-info",
            level: "info",
            title: `Air quality stable in ${city}`,
            description: `AQI is ${aqi}. Conditions are currently low risk for most users.`,
            time: nowStamp,
          });
        }

        const parsedUpdatedAt = data.datetime ? new Date(data.datetime) : null;
        const lastUpdatedMinutes =
          parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - parsedUpdatedAt.getTime()) / (1000 * 60),
                ),
              )
            : null;

        if (lastUpdatedMinutes !== null && lastUpdatedMinutes >= 30) {
          nextAlerts.push({
            id: "aqi-stale",
            level: "warning",
            title: "Data freshness warning",
            description: `Latest city reading is ${lastUpdatedMinutes} minutes old.`,
            time: nowStamp,
          });
        }

        setAlerts(nextAlerts);
      } catch {
        if (cancelled) return;

        setAlerts([
          {
            id: "alerts-unavailable",
            level: "warning",
            title: "Alert feed unavailable",
            description:
              "Unable to refresh alerts right now. Live monitoring will retry automatically.",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } finally {
        if (!cancelled) {
          setAlertsLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [city, lat, lon]);

  // Dynamic search when user types
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      // Clear state asynchronously to avoid React cascading render warnings
      const t = setTimeout(() => {
        setSearchResults([]);
        setNormalizedSearch("");
        setSearching(false);
      }, 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const t2 = setTimeout(() => {
      if (!cancelled) setSearching(true);
    }, 0);

    searchCities(debouncedSearch)
      .then((res) => {
        if (!cancelled) {
          setSearchResults(sortCitiesAlphabetically(res.results));
          setNormalizedSearch(
            (res.translated_query || res.normalized_query || "").trim(),
          );
          setSearching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchResults([]);
          setNormalizedSearch("");
          setSearching(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(t2);
    };
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }

      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Which list to show: search results if actively searching, otherwise defaults
  const filteredDefaults = defaultCities.filter((c) =>
    c.city.toLowerCase().includes(search.toLowerCase()),
  );

  const displayList =
    search.length >= 2 && searchResults.length > 0
      ? searchResults
      : filteredDefaults;
  const showNormalizedSearch =
    search.length >= 2 &&
    normalizedSearch.length > 0 &&
    normalizedSearch.toLowerCase() !== search.trim().toLowerCase();
  const unreadAlertCount = alerts.filter((a) => a.level !== "info").length;

  const handleSelect = useCallback(
    (result: CitySearchResult) => {
      setCity(result.city || result.name || "Delhi", result.lat, result.lon);
      setOpen(false);
      setMobileOpen(false);
      setAlertsOpen(false);
      setSearch("");
      setNormalizedSearch("");
      setSearchResults([]);
    },
    [setCity],
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <nav
      className="sticky top-0 z-[3000] isolate glass border-b border-[#1E293B]/30"
      style={{ borderRadius: 0 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <CloudSun className="w-6 h-6 text-[#7C9CFF]" />
            <span className="text-xl font-bold text-[#E2E8F0] tracking-widest uppercase">
              Clean<span className="text-[#7C9CFF]">Sky</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-[#7C9CFF]/15 text-[#7C9CFF]"
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1E293B]/30"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Notifications */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => setAlertsOpen((prev) => !prev)}
              className="relative inline-flex items-center justify-center ml-2 p-2 rounded-lg glass-light text-[#94A3B8] hover:text-[#E2E8F0]"
              aria-label="Open in-app alerts"
              title="In-app alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-[#EF4444] text-white flex items-center justify-center">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {alertsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-12 z-[3100] w-80 glass border border-[#1E293B]/50 rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="px-4 py-3 border-b border-[#1E293B]/40 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#E2E8F0]">
                      In-app Alerts
                    </p>
                    <span className="text-xs text-[#64748B]">{city}</span>
                  </div>

                  <ul className="max-h-72 overflow-y-auto p-2 space-y-2">
                    {alertsLoading && (
                      <li className="px-3 py-3 rounded-lg text-sm text-[#64748B] flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Refreshing alerts...
                      </li>
                    )}

                    {!alertsLoading &&
                      alerts.map((alert) => {
                        const accent = getAlertAccent(alert.level);
                        return (
                          <li
                            key={alert.id}
                            className="rounded-lg border px-3 py-2.5"
                            style={{
                              borderColor: `${accent}55`,
                              backgroundColor: `${accent}12`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[#E2E8F0]">
                                {alert.title}
                              </p>
                              <span className="text-[11px] text-[#94A3B8] shrink-0">
                                {alert.time}
                              </span>
                            </div>
                            <p className="text-xs mt-1 text-[#C7D2FE] leading-relaxed">
                              {alert.description}
                            </p>
                          </li>
                        );
                      })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="hidden sm:inline-flex items-center justify-center ml-3 p-2 rounded-lg glass-light text-[#94A3B8] hover:text-[#E2E8F0]"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* City search — Desktop */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <div
              className="flex items-center gap-2 glass-light px-3 py-2 cursor-pointer min-w-[180px]"
              onClick={() => setOpen(!open)}
            >
              <MapPin className="w-4 h-4 text-[#7C9CFF]" />
              <span className="text-sm text-[#E2E8F0] font-medium">{city}</span>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
              </motion.div>
            </div>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-12 z-[3100] w-80 glass border border-[#1E293B]/50 rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="p-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search any city worldwide…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none focus:border-[#7C9CFF] transition-colors pr-8"
                        autoFocus
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-[#7C9CFF] animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Section label */}
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] text-[#64748B] uppercase tracking-widest font-medium">
                      {search.length >= 2 ? `Search results` : "Popular cities"}
                    </span>
                    {showNormalizedSearch && (
                      <p className="mt-1 text-[11px] text-[#94A3B8]">
                        Searching as:{" "}
                        <span className="text-[#7C9CFF]">
                          {normalizedSearch}
                        </span>
                      </p>
                    )}
                  </div>

                  <ul className="max-h-64 overflow-y-auto">
                    {displayList.map((result, i) => (
                      <li key={`${result.city}-${result.lat}-${i}`}>
                        <CityItem
                          result={result}
                          isActive={result.city === city}
                          onSelect={() => handleSelect(result)}
                        />
                      </li>
                    ))}
                    {displayList.length === 0 && !searching && (
                      <li className="px-4 py-3 text-sm text-[#64748B]">
                        {search.length >= 2
                          ? "No cities found"
                          : "Type to search…"}
                      </li>
                    )}
                    {searching && displayList.length === 0 && (
                      <li className="px-4 py-3 text-sm text-[#64748B] flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Searching…
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1E293B]/30"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden relative z-[3100] overflow-hidden border-t border-[#1E293B]/30"
            >
              <div className="pb-4 mt-2 pt-3 flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#7C9CFF]/15 text-[#7C9CFF]"
                          : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1E293B]/30"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {/* City selector — mobile */}
                <div className="sm:hidden mt-3 px-2">
                  <button
                    onClick={toggleTheme}
                    className="w-full mb-2 flex items-center justify-center bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#E2E8F0]"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <MapPin className="w-4 h-4 text-[#7C9CFF]" />
                    <span className="text-xs text-[#94A3B8] uppercase tracking-widest font-medium">
                      Select City
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search any city worldwide…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none focus:border-[#7C9CFF] transition-colors mb-1 pr-8"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-[#7C9CFF] animate-spin" />
                    )}
                  </div>
                  {showNormalizedSearch && (
                    <p className="px-2 mb-2 text-[11px] text-[#94A3B8]">
                      Searching as:{" "}
                      <span className="text-[#7C9CFF]">{normalizedSearch}</span>
                    </p>
                  )}
                  <ul className="max-h-44 overflow-y-auto rounded-lg border border-[#1E293B]/40 bg-[#020617]/80">
                    {displayList.map((result, i) => (
                      <li key={`mobile-${result.city}-${result.lat}-${i}`}>
                        <CityItem
                          result={result}
                          isActive={result.city === city}
                          onSelect={() => handleSelect(result)}
                        />
                      </li>
                    ))}
                    {displayList.length === 0 && !searching && (
                      <li className="px-4 py-3 text-sm text-[#64748B]">
                        {search.length >= 2
                          ? "No cities found"
                          : "Type to search…"}
                      </li>
                    )}
                    {searching && displayList.length === 0 && (
                      <li className="px-4 py-3 text-sm text-[#64748B] flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Searching…
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
