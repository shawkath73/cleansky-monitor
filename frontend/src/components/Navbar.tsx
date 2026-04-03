"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCity } from "@/context/CityContext";
import { fetchCities, searchCities } from "@/lib/api";
import type { CitySearchResult } from "@/lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudSun,
  MapPin,
  ChevronDown,
  Menu,
  X,
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
        <span className="block truncate font-medium">{result.city || result.name}</span>
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
  const { city, setCity } = useCity();

  // Default cities (loaded once)
  const [defaultCities, setDefaultCities] = useState<CitySearchResult[]>([]);
  // Dynamic search results
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Load default cities on mount
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
        setDefaultCities(defaults);
      })
      .catch(() => {
        setDefaultCities(
          ["Delhi", "Mumbai", "Chennai", "Kolkata", "Bangalore",
           "Hyderabad", "Ahmedabad", "Pune", "Jaipur", "Lucknow"].map(
            (name) => ({
              city: name, state: "", lat: 0, lon: 0,
              station_name: "", aqi: "-",
            })
          )
        );
      });
  }, []);

  // Dynamic search when user types
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      // Clear state asynchronously to avoid React cascading render warnings
      const t = setTimeout(() => {
        setSearchResults([]);
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
          setSearchResults(res.results);
          setSearching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchResults([]);
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
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Which list to show: search results if actively searching, otherwise defaults
  const filteredDefaults = defaultCities.filter((c) =>
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  const displayList =
    search.length >= 2 && searchResults.length > 0
      ? searchResults
      : filteredDefaults;

  const handleSelect = useCallback(
    (name: string) => {
      setCity(name);
      setOpen(false);
      setMobileOpen(false);
      setSearch("");
      setSearchResults([]);
    },
    [setCity]
  );

  return (
    <nav
      className="sticky top-0 z-50 glass border-b border-[#1E293B]/30"
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
                  className="absolute right-0 top-12 w-80 glass border border-[#1E293B]/50 rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="p-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search any Indian city…"
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
                      {search.length >= 2
                        ? `Search results`
                        : "Popular cities"}
                    </span>
                  </div>

                  <ul className="max-h-64 overflow-y-auto">
                    {displayList.map((result, i) => (
                      <li key={`${result.city}-${result.lat}-${i}`}>
                        <CityItem
                          result={result}
                          isActive={result.city === city}
                          onSelect={() => handleSelect(result.city)}
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
              className="md:hidden overflow-hidden border-t border-[#1E293B]/30"
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
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <MapPin className="w-4 h-4 text-[#7C9CFF]" />
                    <span className="text-xs text-[#94A3B8] uppercase tracking-widest font-medium">
                      Select City
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search any Indian city…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none focus:border-[#7C9CFF] transition-colors mb-1 pr-8"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-[#7C9CFF] animate-spin" />
                    )}
                  </div>
                  <ul className="max-h-44 overflow-y-auto rounded-lg border border-[#1E293B]/40 bg-[#020617]/80">
                    {displayList.map((result, i) => (
                      <li key={`mobile-${result.city}-${result.lat}-${i}`}>
                        <CityItem
                          result={result}
                          isActive={result.city === city}
                          onSelect={() => handleSelect(result.city)}
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
