"""
Application Configuration
"""

import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "numerical-solver-secret-2024")
    DEBUG = False
    TESTING = False
    MAX_ITERATIONS = 1000
    TOLERANCE = 1e-10


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
