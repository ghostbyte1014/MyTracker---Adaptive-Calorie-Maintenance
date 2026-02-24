"""Flask Main Application"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from .config import settings
from .routers.auth import auth_bp
from .routers.daily_logs import daily_logs_bp
from .routers.system_metrics import system_metrics_bp
from .routers.users import users_bp
from .routers.missed_days import missed_days_bp
from .routers.reports import reports_bp


def create_app():
    """Application factory"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = settings.jwt_secret
    
    # CORS
    CORS(app, resources={r"/api/*": {"origins": settings.cors_origins}})
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(daily_logs_bp, url_prefix='/api/daily-logs')
    app.register_blueprint(system_metrics_bp, url_prefix='/api/system-metrics')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(missed_days_bp, url_prefix='/api/missed-days')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    # Root endpoint
    @app.route('/')
    def root():
        return jsonify({
            "name": settings.app_name,
            "version": "1.0.0",
            "description": "Adaptive Calorie Maintenance Engine"
        })
    
    # Health check
    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy"})
    
    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
