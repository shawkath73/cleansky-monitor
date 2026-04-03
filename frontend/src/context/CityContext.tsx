"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface CityContextValue {
  city: string;
  lat?: number;
  lon?: number;
  setCity: (city: string, lat?: number, lon?: number) => void;
}

const CityContext = createContext<CityContextValue>({
  city: "Delhi",
  setCity: () => {},
});

function CityStateInitializer({ setCity }: { setCity: (city: string, lat?: number, lon?: number) => void }) {
  const searchParams = useSearchParams();
  const queryCity = searchParams.get("city");
  const queryLat = searchParams.get("lat");
  const queryLon = searchParams.get("lon");

  useEffect(() => {
    if (queryCity) {
      setCity(
        queryCity,
        queryLat ? parseFloat(queryLat) : undefined,
        queryLon ? parseFloat(queryLon) : undefined
      );
    }
  }, [queryCity, queryLat, queryLon, setCity]);

  return null;
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState("Delhi");
  const [coords, setCoordsState] = useState<{ lat?: number; lon?: number }>({});

  const setCity = useCallback((c: string, lat?: number, lon?: number) => {
    setCityState(c);
    setCoordsState({ lat, lon });
  }, []);

  return (
    <CityContext.Provider value={{ city, lat: coords.lat, lon: coords.lon, setCity }}>
      <Suspense fallback={null}>
        <CityStateInitializer setCity={setCity} />
      </Suspense>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
