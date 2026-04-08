from flask import Blueprint, request, jsonify
from services.weather import (
    get_current_pollution,
    get_forecast_pollution,
    get_city_coordinates,
)
from services.geocoding import (
    search_city_with_station,
    get_default_cities,
)
from services.prediction import predict_aqi, predict_forecast, get_aqi_category
from services.database import save_aqi_reading, save_forecast, get_aqi_history
import json
import os
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

try:
    from deep_translator import GoogleTranslator
except Exception:
    GoogleTranslator = None

try:
    from langdetect import detect as detect_language
except Exception:
    detect_language = None

aqi_bp = Blueprint('aqi', __name__)

# Load metadata for static responses
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(BASE_DIR, 'models', 'model_metadata.json')) as f:
    metadata = json.load(f)


ALLOWED_FORECAST_BREAKDOWNS = {1, 6, 12}


def _normalize_city_text(text: str) -> dict:
    """
    Detect language and normalize a user-provided city to English.
    Always returns a safe fallback (original text) if detection/translation fails.
    """
    original = (text or '').strip()
    meta = {
        'original_text': original,
        'english_text': original,
        'detected_language': 'unknown',
        'translation_applied': False,
        'translation_failed': False,
        'translation_error': None,
    }

    if not original:
        return meta

    is_ascii = all(ord(ch) < 128 for ch in original)
    if is_ascii:
        meta['detected_language'] = 'en'
        return meta

    if detect_language is not None:
        try:
            detected = detect_language(original)
            if detected:
                meta['detected_language'] = detected
        except Exception:
            # Keep fallback as unknown when detection cannot classify input.
            pass

    if GoogleTranslator is None:
        meta['translation_failed'] = True
        meta['translation_error'] = 'translator_unavailable'
        return meta

    try:
        translated = GoogleTranslator(source='auto', target='en').translate(original)
        translated = (translated or '').strip()

        if translated:
            meta['english_text'] = translated
            meta['translation_applied'] = translated.casefold() != original.casefold()
        else:
            meta['translation_failed'] = True
            meta['translation_error'] = 'empty_translation'
    except Exception as exc:
        meta['translation_failed'] = True
        meta['translation_error'] = str(exc)

    return meta


def _normalize_search_keyword(keyword: str) -> tuple[str, str]:
    meta = _normalize_city_text(keyword)
    return meta['original_text'], meta['english_text']


def _median(values: list) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2 == 1:
        return float(ordered[mid])
    return float((ordered[mid - 1] + ordered[mid]) / 2)


def _aggregate_forecast(predictions: list, breakdown_hours: int) -> list:
    """
    Deterministic bucketing of forecast points.
    Method:
      - Group consecutive hourly points into fixed-size windows.
      - Bucket AQI = arithmetic mean of AQI values in that window.
      - Peak AQI = max AQI in that window.
      - Category/color/emoji derived from bucket AQI.
    """
    if breakdown_hours == 1:
        return predictions

    buckets = []
    for i in range(0, len(predictions), breakdown_hours):
        chunk = predictions[i:i + breakdown_hours]
        if not chunk:
            continue

        aqi_values = [float(item.get('aqi', 0) or 0) for item in chunk]
        bucket_aqi = round(sum(aqi_values) / len(aqi_values), 1)
        peak_aqi = round(max(aqi_values), 1)
        min_aqi = round(min(aqi_values), 1)
        max_aqi = round(max(aqi_values), 1)
        median_aqi = round(_median(aqi_values), 1)
        cat = get_aqi_category(bucket_aqi)

        dominant = chunk[-1].get('dominant', '')
        for item in chunk:
            dom = item.get('dominant', '')
            if dom:
                dominant = dom

        buckets.append({
            'datetime': chunk[0].get('datetime'),
            'end_datetime': chunk[-1].get('datetime'),
            'hour': chunk[0].get('hour', 0),
            'aqi': bucket_aqi,
            'peak_aqi': peak_aqi,
            'min_aqi': min_aqi,
            'max_aqi': max_aqi,
            'median_aqi': median_aqi,
            'points': len(chunk),
            'category': cat['label'],
            'color': cat['color'],
            'emoji': cat['emoji'],
            'dominant': dominant,
        })

    return buckets


def _attach_forecast_uncertainty_bounds(forecast_points: list, data_source: str) -> list:
    """
    Attach deterministic uncertainty bounds to each forecast point.
    These are UI-facing ranges (not probabilistic confidence intervals).
    """
    if not forecast_points:
        return []

    source_base_spread = {
        'waqi_daily_fc': 10,
        'owm_fc': 14,
        'unknown': 16,
    }
    base_spread = source_base_spread.get(data_source, 16)
    horizon_len = max(len(forecast_points) - 1, 1)

    enriched = []
    for i, point in enumerate(forecast_points):
        center = float(point.get('aqi', 0) or 0)
        raw_min = float(point.get('min_aqi', center) or center)
        raw_max = float(point.get('max_aqi', center) or center)
        raw_median = float(point.get('median_aqi', center) or center)

        horizon_factor = 1 + (i / horizon_len) * 0.45
        spread = base_spread * horizon_factor

        uncertainty_min = round(max(0, raw_median - spread), 1)
        uncertainty_max = round(min(500, raw_median + spread), 1)

        item = dict(point)
        item['min_aqi'] = round(raw_min, 1)
        item['max_aqi'] = round(raw_max, 1)
        item['median_aqi'] = round(raw_median, 1)
        item['uncertainty_min_aqi'] = uncertainty_min
        item['uncertainty_max_aqi'] = uncertainty_max
        enriched.append(item)

    return enriched


