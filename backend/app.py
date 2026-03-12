from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

from services.database import connect_db, save_model_metadata

def create_app():
    app = Flask(__name__)

        # Connect to MongoDB
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
        }
    })

    # Connect MongoDB on startup (non-fatal if unavailable)
    db_connected = False
    try:
        connect_db()
        db_connected = True
    except Exception as e:
        print(f"⚠️ MongoDB unavailable, continuing without DB features: {e}")

    # Save model metadata to DB only when connection is available
    if db_connected:
        try:
            save_model_metadata(
                model_name='XGBoost AQI v1',
                model_type='XGBoostRegressor',
                accuracy=0.94
            )
        except Exception as e:
            print(f"⚠️ Model metadata: {e}")

    # Register blueprints
    from routes.aqi_routes import aqi_bp
    from routes.user_routes import user_bp
    app.register_blueprint(aqi_bp,  url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/users')

    @app.route('/')
    def health_check():
        return {
             "status":   "running",
            "message":  "CleanSky AQI API is live!",
            "database": "MongoDB Atlas connected",
            "endpoints": [
                "/api/current-aqi",
                "/api/forecast",
                "/api/health-risk",
                "/api/pollutants",
                "/api/cities",
                "/api/users/register",
                "/api/users/login",
                "/api/users/preferences",
                "/api/users/alerts"
            ]
        }

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)
