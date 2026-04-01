"""
Geocoding service using geocode.maps.co + WAQI station matching.

Flow:
  1. User types a city name (e.g. "Kochi")
  2. geocode.maps.co resolves it → lat/lon + display name
  3. WAQI /feed/geo:{lat};{lon}/ finds the nearest monitoring station
  4. Return combined result: city, lat/lon, station, live AQI
"""

import requests
import os
import time

GEOCODE_API_KEY = os.getenv('GEOCODE_API_KEY')
GEOCODE_BASE    = 'https://geocode.maps.co'

WAQI_TOKEN      = os.getenv('WAQI_TOKEN')
WAQI_BASE_URL   = 'https://api.waqi.info'

# Popular Indian cities shown before user types anything
DEFAULT_CITIES = [
    {"city": "Delhi",       "state": "Delhi",          "lat": 28.6139, "lon": 77.2090},
    {"city": "Mumbai",      "state": "Maharashtra",    "lat": 19.0760, "lon": 72.8777},
    {"city": "Chennai",     "state": "Tamil Nadu",     "lat": 13.0827, "lon": 80.2707},
    {"city": "Kolkata",     "state": "West Bengal",    "lat": 22.5726, "lon": 88.3639},
    {"city": "Bangalore",   "state": "Karnataka",      "lat": 12.9716, "lon": 77.5946},
    {"city": "Hyderabad",   "state": "Telangana",      "lat": 17.3850, "lon": 78.4867},
    {"city": "Ahmedabad",   "state": "Gujarat",        "lat": 23.0225, "lon": 72.5714},
    {"city": "Pune",        "state": "Maharashtra",    "lat": 18.5204, "lon": 73.8567},
    {"city": "Jaipur",      "state": "Rajasthan",      "lat": 26.9124, "lon": 75.7873},
    {"city": "Lucknow",     "state": "Uttar Pradesh",  "lat": 26.8467, "lon": 80.9462},
]


def geocode_city(query: str, limit: int = 5) -> list:
    """
    Forward-geocode a city name → list of {city, state, lat, lon} results.
    Uses geocode.maps.co (Nominatim-based, OSM data).
    Scoped to India via countrycodes=in.
    """
    if not GEOCODE_API_KEY:
        print("⚠️ GEOCODE_API_KEY not set — cannot geocode")
        return []

    try:
        r = requests.get(
            f"{GEOCODE_BASE}/search",
            params={
                'q':            query,
                'api_key':      GEOCODE_API_KEY,
                'countrycodes': 'in',
                'limit':        limit,
                'format':       'json',
            },
            timeout=8,
        )
        r.raise_for_status()
        data = r.json()

        results = []
        seen_cities = set()

        for item in data:
            lat      = float(item.get('lat', 0))
            lon      = float(item.get('lon', 0))
            display  = item.get('display_name', '')

            # Extract city and state from display_name
            # Format: "City, District, State, Postcode, India"
            parts = [p.strip() for p in display.split(',')]
            city_name = parts[0] if parts else query
            state     = ''

            # Try to find the state (usually 2nd-to-last before "India")
            if len(parts) >= 3:
                # Last part is usually "India", second-to-last is state or postcode
                for p in reversed(parts[1:-1]):
                    if not p.isdigit() and p.lower() != 'india':
                        state = p
                        break

            # Deduplicate by city name
            key = city_name.lower()
            if key in seen_cities:
                continue
            seen_cities.add(key)

            results.append({
                'city':  city_name,
                'state': state,
                'lat':   lat,
                'lon':   lon,
            })

        return results

    except Exception as e:
        print(f"⚠️ Geocode search failed for '{query}': {e}")
        return []


def find_nearest_waqi_station(lat: float, lon: float) -> dict | None:
    """
    Given lat/lon, find the nearest WAQI monitoring station.
    Returns {station_name, aqi, lat, lon} or None.
    """
    if not WAQI_TOKEN:
        return None

    try:
        url = f"{WAQI_BASE_URL}/feed/geo:{lat};{lon}/"
        r = requests.get(url, params={'token': WAQI_TOKEN}, timeout=8)
        r.raise_for_status()
        data = r.json()

        if data.get('status') == 'ok':
            d = data['data']
            city_info = d.get('city', {})
            geo = city_info.get('geo', [])
            return {
                'station_name': city_info.get('name', ''),
                'aqi':          d.get('aqi', '-'),
                'station_lat':  float(geo[0]) if len(geo) >= 2 else lat,
                'station_lon':  float(geo[1]) if len(geo) >= 2 else lon,
            }
    except Exception as e:
        print(f"⚠️ WAQI station lookup failed ({lat},{lon}): {e}")

    return None


def search_city_with_station(query: str, limit: int = 5) -> list:
    """
    Full pipeline: geocode query → find nearest WAQI station for each result.
    Returns list of enriched city objects.
    """
    geocoded = geocode_city(query, limit=limit)

    results = []
    for city_data in geocoded:
        station = find_nearest_waqi_station(city_data['lat'], city_data['lon'])

        result = {
            'city':         city_data['city'],
            'state':        city_data['state'],
            'lat':          city_data['lat'],
            'lon':          city_data['lon'],
            'station_name': station['station_name'] if station else '',
            'aqi':          station['aqi'] if station else '-',
        }
        results.append(result)

        # Rate-limit geocode.maps.co (free tier: 5 req/sec)
        time.sleep(0.05)

    return results


def get_default_cities() -> list:
    """Return the small list of popular cities for initial dropdown."""
    return DEFAULT_CITIES
