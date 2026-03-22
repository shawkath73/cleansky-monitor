"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCity } from "@/context/CityContext";
import { fetchCities } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudSun, MapPin, ChevronDown, Menu, X, Building2 } from "lucide-react";

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
    <nav className="sticky top-0 z-50 glass border-b border-[#0A4D30]/30" style={{ borderRadius: 0 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <CloudSun className="w-6 h-6 text-[#0DF09E]" />
            <span className="text-xl font-bold text-[#E8F5EE] tracking-widest uppercase">
              Clean<span className="text-[#0DF09E]">Sky</span>
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
                    ? "bg-[#0DF09E]/15 text-[#0DF09E]"
                    : "text-[#6EE7B7] hover:text-[#E8F5EE] hover:bg-[#0A4D30]/30"
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
              <MapPin className="w-4 h-4 text-[#0DF09E]" />
              <span className="text-sm text-[#E8F5EE] font-medium">{city}</span>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ChevronDown className="w-4 h-4 text-[#6EE7B7]" />
              </motion.div>
            </div>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-12 w-64 glass border border-[#0A4D30]/50 rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search city…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-[#020B07] border border-[#0A4D30] rounded-lg px-3 py-2 text-sm text-[#E8F5EE] placeholder-[#3B7A5A] outline-none focus:border-[#0DF09E] transition-colors"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-52 overflow-y-auto">
                    {filtered.map((c) => (
                      <li key={c}>
                        <button
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${c === city
                            ? "bg-[#0DF09E]/15 text-[#0DF09E]"
                            : "text-[#6EE7B7] hover:bg-[#0A4D30]/30 hover:text-[#E8F5EE]"
                            }`}
                          onClick={() => {
                            setCity(c);
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <Building2 className="w-3.5 h-3.5 opacity-50" />
                          {c}
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-4 py-3 text-sm text-[#3B7A5A]">No cities found</li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#6EE7B7] hover:text-[#E8F5EE] hover:bg-[#0A4D30]/30"
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
              className="md:hidden overflow-hidden border-t border-[#0A4D30]/30"
            >
              <div className="pb-4 mt-2 pt-3 flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                        ? "bg-[#0DF09E]/15 text-[#0DF09E]"
                        : "text-[#6EE7B7] hover:text-[#E8F5EE] hover:bg-[#0A4D30]/30"
                        }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {/* City selector — only shown in mobile drawer on xs screens */}
                <div className="sm:hidden mt-3 px-2">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <MapPin className="w-4 h-4 text-[#0DF09E]" />
                    <span className="text-xs text-[#6EE7B7] uppercase tracking-widest font-medium">Select City</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search city…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#020B07] border border-[#0A4D30] rounded-lg px-3 py-2 text-sm text-[#E8F5EE] placeholder-[#3B7A5A] outline-none focus:border-[#0DF09E] transition-colors mb-1"
                  />
                  <ul className="max-h-44 overflow-y-auto rounded-lg border border-[#0A4D30]/40 bg-[#020B07]/80">
                    {filtered.map((c) => (
                      <li key={c}>
                        <button
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${c === city
                            ? "bg-[#0DF09E]/15 text-[#0DF09E]"
                            : "text-[#6EE7B7] hover:bg-[#0A4D30]/30 hover:text-[#E8F5EE]"
                            }`}
                          onClick={() => {
                            setCity(c);
                            setSearch("");
                            setMobileOpen(false);
                          }}
                        >
                          <Building2 className="w-3.5 h-3.5 opacity-50" />
                          {c}
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-4 py-3 text-sm text-[#3B7A5A]">No cities found</li>
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
