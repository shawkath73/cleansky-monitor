# CleanSky Monitor Frontend

Next.js App Router frontend for CleanSky Monitor.

## Highlights

- Dashboard with real-time AQI, pollutant insights, and health guidance
- Confidence-focused UX:
  - last updated indicator
  - confidence score
  - fallback source warning
- Forecast charts with uncertainty area and min/max/median overlays
- Historical insights:
  - 7d/30d trend
  - hour-of-day pattern
  - weekday pattern
- Forecast-based guidance cards:
  - safe outdoor window
  - sensitive group recommendations
  - duration-based suggestions
- Global WAQI map overlay with custom compact markers
- Responsive dark/light theme support

## Getting Started

Install dependencies:

```bash
npm install
```

Create `frontend/.env.local` (optional but recommended):

```env
# Optional proxy target for /api rewrite
# Defaults to http://127.0.0.1:5000 in development.
API_PROXY_TARGET=http://127.0.0.1:5000

# Optional WAQI tile token for map overlay
NEXT_PUBLIC_WAQI_TOKEN=your_waqi_token
```

Run dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- The frontend uses `/api/*` routes and relies on Next rewrites to reach the backend.
- If you edit `next.config.ts`, restart the Next dev server.

## Key Directories

- `src/app/`: app router pages (dashboard, forecast, map, health, pollutants)
- `src/components/`: shared UI components (`AQIMap`, `AQIGauge`, `GlassCard`, etc.)
- `src/lib/`: API client and type definitions
- `src/context/`: shared city selection context