def _parse_history_datetime(raw_dt):
    if isinstance(raw_dt, datetime):
        dt = raw_dt
    elif isinstance(raw_dt, str) and raw_dt:
        try:
            dt = datetime.fromisoformat(raw_dt.replace('Z', '+00:00'))
        except Exception:
            return None
    else:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ─────────────────────────────────────────
# GET /api/current-aqi?city=Delhi
# GET /api/current-aqi?lat=28.6&lon=77.2
# Returns live AQI prediction for a city
# ─────────────────────────────────────────
@aqi_bp.route('/current-aqi', methods=['GET'])
def current_aqi():
    try:
        city_raw = request.args.get('city', 'Delhi')
        city_meta = _normalize_city_text(city_raw)
        city = city_meta['english_text'] or 'Delhi'
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
            'city_original': city_meta['original_text'],
            'city_english': city,
            'detected_language': city_meta['detected_language'],
            'translation_applied': city_meta['translation_applied'],
            'translation_failed': city_meta['translation_failed'],
            'translation_error': city_meta['translation_error'],
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
        city_raw = request.args.get('city', 'Delhi')
        city_meta = _normalize_city_text(city_raw)
        city = city_meta['english_text'] or 'Delhi'
        lat  = request.args.get('lat', None)
        lon  = request.args.get('lon', None)
        breakdown_hours = int(request.args.get('breakdown_hours', 1))

        if breakdown_hours not in ALLOWED_FORECAST_BREAKDOWNS:
            return jsonify({
                'success': False,
                'error': 'Invalid breakdown_hours. Allowed: 1, 6, 12'
            }), 400

        if lat and lon:
            lat, lon = float(lat), float(lon)
        else:
            coords = get_city_coordinates(city)
            lat, lon = coords['lat'], coords['lon']

        forecast_data = get_forecast_pollution(lat, lon)
        predictions   = predict_forecast(forecast_data, city)
        forecast_out  = _aggregate_forecast(predictions, breakdown_hours)

        # Tag forecast source
        fc_source = forecast_data[0].get('source', 'unknown') if forecast_data else 'unknown'
        forecast_out = _attach_forecast_uncertainty_bounds(forecast_out, fc_source)

        aqi_values = [p['aqi'] for p in forecast_out]
        summary = {
            'min_aqi': min(aqi_values) if aqi_values else 0,
            'max_aqi': max(aqi_values) if aqi_values else 0,
            'avg_aqi': round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0,
            'hours':   len(predictions),
            'breakdown_hours': breakdown_hours,
            'buckets': len(forecast_out),
        }

        forecast_id = None
        try:
            forecast_id = save_forecast(city, predictions, summary)
        except Exception as e:
            print(f"⚠️ Forecast save failed: {e}")

        return jsonify({
            'success':     True,
            'city_original': city_meta['original_text'],
            'city_english': city,
            'detected_language': city_meta['detected_language'],
            'translation_applied': city_meta['translation_applied'],
            'translation_failed': city_meta['translation_failed'],
            'translation_error': city_meta['translation_error'],
            'city':        city,
            'data_source': fc_source,
            'breakdown_hours': breakdown_hours,
            'summary':     summary,
            'forecast':    forecast_out,
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
        city_raw = request.args.get('city', 'Delhi')
        city_meta = _normalize_city_text(city_raw)
        city = city_meta['english_text'] or 'Delhi'
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
            'city_original':       city_meta['original_text'],
            'city_english':        city,
            'detected_language':   city_meta['detected_language'],
            'translation_applied': city_meta['translation_applied'],
            'translation_failed':  city_meta['translation_failed'],
            'translation_error':   city_meta['translation_error'],
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
# Returns default popular Indian cities
# ─────────────────────────────────────────
@aqi_bp.route('/cities', methods=['GET'])
def cities():
    defaults = get_default_cities()
    return jsonify({
        'success': True,
        'count':   len(defaults),
        'cities':  defaults
    }), 200


# ─────────────────────────────────────────
# GET /api/history?city=Delhi&days=30
# Returns historical AQI readings for trend and pattern charts
# ─────────────────────────────────────────
@aqi_bp.route('/history', methods=['GET'])
def history():
    try:
        city_raw = request.args.get('city', 'Delhi')
        city_meta = _normalize_city_text(city_raw)
        city = city_meta['english_text'] or 'Delhi'
        days = int(request.args.get('days', 30))
        days = max(1, min(days, 30))
        tz_name = request.args.get('tz', 'Asia/Kolkata')

        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = timezone.utc
            tz_name = 'UTC'

        docs = get_aqi_history(city, days=days)
        readings = []
        valid_points = []

        for doc in docs:
            dt = doc.get('datetime')
            parsed_dt = _parse_history_datetime(dt)
            if not parsed_dt:
                continue

            local_dt = parsed_dt.astimezone(tz)
            iso_dt = local_dt.isoformat()
            aqi_val = float(doc.get('aqi', 0) or 0)
            if aqi_val <= 0:
                continue

            readings.append({
                'datetime': iso_dt,
                'aqi': aqi_val,
                'location': doc.get('location', city),
                'source': doc.get('source', 'unknown'),
            })
            valid_points.append((local_dt, aqi_val))

        now_local = datetime.now(tz)
        cutoff_7d = now_local - timedelta(days=7)

        # Daily trend aggregation
        daily_map = {}
        for local_dt, aqi_val in valid_points:
            key = local_dt.date().isoformat()
            if key not in daily_map:
                daily_map[key] = {
                    'date': local_dt.strftime('%b %d'),
                    'ts': local_dt.timestamp(),
                    'total': 0.0,
                    'count': 0,
                    'in_last_7d': local_dt >= cutoff_7d,
                }
            daily_map[key]['total'] += aqi_val
            daily_map[key]['count'] += 1

        trend_daily = []
        for item in sorted(daily_map.values(), key=lambda x: x['ts']):
            trend_daily.append({
                'date': item['date'],
                'aqi': round(item['total'] / max(item['count'], 1), 1),
                'count': item['count'],
                'in_last_7d': item['in_last_7d'],
            })

        # Hour-of-day aggregation
        hour_totals = [{'hour': h, 'total': 0.0, 'count': 0} for h in range(24)]
        for local_dt, aqi_val in valid_points:
            hour_idx = local_dt.hour
            hour_totals[hour_idx]['total'] += aqi_val
            hour_totals[hour_idx]['count'] += 1

        hour_pattern = []
        for item in hour_totals:
            count = item['count']
            avg_aqi = round(item['total'] / count, 1) if count > 0 else 0.0
            hour_pattern.append({
                'hour': f"{item['hour']:02d}:00",
                'aqi': avg_aqi,
                'count': count,
            })

        # Weekday aggregation
        weekday_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        weekday_totals = [{'day': d, 'total': 0.0, 'count': 0} for d in weekday_names]
        for local_dt, aqi_val in valid_points:
            weekday_idx = (local_dt.weekday() + 1) % 7  # Monday=0 -> Sun=0 format
            weekday_totals[weekday_idx]['total'] += aqi_val
            weekday_totals[weekday_idx]['count'] += 1

        weekday_pattern = []
        for item in weekday_totals:
            count = item['count']
            avg_aqi = round(item['total'] / count, 1) if count > 0 else 0.0
            weekday_pattern.append({
                'day': item['day'],
                'aqi': avg_aqi,
                'count': count,
            })

        return jsonify({
            'success': True,
            'city_original': city_meta['original_text'],
            'city_english': city,
            'detected_language': city_meta['detected_language'],
            'translation_applied': city_meta['translation_applied'],
            'translation_failed': city_meta['translation_failed'],
            'translation_error': city_meta['translation_error'],
            'city': city,
            'days': days,
            'timezone': tz_name,
            'count': len(readings),
            'readings': readings,
            'trend_daily': trend_daily,
            'hour_pattern': hour_pattern,
            'weekday_pattern': weekday_pattern,
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────
# GET /api/search-cities?q=kochi
# Global city search with language normalization
# ─────────────────────────────────────────
@aqi_bp.route('/search-cities', methods=['GET'])
def search_cities():
    """
    Search global cities by keyword and normalize non-English input to English.
    Returns city name, state, lat/lon, station name, live AQI, and translation metadata.
    """
    try:
        keyword = request.args.get('q', '').strip()
        limit_param = request.args.get('limit', '').strip()
        limit = int(limit_param) if limit_param else None

        if not keyword:
            return jsonify({'success': False, 'error': 'Query param ?q= is required'}), 400

        keyword_meta = _normalize_city_text(keyword)
        original_keyword = keyword_meta['original_text']
        english_keyword = keyword_meta['english_text']

        if len(english_keyword) < 2:
            return jsonify({
                'success': True,
                'query': original_keyword,
                'normalized_query': english_keyword,
                'original_query': original_keyword,
                'translated_query': english_keyword,
                'detected_language': keyword_meta['detected_language'],
                'translation_applied': keyword_meta['translation_applied'],
                'translation_failed': keyword_meta['translation_failed'],
                'translation_error': keyword_meta['translation_error'],
                'count': 0,
                'results': []
            }), 200

        results = search_city_with_station(english_keyword, limit=limit)

        return jsonify({
            'success': True,
            'query':   original_keyword,
            'normalized_query': english_keyword,
            'original_query': original_keyword,
            'translated_query': english_keyword,
            'detected_language': keyword_meta['detected_language'],
            'translation_applied': keyword_meta['translation_applied'],
            'translation_failed': keyword_meta['translation_failed'],
            'translation_error': keyword_meta['translation_error'],
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
