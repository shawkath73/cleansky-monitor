"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface CityContextValue {
  city: string;
  setCity: (city: string) => void;
}

const CityContext = createContext<CityContextValue>({
  city: "Delhi",
  setCity: () => {},
});

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState("Delhi");

  const setCity = useCallback((c: string) => {
    setCityState(c);
  }, []);

  return (
    <CityContext.Provider value={{ city, setCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
