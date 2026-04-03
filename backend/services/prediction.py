import os
import json
import joblib
import pandas as pd
from datetime import datetime

# ---- Load model files on startup ----
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR  = os.path.join(BASE_DIR, 'models')

print("🔄 Loading ML model...")
model           = joblib.load(os.path.join(MODELS_DIR, 'aqi_model.pkl'))
le_city         = joblib.load(os.path.join(MODELS_DIR, 'le_city.pkl'))
pollutant_cols  = joblib.load(os.path.join(MODELS_DIR, 'pollutant_cols.pkl'))

with open(os.path.join(MODELS_DIR, 'model_metadata.json')) as f:
    metadata = json.load(f)

feature_cols = metadata['feature_cols']
print(f"✅ Model loaded! Features: {len(feature_cols)}")


def get_season(month: int) -> int:
    """India-specific season encoding matching Colab training."""
    if month in [12, 1, 2]:
        return 0  # Winter
    elif month in [3, 4, 5]:
        return 1  # Summer
    elif month in [6, 7, 8, 9]:
        return 2  # Monsoon
    else:
        return 3  # Post-monsoon


def engineer_features(pollution_data: dict, city: str = 'Delhi', dt: datetime = None) -> tuple:
    """
    Engineer the exact same features as Colab training.
    This is the critical step — features must match training exactly!
    """
    # ✅ Use provided datetime OR fall back to now
    now = dt if dt else datetime.utcnow()

    # Base pollutant values
    features = {}
    for col in pollutant_cols:
        features[col] = float(pollution_data.get(col, 0))

    # Datetime features — now uses correct forecast time
    features['month']       = now.month
    features['day_of_week'] = now.weekday()
    features['year']        = now.year
    features['quarter']     = (now.month - 1) // 3 + 1
    features['season']      = get_season(now.month)
    features['is_weekend']  = 1 if now.weekday() >= 5 else 0

    # City encoding
    if city in le_city.classes_:
        features['city_encoded'] = int(le_city.transform([city])[0])
    else:
        features['city_encoded'] = 0  # default if city not in training data

    # Derived pollutant features
    total = sum(features.get(p, 0) for p in pollutant_cols)
    features['total_pollution'] = total

    for p in pollutant_cols:
        features[f'{p}_ratio'] = features.get(p, 0) / (total + 1e-9)

    # PM features
    features['pm_total'] = features.get('PM2.5', 0) + features.get('PM10', 0)
    features['pm_ratio'] = features['pm_total'] / (total + 1e-9)

    # Dominant pollutant
    dominant = max(pollutant_cols, key=lambda p: features.get(p, 0))
    features['dominant_encoded'] = pollutant_cols.index(dominant)

    # Build DataFrame with exact feature order from training
    input_df = pd.DataFrame([features])

    # Add missing columns with 0
    for col in feature_cols:
        if col not in input_df.columns:
            input_df[col] = 0

    return input_df[feature_cols].fillna(0), dominant


def get_aqi_category(aqi: float) -> dict:
    """Map AQI value to category using India standard."""
    categories = metadata.get('aqi_categories', {})

    if aqi <= 50:
        key = 'Good'
    elif aqi <= 100:
        key = 'Satisfactory'
    elif aqi <= 200:
        key = 'Moderate'
    elif aqi <= 300:
        key = 'Poor'
    elif aqi <= 400:
        key = 'Very Poor'
    else:
        key = 'Severe'

    cat_data = categories.get(key, {})
    return {
        'label':       key,
        'color':       cat_data.get('color', '#gray'),
        'emoji':       cat_data.get('emoji', '⚪'),
        'range':       cat_data.get('range', ''),
        'recommendation': metadata.get('health_recommendations', {}).get(key, '')
    }


def pm25_to_aqi(pm25):
    """Convert PM2.5 to AQI using EPA breakpoints."""
    breakpoints = [
        (0.0,   12.0,  0,   50),
        (12.1,  35.4,  51,  100),
        (35.5,  55.4,  101, 150),
        (55.5,  150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500)
    ]
    for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
        if bp_lo <= pm25 <= bp_hi:
            return ((aqi_hi - aqi_lo) / (bp_hi - bp_lo)) * (pm25 - bp_lo) + aqi_lo
    return 500 if pm25 > 500 else 0


def pm10_to_aqi(pm10):
    """Convert PM10 to AQI using EPA breakpoints."""
    breakpoints = [
        (0,   54,  0,   50),
        (55,  154, 51,  100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 504, 301, 400),
        (505, 604, 401, 500)
    ]
    for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
        if bp_lo <= pm10 <= bp_hi:
            return ((aqi_hi - aqi_lo) / (bp_hi - bp_lo)) * (pm10 - bp_lo) + aqi_lo
    return 500 if pm10 > 604 else 0


