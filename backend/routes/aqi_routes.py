from flask import Blueprint, request, jsonify
from services.weather import get_current_pollution, get_forecast_pollution, get_city_coordinates
from services.prediction import predict_aqi, predict_forecast
import json
import os

aqi_bp = Blueprint('aqi', __name__)

# Load metadata for static responses
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(BASE_DIR, 'models', 'model_metadata.json')) as f:
    metadata = json.load(f)


# ─────────────────────────────────────────
# GET /api/current-aqi?city=Delhi
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

        # Fetch live pollution data
        pollution_data = get_current_pollution(lat, lon)

        # Run ML prediction
        result = predict_aqi(pollution_data, city)

        return jsonify({
            'success': True,
            'data': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


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

        # Get coordinates
        if lat and lon:
            lat, lon = float(lat), float(lon)
        else:
            coords = get_city_coordinates(city)
            lat, lon = coords['lat'], coords['lon']

        # Fetch 48hr forecast pollution data
        forecast_data = get_forecast_pollution(lat, lon)

        # Run predictions for each hour
        predictions = predict_forecast(forecast_data, city)

        # Summary stats
        aqi_values = [p['aqi'] for p in predictions]
        summary = {
            'min_aqi':  min(aqi_values) if aqi_values else 0,
            'max_aqi':  max(aqi_values) if aqi_values else 0,
            'avg_aqi':  round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0,
            'hours':    len(predictions)
        }

        return jsonify({
            'success':     True,
            'city':        city,
            'summary':     summary,
            'forecast':    predictions
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ─────────────────────────────────────────
# GET /api/health-risk?aqi=156
# Returns health risk info for an AQI value
# ─────────────────────────────────────────
@aqi_bp.route('/health-risk', methods=['GET'])
def health_risk():
    try:
        aqi = float(request.args.get('aqi', 0))

        # Determine category
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

        cat_info = metadata['aqi_categories'].get(category, {})
        recommendation = metadata['health_recommendations'].get(category, '')

        # Sensitive groups affected
        sensitive_groups = {
            'Good':         [],
            'Satisfactory': ['People with respiratory issues'],
            'Moderate':     ['Children', 'Elderly', 'People with heart/lung disease'],
            'Poor':         ['Children', 'Elderly', 'Pregnant women', 'Outdoor workers'],
            'Very Poor':    ['Everyone'],
            'Severe':       ['Everyone — Emergency conditions']
        }

        # Suggested actions
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
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


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

        # Get coordinates
        if lat and lon:
            lat, lon = float(lat), float(lon)
        else:
            coords = get_city_coordinates(city)
            lat, lon = coords['lat'], coords['lon']

        # Fetch live pollution data
        pollution_data = get_current_pollution(lat, lon)
        result = predict_aqi(pollution_data, city)

        # Pollutant safe limits (WHO standards µg/m³)
        who_limits = {
            'PM2.5': 15,
            'PM10':  45,
            'NO2':   25,
            'SO2':   40,
            'O3':    100,
            'CO':    4,
            'NO':    200,
            'NOx':   200,
            'NH3':   200,
            'Benzene': 1.7,
            'Toluene': 260,
            'Xylene':  870
        }

        # Build detailed pollutant response
        pollutant_details = []
        for pollutant, value in result['pollutants'].items():
            if value > 0:
                limit = who_limits.get(pollutant, 100)
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

        # Sort by contribution percentage
        pollutant_details.sort(key=lambda x: x['percentage'], reverse=True)

        return jsonify({
            'success':            True,
            'city':               city,
            'current_aqi':        result['aqi'],
            'dominant_pollutant': result['dominant_pollutant'],
            'pollutants':         pollutant_details
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ─────────────────────────────────────────
# GET /api/cities
# Returns list of supported Indian cities
# ─────────────────────────────────────────
@aqi_bp.route('/cities', methods=['GET'])
def cities():
    supported_cities = metadata.get('cities', [
        'Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bangalore',
        'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow',
        'Kanpur', 'Nagpur', 'Patna', 'Indore', 'Bhopal'
    ])
    return jsonify({
        'success': True,
        'cities':  supported_cities
    }), 200

@aqi_bp.route('/debug', methods=['GET'])
def debug():
    """Temporary debug endpoint to inspect raw values"""
    city = request.args.get('city', 'Delhi')
    coords = get_city_coordinates(city)
    pollution_data = get_current_pollution(coords['lat'], coords['lon'])
    return jsonify({
        'raw_pollution': pollution_data,
        'feature_cols':  metadata.get('feature_cols', [])
    })