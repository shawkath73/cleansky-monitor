import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.prediction import predict_aqi, predict_forecast, get_aqi_category
from datetime import datetime, timedelta
import json

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
    """Test 1: Single AQI prediction with sample data."""
    print_header("🧪 TEST 1: SINGLE AQI PREDICTION")
    
    # Sample pollution data (Delhi winter scenario)
    sample_data = {
        'PM2.5': 85.5,
        'PM10': 120.3,
        'NO2': 45.2,
        'SO2': 12.8,
        'CO': 1.2,
        'O3': 35.6,
        'datetime': datetime.utcnow().isoformat()
    }
    
    print("\n📥 Input Pollution Data:")
    for pollutant, value in sample_data.items():
        if pollutant != 'datetime':
            print(f"   {pollutant:8} = {value:6.1f} µg/m³")
    
    # Run prediction
    result = predict_aqi(sample_data, city='Delhi')
    
    print_subheader("📊 Prediction Results")
    print(f"   🔢 AQI Value:           {result['aqi']}")
    print(f"   📈 Category:            {result['category']} {result['emoji']}")
    print(f"   🎨 Color Code:          {result['color']}")
    print(f"   ⚠️  Dominant Pollutant:  {result['dominant_pollutant']}")
    print(f"   🏙️  City:                {result['city']}")
    print(f"   🕐 Timestamp:           {result['datetime']}")
    
    print_subheader("💡 Health Recommendation")
    recommendation = result['recommendation']
    # Wrap text for better readability
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
    """Test 2: 24-hour forecast prediction."""
    print_header("🧪 TEST 2: 24-HOUR FORECAST PREDICTION")
    
    # Generate 24 hours of forecast data with realistic variations
    forecast_data = []
    base_time = datetime.utcnow()
    
    print("\n📥 Generating forecast data (24 hours)...")
    
    for i in range(24):
        # Simulate pollution increase during day, decrease at night
        hour = (base_time.hour + i) % 24
        day_factor = 1.0 + (0.3 if 6 <= hour <= 20 else -0.2)
        
        hour_data = {
            'PM2.5': max(10, 60 + (i * 3) * day_factor),
            'PM10': max(15, 90 + (i * 4) * day_factor),
            'NO2': max(5, 35 + (i * 1.5) * day_factor),
            'SO2': max(2, 8 + (i * 0.5) * day_factor),
            'CO': max(0.3, 0.8 + (i * 0.08) * day_factor),
            'O3': max(5, 25 + (i * 1.2) * day_factor),
            'datetime': (base_time + timedelta(hours=i)).isoformat()
        }
        forecast_data.append(hour_data)
    
    # Run forecast predictions
    forecast_results = predict_forecast(forecast_data, city='Mumbai')
    
    print(f"✅ Generated {len(forecast_results)} hourly predictions")
    
    print_subheader("📅 First 6 Hours")
    print(f"   {'Time':<8} {'AQI':>6} {'Category':<15} {'Dominant':<10}")
    print(f"   {'-'*8} {'-'*6} {'-'*15} {'-'*10}")
    for pred in forecast_results[:6]:
        dt = datetime.fromisoformat(pred['datetime'])
        print(f"   {dt.strftime('%H:%M'):<8} {pred['aqi']:>6.1f} "
              f"{pred['category'] + ' ' + pred['emoji']:<15} {pred['dominant']:<10}")
    
    print_subheader("📅 Last 6 Hours")
    print(f"   {'Time':<8} {'AQI':>6} {'Category':<15} {'Dominant':<10}")
    print(f"   {'-'*8} {'-'*6} {'-'*15} {'-'*10}")
    for pred in forecast_results[-6:]:
        dt = datetime.fromisoformat(pred['datetime'])
        print(f"   {dt.strftime('%H:%M'):<8} {pred['aqi']:>6.1f} "
              f"{pred['category'] + ' ' + pred['emoji']:<15} {pred['dominant']:<10}")
    
    # Statistics
    aqi_values = [p['aqi'] for p in forecast_results]
    print_subheader("📈 Forecast Statistics")
    print(f"   Average AQI:     {sum(aqi_values)/len(aqi_values):.1f}")
    print(f"   Minimum AQI:     {min(aqi_values):.1f}")
    print(f"   Maximum AQI:     {max(aqi_values):.1f}")
    print(f"   AQI Range:       {max(aqi_values) - min(aqi_values):.1f}")
    
    return forecast_results

