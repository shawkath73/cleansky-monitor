"""
Geocoding service using WAQI natively.

Flow:
  1. User types a city name (e.g. "Kochi")
  2. WAQI /search/?keyword= solves it and returns actual stations with aqi
  3. Map fetching uses WAQI /map/bounds/ to fetch all India stations natively.
"""

import requests
import os
from typing import Optional

# Read API keys from env
WAQI_TOKEN    = os.getenv('WAQI_TOKEN', 'demo') # Ensure fallback if missing
WAQI_BASE_URL = 'https://api.waqi.info'

# Fallback for popular Indian cities just in caseWAQI fails
DEFAULT_CITIES = [
    {"name": "Delhi",       "state": "Delhi",          "lat": 28.6139, "lon": 77.2090, "aqi": "-"},
    {"name": "Mumbai",      "state": "Maharashtra",    "lat": 19.0760, "lon": 72.8777, "aqi": "-"},
    {"name": "Chennai",     "state": "Tamil Nadu",     "lat": 13.0827, "lon": 80.2707, "aqi": "-"},
    {"name": "Kolkata",     "state": "West Bengal",    "lat": 22.5726, "lon": 88.3639, "aqi": "-"},
    {"name": "Bangalore",   "state": "Karnataka",      "lat": 12.9716, "lon": 77.5946, "aqi": "-"},
    {"name": "Hyderabad",   "state": "Telangana",      "lat": 17.3850, "lon": 78.4867, "aqi": "-"},
    {"name": "Ahmedabad",   "state": "Gujarat",        "lat": 23.0225, "lon": 72.5714, "aqi": "-"},
    {"name": "Pune",        "state": "Maharashtra",    "lat": 18.5204, "lon": 73.8567, "aqi": "-"},
    {"name": "Jaipur",      "state": "Rajasthan",      "lat": 26.9124, "lon": 75.7873, "aqi": "-"},
    {"name": "Lucknow",     "state": "Uttar Pradesh",  "lat": 26.8467, "lon": 80.9462, "aqi": "-"},
]


def search_city_with_station(query: str, limit: Optional[int] = None) -> list:
    """
    Search using WAQI native search API.
    Returns list of enriched city objects.
    """
    if not WAQI_TOKEN:
        return []

    try:
        url = f"{WAQI_BASE_URL}/search/"
        r = requests.get(url, params={'token': WAQI_TOKEN, 'keyword': query}, timeout=8)
        r.raise_for_status()
        data = r.json()

        if data.get('status') == 'ok':
            items = data.get('data', [])
            if isinstance(limit, int) and limit > 0:
                items = items[:limit]

            results = []
            for item in items:
                station = item.get('station', {})
                geo = station.get('geo', [0, 0])
                lat = float(geo[0]) if len(geo) >= 1 else 0.0
                lon = float(geo[1]) if len(geo) >= 2 else 0.0

                full_name = station.get('name', 'Unknown')
                parts = full_name.split(',', 1)
                city_name = parts[0].strip()
                state = parts[1].strip() if len(parts) > 1 else ''

                results.append({
                    'name': city_name,
                    'city': city_name, # keep for backward compatibility
                    'state': state,
                    'lat': lat,
                    'lon': lon,
                    'station_name': full_name,
                    'aqi': item.get('aqi', '-'),
                    'uid': item.get('uid', '')
                })
            return results
    except Exception as e:
        print(f"⚠️ WAQI search failed for '{query}': {e}")

    return []


def get_default_cities() -> list:
    """
    Return WAQI stations from /map/bounds for global map markers.
    Falls back to a static sample list only if WAQI is unavailable.
    """
    if not WAQI_TOKEN:
        return DEFAULT_CITIES

    try:
        # Global bounding box (near full extent; avoids pole edge issues)
        url = f"{WAQI_BASE_URL}/map/bounds/"
        r = requests.get(url, params={'token': WAQI_TOKEN, 'latlng': '-89.5,-179.5,89.5,179.5'}, timeout=20)
        r.raise_for_status()
        data = r.json()

        if data.get('status') == 'ok':
            results = []
            for item in data.get('data', []):
                aqi = item.get('aqi', '-')
                # Needs a valid AQI to render on map
                if aqi == '-' or not str(aqi).isdigit() or int(aqi) <= 0:
                    continue

                station = item.get('station', {})
                full_name = station.get('name', 'Unknown')
                parts = full_name.split(',', 1)
                city_name = parts[0].strip()

                results.append({
                    'name': city_name,
                    'city': city_name, # keep for backward compatibility
                    'state': '',
                    'lat': item.get('lat', 0.0),
                    'lon': item.get('lon', 0.0),
                    'station_name': full_name,
                    'aqi': aqi,
                    'uid': item.get('uid', '')
                })
            return results
    except Exception as e:
        print(f"⚠️ WAQI bounds lookup failed: {e}")

    return DEFAULT_CITIES
