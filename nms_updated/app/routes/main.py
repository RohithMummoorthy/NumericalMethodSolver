"""
Main Routes — Serves the frontend SPA
"""

from flask import Blueprint, render_template

main_bp = Blueprint("main", __name__)


@main_bp.route("/", methods=["GET"])
def index():
    """Serve the main single-page application."""
    return render_template("index.html")
