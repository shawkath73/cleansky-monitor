# CleanSky Monitor

CleanSky Monitor is a predictive air quality platform with a Flask backend and a Next.js frontend. It combines live provider data, model-based AQI prediction, global station mapping, and user-facing risk guidance.

## Features

### Backend

- Real-time AQI endpoint with source transparency (`waqi`, `epa_fallback`, `ml_fallback`)
- 48-hour forecast endpoint with min/max/median and uncertainty bounds
- Health risk and pollutant breakdown endpoints
- City and station search via WAQI
- Global station feed for map markers via WAQI bounds
- Historical AQI endpoint with timezone-aware aggregations:
  - daily trend buckets
  - hour-of-day pattern
  - weekday pattern

### Frontend

- Dashboard with AQI gauge, pollutant cards, health recommendations, and forecast chart
- Confidence and transparency UI:
  - last-updated banner
  - confidence score
  - fallback source warning
- Forecast visualization upgrades:
  - uncertainty area
  - min/max/median lines
- Historical insights section:
  - 7d/30d trend
  - hour-of-day pattern
  - weekday pattern
- Forecast-based guidance cards:
  - safe outdoor window
  - sensitive group advice
  - duration-based recommendations
- Global map with WAQI overlay and compact custom markers
- Dark/light theme toggle across breakpoints

## Tech Stack

### Backend

- Python (virtual environment recommended)
- Flask
- XGBoost + scikit-learn
- pandas + NumPy
- MongoDB (history and forecast persistence)
- WAQI API (primary)
- OpenWeather API (fallback where applicable)

### Frontend

- Next.js (App Router)
- React
- Recharts
- Framer Motion
- Leaflet + react-leaflet
- lucide-react

## Documentation

- Project docs index: [docs/README.md](docs/README.md)
- Frontend guide: [docs/frontend/frontend-readme.md](docs/frontend/frontend-readme.md)
- SEO implementation plan: [docs/seo/seo-refactored.md](docs/seo/seo-refactored.md)

## Project Structure

```text
cleansky-monitor/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── models/
│   ├── routes/
│   └── services/
├── docs/
│   ├── frontend/
│   └── seo/
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   └── src/
│       ├── app/
│       ├── components/
│       ├── context/
│       └── lib/
└── README.md
```

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+

### Backend

1. Go to backend folder.
2. Create and activate virtual environment.
3. Install dependencies.
4. Create `backend/.env`.
5. Run `python app.py`.

Example `backend/.env`:

```env
WAQI_TOKEN=your_waqi_token
OPENWEATHER_API_KEY=your_openweather_key
MONGODB_URI=your_mongodb_uri
MONGODB_DB=cleansky_db
PORT=5000
```

### Frontend

1. Go to frontend folder.
2. Install dependencies.
3. Create `frontend/.env.local`.
4. Run `npm run dev`.

Example `frontend/.env.local`:

```env
# Optional. In dev defaults to http://127.0.0.1:5000 if unset.
API_PROXY_TARGET=http://127.0.0.1:5000

# Optional. Enables WAQI tile overlay in the map.
NEXT_PUBLIC_WAQI_TOKEN=your_waqi_token
```

Note: If you change rewrite/proxy settings in `next.config.ts`, restart the Next.js server.

## API Endpoints

Base URL (local): `http://localhost:5000`

- `GET /` health check
- `GET /api/current-aqi?city=Delhi`
- `GET /api/forecast?city=Delhi&breakdown_hours=1`
- `GET /api/health-risk?aqi=156`
- `GET /api/pollutants?city=Delhi`
- `GET /api/cities`
- `GET /api/search-cities?q=kochi`
- `GET /api/history?city=Delhi&days=30&tz=Asia/Kolkata`

## License

MIT
