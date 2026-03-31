from flask import Blueprint, request, jsonify
from services.weather import (
    get_current_pollution,
    get_forecast_pollution,
    get_city_coordinates,
    search_cities_waqi,          # ← new
)
from services.prediction import predict_aqi, predict_forecast
from services.database import save_aqi_reading, save_forecast
import json
import os

aqi_bp = Blueprint('aqi', __name__)

# Load metadata for static responses
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(BASE_DIR, 'models', 'model_metadata.json')) as f:
    metadata = json.load(f)

# Load Indian cities database (lat/lon + state)
with open(os.path.join(BASE_DIR, 'data', 'indian_cities.json')) as f:
    INDIAN_CITIES = json.load(f)


# ─────────────────────────────────────────
# GET /api/current-aqi?city=Delhi
# GET /api/current-aqi?lat=28.6&lon=77.2
# Returns live AQI prediction for a city
# ─────────────────────────────────────────
@aqi_bp.route('/current-aqi', methods=['GET'])
def current_aqi():
    try:
        city = request.args.get('city', 'Delhi')
        lat  = request.args.get('lat', None)
        lon  = request.args.get('lon', None)

        # Get coordinates
        if lat and lon:
            lat, lon = float(lat), float(lon)
        else:
            coords = get_city_coordinates(city)
            lat, lon = coords['lat'], coords['lon']

        # Fetch live pollution data (WAQI primary, OWM fallback)
        pollution_data = get_current_pollution(lat, lon)

        # Run ML prediction
        result = predict_aqi(pollution_data, city)

        # Attach data source + station info for frontend transparency
        result['data_source']   = pollution_data.get('source', 'unknown')
        result['station_name']  = pollution_data.get('station_name', city)
        result['waqi_aqi']      = pollution_data.get('waqi_aqi', None)  # WAQI's own AQI

        # Persist AQI reading (non-fatal if DB write fails)
        reading_id = None
        try:
            reading_id = save_aqi_reading(city, pollution_data, result['aqi'])
        except Exception as e:
            print(f"⚠️ AQI save failed: {e}")

        return jsonify({
            'success':    True,
            'data':       result,
            'reading_id': reading_id
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────
# GET /api/forecast?city=Delhi
# Returns 48-hour AQI forecast
# ─────────────────────────────────────────
@aqi_bp.route('/forecast', methods=['GET'])
def forecast():
    try:
        city = request.args.get('city', 'Delhi')
        lat  = request.args.get('lat', None)
        lon  = request.args.get('lon', None)

        if lat and lon:
            lat, lon = float(lat), float(lon)
        else:
            coords = get_city_coordinates(city)
            lat, lon = coords['lat'], coords['lon']

        forecast_data = get_forecast_pollution(lat, lon)
        predictions   = predict_forecast(forecast_data, city)

        aqi_values = [p['aqi'] for p in predictions]
        summary = {
            'min_aqi': min(aqi_values) if aqi_values else 0,
            'max_aqi': max(aqi_values) if aqi_values else 0,
            'avg_aqi': round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0,
            'hours':   len(predictions)
        }

        # Tag forecast source
        fc_source = forecast_data[0].get('source', 'unknown') if forecast_data else 'unknown'

        forecast_id = None
        try:
            forecast_id = save_forecast(city, predictions, summary)
        except Exception as e:
            print(f"⚠️ Forecast save failed: {e}")

        return jsonify({
            'success':     True,
            'city':        city,
            'data_source': fc_source,
            'summary':     summary,
            'forecast':    predictions,
            'forecast_id': forecast_id
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────
# GET /api/health-risk?aqi=156
# Returns health risk info for an AQI value
# ─────────────────────────────────────────
@aqi_bp.route('/health-risk', methods=['GET'])
def health_risk():
    try:
        aqi = float(request.args.get('aqi', 0))

        if aqi <= 50:
            category = 'Good'
        elif aqi <= 100:
            category = 'Satisfactory'
        elif aqi <= 200:
            category = 'Moderate'
        elif aqi <= 300:
            category = 'Poor'
        elif aqi <= 400:
            category = 'Very Poor'
        else:
            category = 'Severe'

        cat_info       = metadata['aqi_categories'].get(category, {})
        recommendation = metadata['health_recommendations'].get(category, '')

        sensitive_groups = {
            'Good':         [],
            'Satisfactory': ['People with respiratory issues'],
            'Moderate':     ['Children', 'Elderly', 'People with heart/lung disease'],
            'Poor':         ['Children', 'Elderly', 'Pregnant women', 'Outdoor workers'],
            'Very Poor':    ['Everyone'],
            'Severe':       ['Everyone — Emergency conditions']
        }

        actions = {
            'Good':         ['Enjoy outdoor activities', 'Open windows for fresh air'],
            'Satisfactory': ['Sensitive people reduce outdoor exertion', 'Monitor symptoms'],
            'Moderate':     ['Limit prolonged outdoor exertion', 'Wear mask if sensitive'],
            'Poor':         ['Avoid outdoor activities', 'Wear N95 mask outdoors', 'Keep windows closed'],
            'Very Poor':    ['Stay indoors', 'Use air purifier', 'Wear N95 mask if going out', 'Seek medical help if symptoms appear'],
            'Severe':       ['Do not go outside', 'Seal windows and doors', 'Use air purifier', 'Call doctor if breathing issues']
        }

        return jsonify({
            'success': True,
            'data': {
                'aqi':              aqi,
                'category':         category,
                'color':            cat_info.get('color', '#gray'),
                'emoji':            cat_info.get('emoji', '⚪'),
                'range':            cat_info.get('range', ''),
                'recommendation':   recommendation,
                'sensitive_groups': sensitive_groups.get(category, []),
                'actions':          actions.get(category, [])
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────
# GET /api/pollutants?city=Delhi
# Returns pollutant breakdown for dashboard
# ─────────────────────────────────────────
@aqi_bp.route('/pollutants', methods=['GET'])
def pollutants():
    try:
        city = request.args.get('city', 'Delhi')
        lat  = request.args.get('lat', None)
        lon  = request.args.get('lon', None)

        if lat and lon:
            lat, lon = float(lat), float(lon)
        else:
            coords = get_city_coordinates(city)
            lat, lon = coords['lat'], coords['lon']

        pollution_data = get_current_pollution(lat, lon)
        result         = predict_aqi(pollution_data, city)

        # WHO safe limits (µg/m³)
        who_limits = {
            'PM2.5': 15, 'PM10': 45, 'NO2': 25, 'SO2': 40,
            'O3': 100, 'CO': 4, 'NO': 200, 'NOx': 200,
            'NH3': 200, 'Benzene': 1.7, 'Toluene': 260, 'Xylene': 870
        }

        pollutant_details = []
        for pollutant, value in result['pollutants'].items():
            if value > 0:
                limit  = who_limits.get(pollutant, 100)
                status = 'safe' if value <= limit else 'exceeded'
                pollutant_details.append({
                    'name':        pollutant,
                    'value':       value,
                    'unit':        'µg/m³',
                    'who_limit':   limit,
                    'percentage':  result['pollutant_percentages'].get(pollutant, 0),
                    'status':      status,
                    'exceeded_by': round(max(0, value - limit), 2)
                })

        pollutant_details.sort(key=lambda x: x['percentage'], reverse=True)

        return jsonify({
            'success':            True,
            'city':               city,
            'data_source':        pollution_data.get('source', 'unknown'),
            'station_name':       pollution_data.get('station_name', city),
            'current_aqi':        result['aqi'],
            'dominant_pollutant': result['dominant_pollutant'],
            'pollutants':         pollutant_details
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────
# GET /api/cities
# GET /api/cities?state=Kerala
# Returns all Indian cities with lat/lon
# ─────────────────────────────────────────
@aqi_bp.route('/cities', methods=['GET'])
def cities():
    state_filter = request.args.get('state', '').strip()

    if state_filter:
        filtered = [c for c in INDIAN_CITIES if c['state'].lower() == state_filter.lower()]
    else:
        filtered = INDIAN_CITIES

    return jsonify({
        'success': True,
        'count':   len(filtered),
        'cities':  filtered
    }), 200


# ─────────────────────────────────────────
# GET /api/search-cities?q=kochi
# WAQI-powered station search (all India)
# ─────────────────────────────────────────
@aqi_bp.route('/search-cities', methods=['GET'])
def search_cities():
    """
    Search Indian AQI stations by keyword via WAQI.
    Returns station name, lat/lon, and live AQI.
    Use this for frontend city autocomplete.
    """
    try:
        keyword = request.args.get('q', '').strip()
        limit   = int(request.args.get('limit', 10))

        if not keyword:
            return jsonify({'success': False, 'error': 'Query param ?q= is required'}), 400

        results = search_cities_waqi(keyword, limit=limit)

        return jsonify({
            'success': True,
            'query':   keyword,
            'count':   len(results),
            'results': results
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────
# GET /api/debug?city=Delhi
# Inspect raw pollutant values
# ─────────────────────────────────────────
@aqi_bp.route('/debug', methods=['GET'])
def debug():
    city   = request.args.get('city', 'Delhi')
    coords = get_city_coordinates(city)
    data   = get_current_pollution(coords['lat'], coords['lon'])
    return jsonify({
        'raw_pollution': data,
        'feature_cols':  metadata.get('feature_cols', []),
        'coords':        coords,
    })
