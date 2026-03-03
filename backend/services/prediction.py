import joblib
import pandas as pd
import json
import os
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


def engineer_features(pollution_data: dict, city: str = 'Delhi') -> pd.DataFrame:
    """
    Engineer the exact same features as Colab training.
    This is the critical step — features must match training exactly!
    """
    now = datetime.utcnow()

    # Base pollutant values
    features = {}
    for col in pollutant_cols:
        features[col] = float(pollution_data.get(col, 0))

    # Datetime features
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


def predict_aqi(pollution_data: dict, city: str = 'Delhi') -> dict:
    """
    Main prediction function called by Flask routes.
    Takes live pollution data → returns predicted AQI + insights.
    """
    input_df, dominant_pollutant = engineer_features(pollution_data, city)

    # Run XGBoost prediction
    predicted_aqi = float(model.predict(input_df)[0])
    predicted_aqi = max(0, round(predicted_aqi, 1))  # no negative AQI

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
            # Override month/season with forecast datetime
            forecast_dt = datetime.fromisoformat(item['datetime'])
            item['month']  = forecast_dt.month
            item['season'] = get_season(forecast_dt.month)

            input_df, dominant = engineer_features(item, city)
            predicted_aqi = float(model.predict(input_df)[0])
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
        except Exception:
            continue

    return predictions
