# CleanSky Monitor 🌍

A **Predictive Air Quality Forecasting Platform** for Indian cities, featuring a modern glassmorphism UI and powered by an XGBoost Machine Learning model (R² = 0.93) to provide real-time AQI monitoring and 48-hour forecasts.

---

## ✨ Features

### Backend (Flask API)
- **Real-time AQI Prediction**: ML-powered current AQI calculation using live pollution data.
- **48-Hour Forecasting**: Hourly AQI predictions for planning ahead.
- **Health Risk Analysis**: Category-based health recommendations and affected groups.
- **Pollutant Breakdown**: Detailed analysis of individual pollutants vs. WHO limits.
- **Multi-city Support**: 10 major Indian cities with geocoding support.

### Frontend (Next.js)
- **Interactive Dashboard**: Clean, modern glassmorphism UI with real-time data display.
- **Global AQI Map**: Interactive `react-leaflet` map with WAQI global overlays and custom dynamic markers for Indian monitoring stations.
- **City Selector**: Choose from supported Indian cities (dynamic search via map geocoding).
- **Forecast Visualization**: Tables and summaries for predicted AQI trends.
- **Health Alerts**: Color-coded categories with actionable recommendations.
- **Pollutant Charts**: Contribution percentages and WHO limit comparisons.
- **Premium Animations**: Smooth transitions powered by Framer Motion.

---

## 🛠️ Tech Stack

**Backend:**
- Python 3.11
- Flask 3.1.0 (REST API)
- XGBoost 2.0.3 (ML Model)
- scikit-learn 1.6.1 (Preprocessing)
- pandas 2.2.3 (Data handling)
- OpenWeatherMap API (Live data)

**Frontend:**
- Next.js 15.2.0 (App Router)
- React 19.0.0
- Framer Motion & Lucide React
- CSS Modules (Glassmorphism design tokens)

**DevOps:**
- Git (Version control)
- Gunicorn (Production server)
- python-dotenv (Environment management)

---

## 📂 Project Structure

```text
cleansky-monitor/
├── backend/                  # Flask REST API & ML Models
│   ├── models/               # Trained XGBoost models and encoders
│   ├── routes/               # API endpoint definitions (AQI, Users)
│   ├── services/             # Core business logic and external API integrations
│   ├── app.py                # Flask application entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js UI Application
│   ├── src/
│   │   ├── app/              # App Router pages (Dashboard, Forecast, etc.)
│   │   │   ├── globals.css   # Global glassmorphism design tokens
│   │   │   └── page.tsx      # Main Real-Time Dashboard
│   │   └── components/       # Reusable React components (GlassCard, Navbar, etc.)
│   ├── package.json          # Node dependencies
│   └── next.config.ts        # Next.js configuration
├── architecture.drawio       # System architecture diagram
└── README.md                 # Project documentation
```

---

## 🚀 Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- [OpenWeatherMap API key](https://openweathermap.org/api)

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create `.env` file:
   ```env
   OPENWEATHER_API_KEY=your_api_key_here
   FLASK_ENV=development
   FLASK_DEBUG=True
   PORT=5000
   ```
5. Run the Flask server:
   ```bash
   python app.py
   ```
   *Server runs at: http://localhost:5000*

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` file:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```
4. Run development server:
   ```bash
   npm run dev
   ```
   *Dashboard opens at: http://localhost:3000*

---

## 📡 API Endpoints

**Base URL**: `http://localhost:5000`

### 1. Health Check
`GET /`
```json
{
  "status": "running",
  "message": "AQI Forecasting API is live!",
  "endpoints": [...]
}
```

### 2. Current AQI
`GET /api/current-aqi?city=Delhi`
```json
{
  "success": true,
  "data": {
    "aqi": 156.3,
    "category": "Moderate",
    "color": "#ffff00",
    "emoji": "🟠",
    "dominant_pollutant": "PM2.5",
    "pollutants": { "PM2.5": 85.2, "PM10": 120.5 },
    "recommendation": "Limit prolonged outdoor exertion...",
    "city": "Delhi",
    "datetime": "2026-03-03T11:25:38"
  }
}
```

### 3. 48-Hour Forecast
`GET /api/forecast?city=Mumbai&hours=48`
```json
{
  "success": true,
  "city": "Mumbai",
  "summary": {
    "min_aqi": 45.2,
    "max_aqi": 180.7,
    "avg_aqi": 98.5,
    "hours": 48
  },
  "forecast": [
    {
      "datetime": "2026-03-03T12:00:00",
      "hour": 12,
      "aqi": 102.3,
      "category": "Moderate",
      "color": "#ffff00",
      "emoji": "🟠",
      "dominant": "PM2.5"
    }
  ]
}
```

### 4. Health Risk Info
`GET /api/health-risk?aqi=220`
```json
{
  "success": true,
  "data": {
    "aqi": 220.0,
    "category": "Poor",
    "color": "#ff7e00",
    "range": "201-300",
    "recommendation": "Everyone may begin to experience health effects...",
    "sensitive_groups": ["Children", "Elderly", "Pregnant women", "Outdoor workers"],
    "actions": ["Avoid outdoor activities", "Wear N95 mask outdoors", "Keep windows closed"]
  }
}
```

### 5. Pollutant Breakdown
`GET /api/pollutants?city=Delhi`
```json
{
  "success": true,
  "city": "Delhi",
  "current_aqi": 156.3,
  "dominant_pollutant": "PM2.5",
  "pollutants": [
    {
      "name": "PM2.5",
      "value": 85.2,
      "unit": "µg/m³",
      "who_limit": 15,
      "percentage": 42.3,
      "status": "exceeded",
      "exceeded_by": 70.2
    }
  ]
}
```

### 6. Supported Cities
`GET /api/cities`
```json
{
  "success": true,
  "cities": ["Delhi", "Mumbai", "Kolkata", "Hyderabad"]
}
```

---

## 📊 AQI Categories (India Standard)

| Category | AQI Range | Color | Health Impact |
| :--- | :--- | :--- | :--- |
| **Good** | 0-50 | 🟢 Green | Minimal impact |
| **Satisfactory** | 51-100 | 🟡 Yellow | Minor breathing discomfort |
| **Moderate** | 101-200 | 🟠 Orange | Breathing discomfort for sensitive people |
| **Poor** | 201-300 | 🔴 Red | Breathing discomfort for most people |
| **Very Poor** | 301-400 | 🟣 Purple | Respiratory illness on prolonged exposure |
| **Severe** | 400+ | ⚫ Maroon | Affects healthy people, serious impact on existing diseases |

---

## 🧪 Model Details

- **Algorithm**: XGBoost Regressor
- **Training Data**: Kaggle India AQI Dataset (2015-2020)
- **Features**: 35 engineered features including base pollutants (PM2.5, PM10, NO2, SO2, O3, CO), pollutant ratios, temporal features (month, day of week, season, quarter), city encoding, and dominant pollutant indicator.
- **Performance Metrics**:
  - **MAE**: 17.44
  - **RMSE**: 30.62
  - **R²**: 0.9295

---

## 🌐 Supported Cities

Amaravati, Amritsar, Chandigarh, Delhi, Gurugram, Hyderabad, Kolkata, Mumbai, Patna, Visakhapatnam

---

## 📜 License

This project is licensed under the MIT License.

---

## 📧 Contact

For questions or collaboration:
- **GitHub**: [@theGautham](https://github.com/theGautham)
- **Repository**: [cleansky-monitor](https://github.com/theGautham/cleansky-monitor)

⭐ *Star this repo if you find it useful!*
