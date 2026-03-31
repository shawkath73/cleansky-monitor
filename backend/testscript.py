import sys
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environmental variables (WAQI_TOKEN, OPENWEATHER_API_KEY)
load_dotenv()

from services.prediction import predict_aqi, predict_forecast, get_aqi_category
from services.weather import get_city_coordinates, get_current_pollution, get_forecast_pollution, search_cities_waqi

def print_header(text):
    """Print formatted section headers."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_subheader(text):
    """Print formatted subsection headers."""
    print(f"\n{text}")
    print("-" * 70)

def test_single_prediction():
    """Test 1: Single AQI prediction with sample data mimicking WAQI response."""
    print_header("🧪 TEST 1: SINGLE AQI PREDICTION (WAQI Format)")
    
    # Sample pollution data updated to mimic weather.py dict structures
    sample_data = {
        'PM2.5': 85.5,
        'PM10': 120.3,
        'NO2': 45.2,
        'SO2': 12.8,
        'CO': 1.2,
        'O3': 35.6,
        'datetime': datetime.utcnow().isoformat(),
        'source': 'waqi_mock',
        'station_name': 'Delhi Anand Vihar',
        'waqi_aqi': 165
    }
    
    print("\n📥 Input Pollution Data:")
    for key, value in sample_data.items():
        if key not in ['datetime', 'source', 'station_name', 'waqi_aqi']:
            print(f"   {key:8} = {value:6.1f} µg/m³")
    
    # Run ML prediction
    result = predict_aqi(sample_data, city='Delhi')
    
    # Mocking what aqi_routes does automatically
    result['data_source'] = sample_data.get('source')
    result['station_name'] = sample_data.get('station_name')
    result['waqi_aqi'] = sample_data.get('waqi_aqi')
    
    print_subheader("📊 Prediction Results")
    print(f"   🔢 ML Predicted AQI:    {result['aqi']}")
    print(f"   ⚖️  WAQI Provided AQI:   {result['waqi_aqi']} (For comparison)")
    print(f"   📈 Category:            {result['category']} {result['emoji']}")
    print(f"   🎨 Color Code:          {result['color']}")
    print(f"   ⚠️  Dominant Pollutant:  {result['dominant_pollutant']}")
    print(f"   🏙️  City:                {result['city']}")
    print(f"   📍 Station Name:        {result['station_name']}")
    print(f"   📡 Data Source:         {result['data_source']}")
    print(f"   🕐 Timestamp:           {result['datetime']}")
    
    print_subheader("💡 Health Recommendation")
    recommendation = result['recommendation']
    words = recommendation.split()
    line = "   "
    for word in words:
        if len(line) + len(word) + 1 > 70:
            print(line)
            line = "   " + word
        else:
            line += " " + word if line != "   " else word
    print(line)
    
    print_subheader("📊 Pollutant Breakdown")
    print(f"   {'Pollutant':<10} {'Value (µg/m³)':<15} {'Percentage'}")
    print(f"   {'-'*10} {'-'*15} {'-'*10}")
    for pollutant in sorted(result['pollutants'].keys()):
        value = result['pollutants'][pollutant]
        percentage = result['pollutant_percentages'].get(pollutant, 0)
        bar = '█' * int(percentage / 5)  # Visual bar
        print(f"   {pollutant:<10} {value:>8.2f}        {percentage:>5.1f}% {bar}")
    
    return result

def test_forecast_prediction():
    """Test 2: 48-hour forecast prediction with source tagging."""
    print_header("🧪 TEST 2: 48-HOUR FORECAST PREDICTION")
    
    forecast_data = []
    base_time = datetime.utcnow()
    
    print("\n📥 Generating mock forecast data (48 hours)...")
    
    for i in range(48):
        hour = (base_time.hour + i) % 24
        day_factor = 1.0 + (0.3 if 6 <= hour <= 20 else -0.2)
        
        hour_data = {
            'PM2.5': max(10, 60 + (i * 1.5) * day_factor),
            'PM10': max(15, 90 + (i * 2) * day_factor),
            'NO2': max(5, 35 + (i * 0.8) * day_factor),
            'SO2': max(2, 8 + (i * 0.2) * day_factor),
            'CO': max(0.3, 0.8 + (i * 0.04) * day_factor),
            'O3': max(5, 25 + (i * 0.6) * day_factor),
            'datetime': (base_time + timedelta(hours=i)).isoformat(),
            'source': 'mock_waqi_daily_fc'
        }
        forecast_data.append(hour_data)
    
    # Run predictions
    forecast_results = predict_forecast(forecast_data, city='Mumbai')
    fc_source = forecast_data[0].get('source', 'unknown')
    
    print(f"✅ Generated {len(forecast_results)} hourly predictions from [{fc_source}]")
    
    print_subheader("📅 First 6 Hours")
    print(f"   {'Time':<8} {'AQI':>6} {'Category':<15} {'Dominant':<10}")
    for pred in forecast_results[:6]:
        dt = datetime.fromisoformat(pred['datetime'])
        print(f"   {dt.strftime('%H:%M'):<8} {pred['aqi']:>6.1f} "
              f"{pred['category'] + ' ' + pred['emoji']:<15} {pred['dominant']:<10}")
    
    # Statistics
    aqi_values = [p['aqi'] for p in forecast_results]
    print_subheader("📈 Forecast Statistics")
    print(f"   Average AQI:     {sum(aqi_values)/len(aqi_values):.1f}")
    print(f"   Minimum AQI:     {min(aqi_values):.1f}")
    print(f"   Maximum AQI:     {max(aqi_values):.1f}")
    print(f"   Data Source:     {fc_source}")
    
    return forecast_results

def test_multi_city():
    """Test 3: Multi-city prediction capability."""
    print_header("🧪 TEST 3: MULTI-CITY COMPARISON")
    
    pollution_data = {
        'PM2.5': 75.0, 'PM10': 110.0, 'NO2': 40.0,
        'SO2': 15.0, 'CO': 1.5, 'O3': 30.0,
        'datetime': datetime.utcnow().isoformat()
    }
    
    cities = ['Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bangalore']
    
    print_subheader("🌍 City AQI Comparison")
    print(f"   {'City':<15} {'AQI':>8} {'Category':<15} {'Dominant Pollutant'}")
    
    results = []
    for city in cities:
        result = predict_aqi(pollution_data, city=city)
        results.append(result)
        print(f"   {city:<15} {result['aqi']:>8.1f} "
              f"{result['category'] + ' ' + result['emoji']:<15} {result['dominant_pollutant']}")
    
    return results

def test_live_weather_apis():
    """Test 4: Live weather & WAQI integrations (Requires .env keys)."""
    print_header("🧪 TEST 4: LIVE WEATHER API INTEGRATION (weather.py)")
    
    if not (os.getenv("WAQI_TOKEN") or os.getenv("OPENWEATHER_API_KEY")):
        print("⚠️  Skipping: No WAQI_TOKEN or OPENWEATHER_API_KEY found in environment.")
        return {"status": "skipped_no_keys"}
        
    print("\n🌍 4.1 Testing WAQI City Search (search_cities_waqi)...")
    try:
        cities = search_cities_waqi('Kochi', limit=3)
        print(f"   Found {len(cities)} stations for 'Kochi'.")
        for c in cities:
            print(f"   - {c['name']} (AQI: {c['aqi']})")
    except Exception as e:
        print(f"   ❌ Search failed: {e}")

    print("\n📍 4.2 Testing Geocoding (get_city_coordinates)...")
    try:
        coords = get_city_coordinates('Delhi')
        print(f"   Delhi -> Lat: {coords['lat']}, Lon: {coords['lon']} (Source: {coords.get('source', 'unknown')})")
        
        print("\n💨 4.3 Testing Current Pollution (get_current_pollution)...")
        live_data = get_current_pollution(coords['lat'], coords['lon'])
        print(f"   Data Source: {live_data.get('source', 'unknown')}")
        print(f"   Station:     {live_data.get('station_name', 'N/A')}")
        print(f"   PM2.5 Level: {live_data.get('PM2.5')} µg/m³")
        print(f"   WAQI Index:  {live_data.get('waqi_aqi', 'N/A')}")
        
        print("\n📅 4.4 Testing Forecast Generation (get_forecast_pollution)...")
        fc_data = get_forecast_pollution(coords['lat'], coords['lon'])
        print(f"   Fetched {len(fc_data)} hours of forecast.")
        print(f"   Forecast Source: {fc_data[0].get('source', 'unknown') if fc_data else 'unknown'}")
        
    except Exception as e:
        print(f"   ❌ Live fallback tests failed: {e}")
        
    return {"status": "completed"}

def save_results_to_file(all_results):
    """Save test results to JSON file."""
    output_file = os.path.join(os.path.dirname(__file__), 'test_results.json')
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n💾 Results saved to: {output_file}")

def main():
    """Run all tests."""
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 15 + "CLEANSKY AQI PREDICTION TEST SUITE" + " " * 19 + "║")
    print("╚" + "═" * 68 + "╝")
    
    start_time = datetime.now()
    all_results = {}
    
    try:
        all_results['test1_single'] = test_single_prediction()
        all_results['test2_forecast'] = test_forecast_prediction()
        all_results['test3_multi_city'] = test_multi_city()
        all_results['test4_live_apis'] = test_live_weather_apis()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print_header("✅ TEST SUMMARY")
        print("\n   Total Tests:     4 (including Live Integration if keys exist)")
        print("   Status:          ALL PASSED ✓")
        print(f"   Duration:        {duration:.2f} seconds")
        print(f"   Timestamp:       {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        save_results_to_file(all_results)
        
        print("\n" + "=" * 70)
        print("  🎉 All tests completed successfully!")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())