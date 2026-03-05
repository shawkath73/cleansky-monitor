import pickle
import json
from pathlib import Path

models = Path('models')
model = pickle.load(open(models/'aqi_model.pkl','rb'))
le_city = pickle.load(open(models/'le_city.pkl','rb'))
pollutant_cols = pickle.load(open(models/'pollutant_cols.pkl','rb'))
metadata = json.load(open(models/'model_metadata.json','r',encoding='utf-8'))

print('✓ All 4 model artifacts loaded')
print(f'Model: {type(model).__name__}')
print(f'City encoder: {len(le_city.classes_)} classes')
print(f'Pollutant cols: {len(pollutant_cols)}')
print(f'Has predict: {hasattr(model, "predict")}')
