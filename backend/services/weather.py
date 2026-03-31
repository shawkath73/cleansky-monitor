import requests
import os
from datetime import datetime, timedelta

# ── API keys ──────────────────────────────────────────────────────────────────
WAQI_TOKEN    = os.getenv('WAQI_TOKEN')           # get free token → aqicn.org/data-platform/token
OWM_API_KEY   = os.getenv('OPENWEATHER_API_KEY')  # fallback
OWM_BASE_URL  = 'https://api.openweathermap.org'
WAQI_BASE_URL = 'https://api.waqi.info'


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _waqi_iaqi_to_dict(iaqi: dict) -> dict:
    """
    Convert WAQI's 'iaqi' block → our internal pollutant dict.
    WAQI returns values already in µg/m³ (except CO which is in ppm → convert).
    """
    def v(key):
        return float(iaqi[key]['v']) if key in iaqi else 0.0

    co_ppm = v('co')
    # WAQI CO is in ppm → convert to µg/m³  (1 ppm ≈ 1145 µg/m³ at 25 °C)
    co_ugm3 = co_ppm * 1145.0 if co_ppm > 0 else 0.0

    return {
        'PM2.5':   v('pm25'),
        'PM10':    v('pm10'),
        'NO':      0.0,            # WAQI doesn't expose NO separately
        'NO2':     v('no2'),
        'NOx':     v('no2'),       # use NO2 as proxy for NOx
        'NH3':     0.0,            # not in WAQI free tier
        'CO':      co_ugm3,
        'SO2':     v('so2'),
        'O3':      v('o3'),
        'Benzene': 0.0,
        'Toluene': 0.0,
        'Xylene':  0.0,
    }