def no2_to_aqi(no2):
    """Convert NO2 to AQI using EPA breakpoints."""
    breakpoints = [
        (0,    53,   0,   50),
        (54,   100,  51,  100),
        (101,  360,  101, 150),
        (361,  649,  151, 200),
        (650,  1249, 201, 300),
        (1250, 1649, 301, 400),
        (1650, 2049, 401, 500)
    ]
    for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
        if bp_lo <= no2 <= bp_hi:
            return ((aqi_hi - aqi_lo) / (bp_hi - bp_lo)) * (no2 - bp_lo) + aqi_lo
    return 500 if no2 > 2049 else 0


def predict_aqi(pollution_data: dict, city: str = 'Delhi') -> dict:
    """
    Main prediction function called by Flask routes.
    Takes live pollution data → returns predicted AQI + insights.
    """
    input_df, dominant_pollutant = engineer_features(pollution_data, city)

    # XGBoost prediction
    ml_aqi = float(model.predict(input_df)[0])

    # EPA formula as ground truth
    pm25  = float(pollution_data.get('PM2.5', 0))
    pm10  = float(pollution_data.get('PM10',  0))
    no2   = float(pollution_data.get('NO2',   0))
    epa_aqi = max(pm25_to_aqi(pm25), pm10_to_aqi(pm10), no2_to_aqi(no2))

    # Use whichever is higher — EPA and WAQI are reliable fallbacks
    try:
        waqi_val = pollution_data.get('waqi_aqi', 0)
        waqi_aqi = float(waqi_val) if waqi_val not in ['-', ''] else 0.0
    except (ValueError, TypeError):
        waqi_aqi = 0.0
        
    predicted_aqi = max(ml_aqi, epa_aqi, waqi_aqi)
    predicted_aqi = max(0, round(predicted_aqi, 1))

    print(f"🔍 Debug → ML: {ml_aqi:.1f} | EPA: {epa_aqi:.1f} | WAQI: {waqi_aqi:.1f} | Final: {predicted_aqi}")

    category = get_aqi_category(predicted_aqi)

    # Pollutant breakdown for dashboard chart
    pollutant_values = {p: round(float(pollution_data.get(p, 0)), 2) for p in pollutant_cols}
    total = sum(pollutant_values.values())
    pollutant_percentages = {
        p: round((v / (total + 1e-9)) * 100, 1)
        for p, v in pollutant_values.items()
        if v > 0
    }

    return {
        'aqi':                 predicted_aqi,
        'category':            category['label'],
        'color':               category['color'],
        'emoji':               category['emoji'],
        'recommendation':      category['recommendation'],
        'dominant_pollutant':  dominant_pollutant,
        'pollutants':          pollutant_values,
        'pollutant_percentages': pollutant_percentages,
        'city':                city,
        'datetime':            pollution_data.get('datetime', datetime.utcnow().isoformat())
    }


def predict_forecast(forecast_list: list, city: str = 'Delhi') -> list:
    """
    Run predictions for each hour in forecast list.
    Returns array of 48 hourly AQI predictions.
    """
    predictions = []

    for item in forecast_list:
        try:
            # ✅ Parse forecast datetime
            forecast_dt = datetime.fromisoformat(item['datetime'])

            # ✅ Pass forecast_dt so features use correct time
            input_df, dominant = engineer_features(item, city, dt=forecast_dt)
            
            # XGBoost prediction
            ml_aqi = float(model.predict(input_df)[0])
            
            # EPA formula as ground truth
            pm25 = float(item.get('PM2.5', 0))
            pm10 = float(item.get('PM10', 0))
            no2 = float(item.get('NO2', 0))
            epa_aqi = max(pm25_to_aqi(pm25), pm10_to_aqi(pm10), no2_to_aqi(no2))
            
            # Use whichever is higher
            predicted_aqi = max(ml_aqi, epa_aqi)
            predicted_aqi = max(0, round(predicted_aqi, 1))
            
            category = get_aqi_category(predicted_aqi)

            predictions.append({
                'datetime':   item['datetime'],
                'hour':       forecast_dt.hour,
                'aqi':        predicted_aqi,
                'category':   category['label'],
                'color':      category['color'],
                'emoji':      category['emoji'],
                'dominant':   dominant
            })
        except Exception as e:
            print(f"⚠️  Forecast error for {item.get('datetime', 'unknown')}: {e}")
            continue

    return predictions