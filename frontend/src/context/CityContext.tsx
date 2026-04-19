"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

interface CityContextValue {
  city: string;
  lat?: number;
  lon?: number;
  setCity: (city: string, lat?: number, lon?: number) => void;
}

export function toCitySlug(cityName: string): string {
  return cityName.trim().toLowerCase().replace(/\s+/g, "-");
}

function fromCitySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const CityContext = createContext<CityContextValue>({
  city: "Delhi",
  setCity: () => {},
});

export function CityProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ city?: string }>();
  const [coords, setCoordsState] = useState<{ lat?: number; lon?: number }>({});
  const city =
    params?.city && typeof params.city === "string"
      ? fromCitySlug(params.city)
      : "Delhi";

  const setCity = useCallback(
    (cityName: string, lat?: number, lon?: number) => {
      const nextSlug = toCitySlug(cityName || "Delhi");
      const currentSlug =
        params?.city && typeof params.city === "string" ? params.city : null;

      setCoordsState({ lat, lon });

      const suffix = currentSlug
        ? pathname.startsWith(`/${currentSlug}/`)
          ? pathname.slice(currentSlug.length + 1)
          : ""
        : pathname === "/"
          ? ""
          : pathname;

      const normalizedSuffix =
        suffix === "/" || suffix === ""
          ? ""
          : suffix.startsWith("/")
            ? suffix
            : `/${suffix}`;

      router.push(`/${nextSlug}${normalizedSuffix}`);
    },
    [params, pathname, router],
  );

  return (
    <CityContext.Provider
      value={{ city, lat: coords.lat, lon: coords.lon, setCity }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
