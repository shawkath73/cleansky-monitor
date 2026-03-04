import requests
import os
from datetime import datetime

API_KEY = os.getenv('OPENWEATHER_API_KEY')
BASE_URL = 'https://api.openweathermap.org'


def get_current_pollution(lat: float, lon: float) -> dict:
    """
    Fetch current air pollution data from OpenWeatherMap.
    Returns pollutant concentrations in µg/m³.
    """
    url = f"{BASE_URL}/data/2.5/air_pollution"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    components = data['list'][0]['components']
    dt = data['list'][0]['dt']

    return {
    'datetime': datetime.utcfromtimestamp(dt).isoformat(),
    'lat': lat,
    'lon': lon,
    'PM2.5':   components.get('pm2_5', 0),
    'PM10':    components.get('pm10', 0),
    'NO':      components.get('no', 0),
    'NO2':     components.get('no2', 0),
    'NOx':     components.get('no2', 0),
    'NH3':     components.get('nh3', 0),
    'CO':      components.get('co', 0),   # ← REMOVE the /1000 division
    'SO2':     components.get('so2', 0),
    'O3':      components.get('o3', 0),
    'Benzene': 0,
    'Toluene': 0,
    'Xylene':  0,
    'owm_aqi_index': data['list'][0]['main']['aqi']
}


def get_forecast_pollution(lat: float, lon: float) -> list:
    """
    Fetch 96-hour air pollution forecast from OpenWeatherMap.
    Returns list of hourly pollutant readings.
    """
    url = f"{BASE_URL}/data/2.5/air_pollution/forecast"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    forecast_list = []
    for item in data['list'][:48]:  # Take first 48 hours
        components = item['components']
        dt = item['dt']
        dt_obj = datetime.utcfromtimestamp(dt)

        forecast_list.append({
            'datetime':  dt_obj.isoformat(),
            'hour':      dt_obj.hour,
            'timestamp': dt,
            'PM2.5':     components.get('pm2_5', 0),
            'PM10':      components.get('pm10', 0),
            'NO':        components.get('no', 0),
            'NO2':       components.get('no2', 0),
            'NOx':       components.get('no2', 0),
            'NH3':       components.get('nh3', 0),
           'CO': components.get('co', 0),
            'SO2':       components.get('so2', 0),
            'O3':        components.get('o3', 0),
            'Benzene':   0,
            'Toluene':   0,
            'Xylene':    0,
        })

    return forecast_list


def get_city_coordinates(city: str) -> dict:
    """
    Convert city name to lat/lon using OpenWeatherMap Geocoding API.
    """
    url = f"{BASE_URL}/geo/1.0/direct"
    params = {
        'q': f"{city},IN",   # IN = India
        'limit': 1,
        'appid': API_KEY
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    if not data:
        raise ValueError(f"City '{city}' not found")

    return {
        'city': city,
        'lat':  data[0]['lat'],
        'lon':  data[0]['lon'],
        'country': data[0].get('country', 'IN')
    }