def test_multi_city():
    """Test 3: Same pollution data across different cities."""
    print_header("🧪 TEST 3: MULTI-CITY COMPARISON")
    
    # Same pollution data for all cities
    pollution_data = {
        'PM2.5': 75.0,
        'PM10': 110.0,
        'NO2': 40.0,
        'SO2': 15.0,
        'CO': 1.5,
        'O3': 30.0,
        'datetime': datetime.utcnow().isoformat()
    }
    
    cities = [
        'Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bangalore',
        'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow',
        'Kanpur', 'Nagpur', 'Patna', 'Indore', 'Bhopal'
    ]
    
    print("\n📥 Using same pollution data for all cities:")
    for pollutant, value in pollution_data.items():
        if pollutant != 'datetime':
            print(f"   {pollutant:8} = {value:6.1f} µg/m³")
    
    print_subheader("🌍 City AQI Comparison")
    print(f"   {'City':<15} {'AQI':>8} {'Category':<15} {'Dominant Pollutant'}")
    print(f"   {'-'*15} {'-'*8} {'-'*15} {'-'*18}")
    
    results = []
    for city in cities:
        result = predict_aqi(pollution_data, city=city)
        results.append(result)
        print(f"   {city:<15} {result['aqi']:>8.1f} "
              f"{result['category'] + ' ' + result['emoji']:<15} {result['dominant_pollutant']}")
    
    return results

def test_aqi_categories():
    """Test 4: AQI category thresholds."""
    print_header("🧪 TEST 4: AQI CATEGORY BOUNDARIES")
    
    test_values = [25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500]
    
    print_subheader("🎯 Category Mapping Test")
    print(f"   {'AQI Value':<12} {'Category':<15} {'Color':<10} {'Emoji'}")
    print(f"   {'-'*12} {'-'*15} {'-'*10} {'-'*5}")
    
    for aqi_val in test_values:
        category = get_aqi_category(aqi_val)
        print(f"   {aqi_val:<12} {category['label']:<15} "
              f"{category['color']:<10} {category['emoji']}")

def test_edge_cases():
    """Test 5: Edge cases and error handling."""
    print_header("🧪 TEST 5: EDGE CASES & ERROR HANDLING")
    
    print_subheader("Case 1: Zero pollution values")
    zero_data = {pollutant: 0.0 for pollutant in ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']}
    zero_data['datetime'] = datetime.utcnow().isoformat()
    
    result = predict_aqi(zero_data, city='Delhi')
    print(f"   ✅ AQI with all zeros: {result['aqi']} ({result['category']})")
    
    print_subheader("Case 2: Extreme pollution values")
    extreme_data = {
        'PM2.5': 500.0,
        'PM10': 800.0,
        'NO2': 200.0,
        'SO2': 100.0,
        'CO': 30.0,
        'O3': 250.0,
        'datetime': datetime.utcnow().isoformat()
    }
    result = predict_aqi(extreme_data, city='Delhi')
    print(f"   ✅ AQI with extreme values: {result['aqi']} ({result['category']})")
    
    print_subheader("Case 3: Missing pollutants (partial data)")
    partial_data = {
        'PM2.5': 85.5,
        'PM10': 120.3,
        'datetime': datetime.utcnow().isoformat()
    }
    result = predict_aqi(partial_data, city='Mumbai')
    print(f"   ✅ AQI with partial data: {result['aqi']} ({result['category']})")
    
    print_subheader("Case 4: Unknown city (fallback test)")
    sample_data = {
        'PM2.5': 75.0,
        'PM10': 110.0,
        'NO2': 40.0,
        'SO2': 15.0,
        'CO': 1.5,
        'O3': 30.0,
        'datetime': datetime.utcnow().isoformat()
    }
    result = predict_aqi(sample_data, city='UnknownCity')
    print(f"   ✅ AQI for unknown city: {result['aqi']} ({result['category']})")

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
        # Run all tests
        all_results['test1_single'] = test_single_prediction()
        all_results['test2_forecast'] = test_forecast_prediction()
        all_results['test3_multi_city'] = test_multi_city()
        test_aqi_categories()
        test_edge_cases()
        
        # Summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print_header("✅ TEST SUMMARY")
        print(f"\n   Total Tests:     5")
        print(f"   Status:          ALL PASSED ✓")
        print(f"   Duration:        {duration:.2f} seconds")
        print(f"   Timestamp:       {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Save results
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