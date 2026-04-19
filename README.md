# CleanSky Monitor

CleanSky Monitor is a predictive air quality platform with a Flask backend and a Next.js frontend. It combines live provider data, ML-based AQI prediction, global station mapping, health risk guidance, and full SEO support.

**Live:** [cleansky-monitor.vercel.app](https://cleansky-monitor.vercel.app)  
**Backend API:** [cleansky-monitor.onrender.com](https://cleansky-monitor.onrender.com)

---

## Features

### Backend

- Real-time AQI endpoint with source transparency (`waqi`, `epa_fallback`, `ml_fallback`)
- 48-hour forecast endpoint with min/max/median and uncertainty bounds
- Health risk and pollutant breakdown endpoints
- City and station search via WAQI
- Global station feed for map markers via WAQI bounds
- Historical AQI endpoint with timezone-aware aggregations:
  - Daily trend buckets
  - Hour-of-day pattern
  - Weekday pattern
- API-level `Cache-Control` headers per endpoint type

### Frontend

- Dynamic per-city routes: `/[city]`, `/[city]/forecast`, `/[city]/health`, `/[city]/pollutants`, `/[city]/map`
- Dashboard with AQI gauge, pollutant cards, health recommendations, forecast chart, and CSV export
- Confidence and transparency UI (last-updated banner, confidence score, fallback source warning)
- Forecast visualization: uncertainty area, min/max/median lines
- Historical insights: 7d/30d trend, hour-of-day pattern, weekday pattern
- Forecast-based guidance: safe outdoor window, sensitive group advice, duration recommendations
- Global map with WAQI overlay and compact custom markers
- Full SEO integration:
  - Per-page `generateMetadata` with live AQI injected into descriptions
  - Dynamic OG image (`/api/og`) generated at the edge with AQI-aware color coding
  - JSON-LD structured data (`WebApplication`, `Dataset`, `BreadcrumbList`) on every city page
  - Dynamic sitemap (`/sitemap.xml`) built from the cities API with 1-hour revalidation
  - `robots.txt` pointing to sitemap, disallowing `/api/`
  - Canonical URLs on all routes

---

## Tech Stack

### Backend

- Python 3.9+ (virtual environment recommended)
- Flask + Flask-CORS
- XGBoost + scikit-learn
- pandas + NumPy
- MongoDB (history and forecast persistence)
- WAQI API (primary data source)
- OpenWeather API (fallback)

### Frontend

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts
- Framer Motion
- Leaflet + react-leaflet
- lucide-react

---

## Project Structure

```text
cleansky-monitor/
├── backend/
│   ├── app.py              # Flask app factory, CORS, cache headers
│   ├── requirements.txt
│   ├── models/             # XGBoost model artefacts
│   ├── routes/
│   │   ├── aqi_routes.py
│   │   └── user_routes.py
│   └── services/           # WAQI, weather, prediction, cache, DB
├── frontend/
│   ├── next.config.ts      # API proxy rewrites (dev → 127.0.0.1:5000)
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── [city]/     # Dynamic city routes + SEO metadata
│       │   ├── api/og/     # Edge OG image generation
│       │   ├── robots.ts
│       │   ├── sitemap.ts
│       │   └── layout.tsx
│       ├── components/     # JsonLd, Navbar, Footer, AQIMap, …
│       ├── context/        # CityContext
│       └── lib/            # API helpers, AQI utils, types
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py           # runs on http://127.0.0.1:5000
```

Create `backend/.env`:

```env
WAQI_TOKEN=your_waqi_token
OPENWEATHER_API_KEY=your_openweather_key
MONGODB_URI=your_mongodb_uri
MONGODB_DB=cleansky_db
PORT=5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:3000
```

Create `frontend/.env.local`:

```env
# Public-facing site URL (used for canonical URLs, sitemap, robots, OG images)
NEXT_PUBLIC_SITE_URL=https://cleansky-monitor.vercel.app

# Backend API base URL (used at runtime for data fetches)
NEXT_PUBLIC_API_URL=https://cleansky-monitor.onrender.com

# WAQI tile overlay token for the map
NEXT_PUBLIC_WAQI_TOKEN=your_waqi_token

# Optional: override the proxy target in next.config.ts (defaults below)
# Development default  → http://127.0.0.1:5000
# Production default   → https://cleansky-monitor.onrender.com
# API_PROXY_TARGET=http://127.0.0.1:5000
```

> **How routing works locally:**  
> The Next.js dev server proxies all `/api/*` requests to `http://127.0.0.1:5000` via `next.config.ts` rewrites.  
> Server-side code (SEO metadata, sitemap, OG image) fetches the backend directly at `http://127.0.0.1:5000` in development and at `NEXT_PUBLIC_API_URL` in production — bypassing the proxy to avoid circular routing.

---

## API Endpoints

Base URL (local): `http://127.0.0.1:5000`  
Base URL (production): `https://cleansky-monitor.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/current-aqi?city=Delhi` | Live AQI with source info |
| `GET` | `/api/forecast?city=Delhi&breakdown_hours=1` | 48-hour AQI forecast |
| `GET` | `/api/health-risk?aqi=156` | Health risk and recommendations |
| `GET` | `/api/pollutants?city=Delhi` | Pollutant breakdown vs WHO limits |
| `GET` | `/api/cities` | List of monitored cities/stations |
| `GET` | `/api/search-cities?q=kochi` | Dynamic city search |
| `GET` | `/api/history?city=Delhi&days=30&tz=Asia/Kolkata` | Historical AQI readings |

Cache headers are set per route: `current-aqi` → 10 min, `forecast` → 30 min, `cities` → 24 hr.

---

## SEO

| Feature | Implementation |
|---|---|
| Dynamic page titles | `generateMetadata` with `[City]` interpolation |
| Live AQI in meta description | Server-side fetch at build/revalidate time |
| Canonical URLs | `alternates.canonical` on all city routes |
| Open Graph + Twitter cards | Per-page with dynamic OG image |
| Dynamic OG image | Edge function at `/api/og?city=…&aqi=…` |
| JSON-LD structured data | `WebApplication`, `Dataset`, `BreadcrumbList` |
| Sitemap | `/sitemap.xml` — built from cities API, 1-hr revalidation |
| Robots.txt | Allows `/`, disallows `/api/` |

---

## License

MIT
