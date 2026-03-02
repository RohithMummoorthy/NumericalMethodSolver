"""
API Routes — Numerical Methods Endpoints
"""

import base64
import io
import traceback

from flask import Blueprint, jsonify, request

from ..services.newton_raphson import NewtonRaphsonService
from ..services.lagrange import LagrangeService
from ..services.runge_kutta import RungeKuttaService
from ..pdf_generator import PDFGenerator

api_bp = Blueprint("api", __name__)


def _json_error(message: str, status: int = 400):
    return jsonify({"success": False, "error": message}), status


# ── Newton-Raphson ─────────────────────────────────────────────────────────────

@api_bp.route("/newton-raphson", methods=["POST"])
def newton_raphson():
    """
    Solve f(x) = 0 using Newton-Raphson method.
    Body JSON:
        function   : str  — e.g. "x**3 - x - 2"
        x0         : float — initial guess
        tolerance  : float — convergence tolerance (optional, default 1e-7)
        max_iter   : int   — max iterations (optional, default 100)
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return _json_error("No JSON body provided.")

        func_str = data.get("function", "").strip()
        if not func_str:
            return _json_error("'function' field is required.")

        x0 = float(data.get("x0", 0))
        tol = float(data.get("tolerance", 1e-7))
        max_iter = int(data.get("max_iter", 100))

        service = NewtonRaphsonService()
        result = service.solve(func_str, x0, tol, max_iter)
        return jsonify({"success": True, "data": result})

    except ValueError as e:
        return _json_error(f"Invalid input: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"Internal error: {str(e)}", 500)


# ── Lagrange Interpolation ─────────────────────────────────────────────────────

@api_bp.route("/lagrange", methods=["POST"])
def lagrange():
    """
    Compute Lagrange interpolation.
    Body JSON:
        x_points   : list[float] — known x values
        y_points   : list[float] — known y values
        x_target   : float       — x value to interpolate at
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return _json_error("No JSON body provided.")

        x_points = [float(v) for v in data.get("x_points", [])]
        y_points = [float(v) for v in data.get("y_points", [])]
        x_target = float(data.get("x_target", 0))

        if len(x_points) < 2:
            return _json_error("At least 2 data points are required.")
        if len(x_points) != len(y_points):
            return _json_error("x_points and y_points must have equal length.")

        service = LagrangeService()
        result = service.interpolate(x_points, y_points, x_target)
        return jsonify({"success": True, "data": result})

    except ValueError as e:
        return _json_error(f"Invalid input: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"Internal error: {str(e)}", 500)


# ── Runge-Kutta 4th Order ──────────────────────────────────────────────────────

@api_bp.route("/runge-kutta", methods=["POST"])
def runge_kutta():
    """
    Solve dy/dx = f(x, y) using RK4.
    Body JSON:
        function   : str   — e.g. "x + y"  (uses variables x and y)
        x0         : float — initial x
        y0         : float — initial y
        x_end      : float — end x
        h          : float — step size
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return _json_error("No JSON body provided.")

        func_str = data.get("function", "").strip()
        if not func_str:
            return _json_error("'function' field is required.")

        x0 = float(data.get("x0", 0))
        y0 = float(data.get("y0", 1))
        x_end = float(data.get("x_end", 1))
        h = float(data.get("h", 0.1))

        if h <= 0:
            return _json_error("Step size h must be positive.")
        if x_end <= x0:
            return _json_error("x_end must be greater than x0.")

        service = RungeKuttaService()
        result = service.solve(func_str, x0, y0, x_end, h)
        return jsonify({"success": True, "data": result})

    except ValueError as e:
        return _json_error(f"Invalid input: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"Internal error: {str(e)}", 500)


# ── PDF Export ─────────────────────────────────────────────────────────────────

@api_bp.route("/export-pdf", methods=["POST"])
def export_pdf():
    """
    Generate a themed PDF report for any method.
    Body JSON:
        method     : str  — "newton_raphson" | "lagrange" | "runge_kutta"
        data       : dict — result data from the solver endpoint
        graph_image: str  — base64-encoded PNG of the graph (optional)
    """
    try:
        body = request.get_json(force=True)
        if not body:
            return _json_error("No JSON body provided.")

        method = body.get("method", "")
        result_data = body.get("data", {})
        graph_b64 = body.get("graph_image", None)

        if method not in ("newton_raphson", "lagrange", "runge_kutta"):
            return _json_error("Invalid method. Choose newton_raphson, lagrange, or runge_kutta.")

        generator = PDFGenerator()
        pdf_bytes = generator.generate(method, result_data, graph_b64)

        # Encode PDF as base64 to send over JSON
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
        return jsonify({"success": True, "pdf": pdf_b64})

    except Exception as e:
        traceback.print_exc()
        return _json_error(f"PDF generation failed: {str(e)}", 500)
