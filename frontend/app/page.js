"use client";

import { useEffect, useMemo, useState } from "react";

const CITY_OPTIONS = [
  "Delhi",
  "Mumbai",
  "Kolkata",
  "Hyderabad",
  "Chandigarh",
  "Amritsar",
  "Patna",
  "Gurugram",
  "Visakhapatnam",
  "Amaravati",
];

const HOUR_OPTIONS = [24, 36, 48];
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [city, setCity] = useState("Delhi");
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch(
            `${BACKEND_URL}/api/aqi/current?city=${encodeURIComponent(city)}`,
          ),
          fetch(
            `${BACKEND_URL}/api/aqi/forecast?city=${encodeURIComponent(city)}&hours=${hours}`,
          ),
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
          throw new Error(
            "Unable to fetch AQI data. Ensure backend is running.",
          );
        }

        const currentJson = await currentResponse.json();
        const forecastJson = await forecastResponse.json();

        if (!ignore) {
          setSnapshot(currentJson);
          setForecast(forecastJson.forecast || []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError.message || "An unexpected error occurred.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [city, hours]);

  const forecastSummary = useMemo(() => {
    if (!forecast.length) {
      return null;
    }
    const values = forecast.map((item) => item.predicted_aqi);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { min, max, avg };
  }, [forecast]);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>CleanSky Monitor</h1>
          <p>
            Real-time AQI analytics with 24–48 hour machine learning powered
            forecasts.
          </p>
        </div>
        <div className="controls">
          <label>
            City
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              {CITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Forecast Window
            <select
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            >
              {HOUR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} hours
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading && <p className="status">Loading AQI data...</p>}
      {error && <p className="status error">{error}</p>}

      {snapshot && (
        <>
          <section className="grid grid-3">
            <article className="card highlight">
              <h2>Current AQI</h2>
              <p
                className="aqi-value"
                style={{ color: snapshot.category_style?.color || "#ffffff" }}
              >
                {snapshot.aqi}
              </p>
              <p>
                {snapshot.category_style?.emoji} {snapshot.category}
              </p>
              <p className="muted">
                Updated: {formatTimestamp(snapshot.timestamp)}
              </p>
            </article>

            <article className="card">
              <h2>Health Recommendation</h2>
              <p>{snapshot.health_recommendation}</p>
            </article>

            <article className="card">
              <h2>Forecast Summary</h2>
              {forecastSummary ? (
                <ul className="simple-list">
                  <li>Min AQI: {forecastSummary.min.toFixed(2)}</li>
                  <li>Max AQI: {forecastSummary.max.toFixed(2)}</li>
                  <li>Avg AQI: {forecastSummary.avg.toFixed(2)}</li>
                </ul>
              ) : (
                <p>No forecast data.</p>
              )}
            </article>
          </section>

          <section className="grid grid-2">
            <article className="card">
              <h2>Top Pollutant Contributions</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pollutant</th>
                      <th>Value</th>
                      <th>Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(snapshot.pollutant_contributions || [])
                      .slice(0, 8)
                      .map((item) => (
                        <tr key={item.pollutant}>
                          <td>{item.pollutant}</td>
                          <td>{item.value}</td>
                          <td>{item.contribution_percent}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <h2>{hours} Hour Forecast</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Predicted AQI</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((entry) => (
                      <tr key={entry.hour_offset}>
                        <td>{formatTimestamp(entry.timestamp)}</td>
                        <td>{entry.predicted_aqi}</td>
                        <td>{entry.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
