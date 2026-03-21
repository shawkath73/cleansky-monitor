"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCity } from "@/context/CityContext";
import { fetchCities } from "@/lib/api";
import { useState, useEffect, useRef } from "react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/forecast", label: "Forecast" },
  { href: "/pollutants", label: "Pollutants" },
  { href: "/health", label: "Health" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { city, setCity } = useCity();

  const [cities, setCities] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCities()
      .then((res) => setCities(res.cities))
      .catch(() =>
        setCities([
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
        ])
      );
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = cities.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <nav className="sticky top-0 z-50 glass border-b border-[#1F2937]" style={{ borderRadius: 0 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌤</span>
            <span className="text-xl font-bold text-[#F9FAFB] tracking-tight">
              Clean<span className="text-[#6366F1]">Sky</span>
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                    ? "bg-[#6366F1]/20 text-[#818CF8]"
                    : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]/50"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* City search */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <div
              className="flex items-center gap-2 glass-light px-3 py-2 cursor-pointer min-w-[180px]"
              onClick={() => setOpen(!open)}
            >
              <span className="text-sm">📍</span>
              <span className="text-sm text-[#F9FAFB] font-medium">{city}</span>
              <svg
                className={`w-4 h-4 text-[#9CA3AF] ml-auto transition-transform ${open ? "rotate-180" : ""
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {open && (
              <div className="absolute right-0 top-12 w-64 glass border border-[#1F2937] rounded-xl overflow-hidden shadow-2xl">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search city…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#F9FAFB] placeholder-[#6B7280] outline-none focus:border-[#6366F1] transition-colors"
                    autoFocus
                  />
                </div>
                <ul className="max-h-52 overflow-y-auto">
                  {filtered.map((c) => (
                    <li key={c}>
                      <button
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${c === city
                          ? "bg-[#6366F1]/20 text-[#818CF8]"
                          : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB]"
                          }`}
                        onClick={() => {
                          setCity(c);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        🏙️ {c}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-4 py-3 text-sm text-[#6B7280]">No cities found</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-[#1F2937] mt-2 pt-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                    ? "bg-[#6366F1]/20 text-[#818CF8]"
                    : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]/50"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}

          </div>
        )}
      </div>
    </nav>
  );
}