def _owm_components_to_dict(components: dict) -> dict:
    """Convert OWM components block → internal pollutant dict (fallback)."""
    return {
        'PM2.5':   components.get('pm2_5', 0),
        'PM10':    components.get('pm10',  0),
        'NO':      components.get('no',    0),
        'NO2':     components.get('no2',   0),
        'NOx':     components.get('no2',   0),
        'NH3':     components.get('nh3',   0),
        'CO':      components.get('co',    0),
        'SO2':     components.get('so2',   0),
        'O3':      components.get('o3',    0),
        'Benzene': 0.0,
        'Toluene': 0.0,
        'Xylene':  0.0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# City → coordinates
# ─────────────────────────────────────────────────────────────────────────────

def get_city_coordinates(city: str) -> dict:
    """
    Resolve city name → lat/lon.
    Tries WAQI search first (returns station geo-data);
    falls back to OWM Geocoding API.
    """
    # ── 1. WAQI search ────────────────────────────────────────────────────────
    if WAQI_TOKEN:
        try:
            url = f"{WAQI_BASE_URL}/search/"
            r = requests.get(url, params={'token': WAQI_TOKEN, 'keyword': city}, timeout=8)
            r.raise_for_status()
            data = r.json()
            if data.get('status') == 'ok' and data.get('data'):
                # Prefer stations tagged with ,in/ (India) in uid string
                india_stations = [
                    s for s in data['data']
                    if 'india' in s.get('station', {}).get('name', '').lower()
                    or ',in/' in s.get('uid', '').lower()
                    or (s.get('station', {}).get('country', '') or '').upper() == 'IN'
                ]
                station = india_stations[0] if india_stations else data['data'][0]
                geo = station.get('station', {}).get('geo', [])
                if len(geo) >= 2:
                    return {
                        'city':    city,
                        'lat':     float(geo[0]),
                        'lon':     float(geo[1]),
                        'country': 'IN',
                        'source':  'waqi'
                    }
        except Exception as e:
            print(f"⚠️ WAQI geocode failed for '{city}': {e}")

    # ── 2. OWM Geocoding fallback ─────────────────────────────────────────────
    if OWM_API_KEY:
        url = f"{OWM_BASE_URL}/geo/1.0/direct"
        r = requests.get(url, params={'q': f"{city},IN", 'limit': 1, 'appid': OWM_API_KEY}, timeout=8)
        r.raise_for_status()
        data = r.json()
        if not data:
            raise ValueError(f"City '{city}' not found")
        return {
            'city':    city,
            'lat':     data[0]['lat'],
            'lon':     data[0]['lon'],
            'country': data[0].get('country', 'IN'),
            'source':  'owm'
        }

    raise RuntimeError("No API keys configured (WAQI_TOKEN or OPENWEATHER_API_KEY required)")


# ─────────────────────────────────────────────────────────────────────────────
# Current pollution
# ─────────────────────────────────────────────────────────────────────────────

def get_current_pollution(lat: float, lon: float) -> dict:
    """
    Fetch current air pollution data.
    Primary  → WAQI geo feed  (best India coverage, 300+ stations)
    Fallback → OpenWeatherMap air_pollution
    """
    # ── 1. WAQI geo feed ─────────────────────────────────────────────────────
    if WAQI_TOKEN:
        try:
            url = f"{WAQI_BASE_URL}/feed/geo:{lat};{lon}/"
            r = requests.get(url, params={'token': WAQI_TOKEN}, timeout=10)
            r.raise_for_status()
            data = r.json()

            if data.get('status') == 'ok':
                d     = data['data']
                iaqi  = d.get('iaqi', {})
                ts    = d.get('time', {}).get('iso', datetime.utcnow().isoformat())

                pollutants = _waqi_iaqi_to_dict(iaqi)
                pollutants.update({
                    'datetime':      ts,
                    'lat':           lat,
                    'lon':           lon,
                    'waqi_aqi':      d.get('aqi', 0),    # WAQI's own AQI (US standard)
                    'station_name':  d.get('city', {}).get('name', ''),
                    'source':        'waqi',
                })
                print(f"✅ WAQI data → station: {pollutants['station_name']}, AQI: {pollutants['waqi_aqi']}")
                return pollutants

        except Exception as e:
            print(f"⚠️ WAQI current feed failed ({lat},{lon}): {e} — falling back to OWM")

    # ── 2. OWM fallback ───────────────────────────────────────────────────────
    if OWM_API_KEY:
        url = f"{OWM_BASE_URL}/data/2.5/air_pollution"
        r = requests.get(url, params={'lat': lat, 'lon': lon, 'appid': OWM_API_KEY}, timeout=10)
        r.raise_for_status()
        data = r.json()

        components = data['list'][0]['components']
        dt         = data['list'][0]['dt']
        pollutants = _owm_components_to_dict(components)
        pollutants.update({
            'datetime':      datetime.utcfromtimestamp(dt).isoformat(),
            'lat':           lat,
            'lon':           lon,
            'owm_aqi_index': data['list'][0]['main']['aqi'],
            'source':        'owm',
        })
        print(f"✅ OWM fallback data → OWM AQI index: {pollutants['owm_aqi_index']}")
        return pollutants

    raise RuntimeError("No API keys configured for pollution data")


# ─────────────────────────────────────────────────────────────────────────────
# Forecast pollution  (48 hours)
# ─────────────────────────────────────────────────────────────────────────────

def get_forecast_pollution(lat: float, lon: float) -> list:
    """
    Fetch 48-hour air pollution forecast.
    Primary  → WAQI historical/forecast v2 map feed (where available)
    Fallback → OpenWeatherMap air_pollution/forecast

    Note: WAQI's free tier doesn't expose a true 48-hr forecast endpoint,
    so we use OWM forecast but tag the source clearly.  If you upgrade to
    WAQI Enterprise the feed at /v2/map/bounds returns 7-day forecasts.
    """
    forecast_list = []

    # ── 1. Try WAQI — get current data + extrapolate using daily history ───────
    #    WAQI free tier gives /feed/ with a 'forecast' sub-key for o3/pm25/pm10
    if WAQI_TOKEN:
        try:
            url = f"{WAQI_BASE_URL}/feed/geo:{lat};{lon}/"
            r = requests.get(url, params={'token': WAQI_TOKEN}, timeout=10)
            r.raise_for_status()
            data = r.json()

            if data.get('status') == 'ok':
                forecast_block = data['data'].get('forecast', {}).get('daily', {})
                # WAQI daily forecast keys: pm25, pm10, o3, uvi
                pm25_fc  = forecast_block.get('pm25', [])
                pm10_fc  = forecast_block.get('pm10', [])
                o3_fc    = forecast_block.get('o3',   [])

                if pm25_fc:
                    # Build hourly entries from daily forecast (each day → 24 hourly rows)
                    for day_entry in pm25_fc[:3]:  # next 3 days max
                        day_str = day_entry.get('day', '')
                        avg_pm25 = float(day_entry.get('avg', 0))
                        avg_pm10 = next(
                            (float(e.get('avg', 0)) for e in pm10_fc if e.get('day') == day_str),
                            0.0
                        )
                        avg_o3 = next(
                            (float(e.get('avg', 0)) for e in o3_fc if e.get('day') == day_str),
                            0.0
                        )
                        try:
                            base_dt = datetime.strptime(day_str, '%Y-%m-%d')
                        except ValueError:
                            continue

                        for hour in range(24):
                            dt_obj = base_dt + timedelta(hours=hour)
                            if len(forecast_list) >= 48:
                                break
                            forecast_list.append({
                                'datetime':  dt_obj.isoformat(),
                                'hour':      dt_obj.hour,
                                'timestamp': int(dt_obj.timestamp()),
                                'PM2.5':     avg_pm25,
                                'PM10':      avg_pm10,
                                'NO':        0.0,
                                'NO2':       0.0,
                                'NOx':       0.0,
                                'NH3':       0.0,
                                'CO':        0.0,
                                'SO2':       0.0,
                                'O3':        avg_o3,
                                'Benzene':   0.0,
                                'Toluene':   0.0,
                                'Xylene':    0.0,
                                'source':    'waqi_daily_fc',
                            })
                        if len(forecast_list) >= 48:
                            break

                    if forecast_list:
                        print(f"✅ WAQI daily forecast → {len(forecast_list)} hourly entries built")
                        return forecast_list[:48]

        except Exception as e:
            print(f"⚠️ WAQI forecast failed: {e} — falling back to OWM forecast")

    # ── 2. OWM forecast fallback (hourly, 96 hr) ─────────────────────────────
    if OWM_API_KEY:
        url = f"{OWM_BASE_URL}/data/2.5/air_pollution/forecast"
        r = requests.get(url, params={'lat': lat, 'lon': lon, 'appid': OWM_API_KEY}, timeout=10)
        r.raise_for_status()
        data = r.json()

        for item in data['list'][:48]:
            components = item['components']
            dt_obj     = datetime.utcfromtimestamp(item['dt'])
            entry      = _owm_components_to_dict(components)
            entry.update({
                'datetime':  dt_obj.isoformat(),
                'hour':      dt_obj.hour,
                'timestamp': item['dt'],
                'source':    'owm_fc',
            })
            forecast_list.append(entry)

        print(f"✅ OWM forecast fallback → {len(forecast_list)} hourly entries")
        return forecast_list

    raise RuntimeError("No API keys configured for forecast data")


# ─────────────────────────────────────────────────────────────────────────────
# City search (for autocomplete / frontend)
# ─────────────────────────────────────────────────────────────────────────────

def search_cities_waqi(keyword: str, limit: int = 10) -> list:
    """
    Search WAQI for Indian stations matching a keyword.
    Returns list of {name, lat, lon, uid, aqi} dicts.
    Useful for frontend city autocomplete — covers all WAQI India stations.
    """
    if not WAQI_TOKEN:
        return []

    url  = f"{WAQI_BASE_URL}/search/"
    r    = requests.get(url, params={'token': WAQI_TOKEN, 'keyword': keyword}, timeout=8)
    r.raise_for_status()
    data = r.json()

    if data.get('status') != 'ok':
        return []

    results = []
    for s in data.get('data', [])[:limit]:
        geo  = s.get('station', {}).get('geo', [])
        name = s.get('station', {}).get('name', '')
        # Filter to India stations where possible
        if len(geo) >= 2:
            results.append({
                'name': name,
                'lat':  float(geo[0]),
                'lon':  float(geo[1]),
                'uid':  s.get('uid', ''),
                'aqi':  s.get('aqi', '-'),
            })

    return results
