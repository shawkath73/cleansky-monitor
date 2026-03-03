from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)

    # Allow Next.js frontend to call Flask APIs
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
        }
    })

    # Register routes
    from routes.aqi_routes import aqi_bp
    app.register_blueprint(aqi_bp, url_prefix='/api')

    @app.route('/')
    def health_check():
        return {
            "status": "running",
            "message": "AQI Forecasting API is live!",
            "endpoints": [
                "/api/current-aqi",
                "/api/forecast",
                "/api/health-risk",
                "/api/pollutants"
            ]
        }

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)
