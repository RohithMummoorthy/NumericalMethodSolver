"""
Numerical Methods Solver — Flask Application Factory
"""

from flask import Flask

from .config import config


def create_app(config_name: str = "default") -> Flask:
    """
    Application factory pattern.
    Creates and configures the Flask application.
    """
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(config[config_name])

    # Enable CORS for all routes (optional dependency)
    try:
        from flask_cors import CORS
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    except ImportError:
        # Add basic CORS headers manually if flask_cors not installed
        @app.after_request
        def add_cors_headers(response):
            response.headers["Access-Control-Allow-Origin"]  = "*"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            return response

    # Register blueprints
    from .routes.main import main_bp
    from .routes.api import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    return app
